import { Op } from 'sequelize';
import {
  AuditLog,
  Complaint,
  ComplaintCategory,
  ComplaintNotification,
  ComplaintResponse,
  Office,
  RoutingRule,
  SatisfactionRating
} from '../models/index.js';

const today = () => new Date().toISOString().slice(0, 10);
const dueDateFromDays = (days) => new Date(Date.now() + Number(days || 3) * 86400000).toISOString().slice(0, 10);
const categoryOrder = ['service-delay', 'documents', 'infrastructure', 'safety-community', 'misconduct', 'feedback'];
const officeOrder = ['service-delivery', 'responsible-service-unit', 'infrastructure-office', 'safety-desk', 'senior-administrator', 'customer-care-planning'];
const sortByCodeOrder = (items, order) => [...items].sort((a, b) => {
  const first = order.indexOf(a.code);
  const second = order.indexOf(b.code);
  return (first === -1 ? 999 : first) - (second === -1 ? 999 : second);
});

const includeComplaintRelations = [
  { model: ComplaintCategory, as: 'category' },
  { model: Office, as: 'office' },
  { model: ComplaintResponse, as: 'responses', separate: true, order: [['createdAt', 'ASC']] },
  { model: SatisfactionRating, as: 'satisfaction' }
];

const publicComplaint = (record) => {
  const item = record.toJSON ? record.toJSON() : record;
  return {
    id: `cmp-${item.id}`,
    dbId: item.id,
    trackingNumber: item.trackingNumber,
    citizenId: item.citizenId,
    citizenName: item.citizenName,
    citizenPhone: item.citizenPhone,
    categoryId: item.categoryId,
    category: item.category?.name,
    type: item.category?.name,
    description: item.description,
    location: item.location,
    cell: item.cell,
    village: item.village,
    priority: item.priority,
    status: item.status,
    assignedOfficeId: item.officeId,
    assignedOffice: item.office?.name,
    assignedTo: item.assignedTo,
    escalatedTo: item.escalatedTo,
    office: item.office,
    channel: item.channel,
    attachmentName: item.attachmentName,
    attachmentPath: item.attachmentPath,
    dueDate: item.dueDate,
    resolvedAt: item.resolvedAt,
    closedAt: item.closedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    responses: (item.responses || []).map((response) => ({
      id: `resp-${response.id}`,
      dbId: response.id,
      responder: response.responder,
      responseText: response.responseText,
      statusUpdate: response.statusUpdate,
      createdAt: response.createdAt
    })),
    satisfaction: item.satisfaction ? {
      id: `rate-${item.satisfaction.id}`,
      dbId: item.satisfaction.id,
      score: item.satisfaction.score,
      comment: item.satisfaction.comment,
      ratedAt: item.satisfaction.ratedAt
    } : null
  };
};

const publicCategory = (record) => {
  const item = record.toJSON ? record.toJSON() : record;
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    description: item.description,
    defaultPriority: item.defaultPriority,
    slaDays: item.slaDays,
    active: item.active
  };
};

const publicOffice = (record) => {
  const item = record.toJSON ? record.toJSON() : record;
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    contactPerson: item.contactPerson,
    phone: item.phone,
    email: item.email,
    active: item.active
  };
};

const publicRule = (record) => {
  const item = record.toJSON ? record.toJSON() : record;
  return {
    id: item.id,
    code: item.code,
    categoryId: item.categoryId,
    officeId: item.officeId,
    location: item.location,
    priority: item.priority,
    slaDays: item.slaDays,
    active: item.active,
    category: item.category?.name,
    office: item.office?.name
  };
};

const findCategory = async (value) => {
  const category = await ComplaintCategory.findOne({
    where: {
      active: true,
      [Op.or]: [
        { id: Number(value) || 0 },
        { code: value },
        { name: value }
      ]
    }
  });
  if (!category) {
    const error = new Error('Complaint category not found');
    error.status = 422;
    throw error;
  }
  return category;
};

const findRoutingRule = async (categoryId, location = '') => {
  const rules = await RoutingRule.findAll({
    where: { categoryId, active: true },
    include: [{ model: Office, as: 'office' }],
    order: [['id', 'ASC']]
  });
  if (!rules.length) {
    const error = new Error('No active routing rule exists for this complaint type');
    error.status = 422;
    throw error;
  }
  return rules.find((rule) => location.toLowerCase().includes(rule.location.toLowerCase())) || rules[0];
};

const routeCodeFrom = (category, location) => `route-${category.code}-${String(location || 'kacyiru')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '')}`;

const uniqueRouteCode = async (category, location) => {
  const base = routeCodeFrom(category, location);
  let code = base;
  let suffix = 2;
  while (await RoutingRule.findOne({ where: { code } })) {
    code = `${base}-${suffix}`;
    suffix += 1;
  }
  return code;
};

const nextTrackingNumber = async () => {
  const year = new Date().getFullYear();
  const latest = await Complaint.findOne({
    where: { trackingNumber: { [Op.like]: `SCF-${year}-%` } },
    order: [['trackingNumber', 'DESC']]
  });
  const next = latest ? Number(latest.trackingNumber.split('-').pop()) + 1 : 1;
  return `SCF-${year}-${String(next).padStart(4, '0')}`;
};

const logAction = async (actor, action, metadata = {}) => AuditLog.create({ actor, action, metadata });

const notifyCitizen = async (complaint, title, message) => ComplaintNotification.create({
  userId: complaint.citizenId,
  complaintId: complaint.id,
  title,
  message
});

const createResponse = async (complaint, responder, responseText, statusUpdate, responderId = null) => {
  if (!responseText?.trim()) return null;
  return ComplaintResponse.create({
    complaintId: complaint.id,
    responderId,
    responder,
    responseText: responseText.trim(),
    statusUpdate
  });
};

const loadComplaint = async (trackingNumber) => {
  const complaint = await Complaint.findOne({
    where: { trackingNumber },
    include: includeComplaintRelations
  });
  if (!complaint) {
    const error = new Error('Complaint not found');
    error.status = 404;
    throw error;
  }
  return complaint;
};

const assertOwnedByCitizen = (complaint, actor) => {
  if (actor.role === 'citizen' && complaint.citizenId !== actor.id) {
    const error = new Error('Complaint not found');
    error.status = 404;
    throw error;
  }
};

const assertVisibleToActor = (complaint, actor) => {
  assertOwnedByCitizen(complaint, actor);
  if (actor.role === 'staff' && (!actor.officeId || complaint.officeId !== actor.officeId)) {
    const error = new Error('Complaint not found');
    error.status = 404;
    throw error;
  }
};

const statusCounts = async () => {
  const rows = await Complaint.findAll({ attributes: ['status'] });
  return Object.values(rows.reduce((acc, row) => {
    const status = row.status;
    acc[status] ||= { name: status, value: 0 };
    acc[status].value += 1;
    return acc;
  }, {}));
};

export const complaintService = {
  async meta() {
    const [categories, offices, routingRules] = await Promise.all([
      ComplaintCategory.findAll({ where: { active: true }, order: [['id', 'ASC']] }),
      Office.findAll({ where: { active: true }, order: [['id', 'ASC']] }),
      RoutingRule.findAll({
        where: { active: true },
        include: [
          { model: ComplaintCategory, as: 'category' },
          { model: Office, as: 'office' }
        ],
        order: [['id', 'ASC']]
      })
    ]);
    const orderedCategories = sortByCodeOrder(categories.map(publicCategory), categoryOrder);
    const categoryRank = Object.fromEntries(orderedCategories.map((category, index) => [category.id, index]));

    return {
      categories: orderedCategories,
      offices: sortByCodeOrder(offices.map(publicOffice), officeOrder),
      routingRules: routingRules
        .map(publicRule)
        .sort((a, b) => (categoryRank[a.categoryId] ?? 999) - (categoryRank[b.categoryId] ?? 999))
    };
  },

  async createCategory(payload) {
    if (!payload.name) {
      const error = new Error('Category name is required');
      error.status = 422;
      throw error;
    }
    const code = payload.code || payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const category = await ComplaintCategory.create({
      code,
      name: payload.name,
      description: payload.description || '',
      defaultPriority: payload.defaultPriority || 'Medium',
      slaDays: payload.slaDays || 3,
      active: true
    });
    await logAction(payload.actor || 'Admin', `Created complaint category ${category.name}`, { entity: 'complaint_category', entityId: category.id });
    return publicCategory(category);
  },

  async createRoutingRule(payload, actor) {
    if (!payload.categoryId || !payload.officeId) {
      const error = new Error('Complaint category and responsible office are required');
      error.status = 422;
      throw error;
    }

    const [category, office] = await Promise.all([
      ComplaintCategory.findByPk(payload.categoryId),
      Office.findByPk(payload.officeId)
    ]);
    if (!category || !category.active) {
      const error = new Error('Complaint category not found');
      error.status = 422;
      throw error;
    }
    if (!office || !office.active) {
      const error = new Error('Responsible office not found');
      error.status = 422;
      throw error;
    }

    const location = payload.location || 'Kacyiru';
    const rule = await RoutingRule.create({
      code: payload.code || await uniqueRouteCode(category, location),
      categoryId: category.id,
      officeId: office.id,
      location,
      priority: payload.priority || category.defaultPriority || 'Medium',
      slaDays: payload.slaDays || category.slaDays || 3,
      active: payload.active === undefined ? true : Boolean(payload.active)
    });
    await logAction(actor?.fullName || 'Administrator', `Created routing rule ${rule.code}`, { entity: 'routing_rule', entityId: rule.id });
    const meta = await this.meta();
    return { rule: meta.routingRules.find((item) => item.id === rule.id), routingRules: meta.routingRules };
  },

  async list(filters = {}, actor) {
    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.officeId) where.officeId = filters.officeId;
    if (actor?.role === 'staff' && actor.officeId && !filters.officeId) {
      where.officeId = actor.officeId;
    } else if (actor?.role === 'staff' && !actor.officeId) {
      return [];
    }

    const complaints = await Complaint.findAll({
      where,
      include: includeComplaintRelations,
      order: [['createdAt', 'DESC']]
    });
    return complaints.map(publicComplaint);
  },

  async mine(actor) {
    const complaints = await Complaint.findAll({
      where: { citizenId: actor.id },
      include: includeComplaintRelations,
      order: [['createdAt', 'DESC']]
    });
    return complaints.map(publicComplaint);
  },

  async find(trackingNumber, actor) {
    const complaint = await loadComplaint(trackingNumber);
    if (actor) assertVisibleToActor(complaint, actor);
    return publicComplaint(complaint);
  },

  async create(payload, actor, file) {
    const category = await findCategory(payload.categoryId || payload.type || payload.category);
    const location = payload.location || [payload.sector, payload.district, payload.province].filter(Boolean).join(', ') || 'Kacyiru Sector, Gasabo District';
    const rule = await findRoutingRule(category.id, location);
    const office = rule.office || await Office.findByPk(rule.officeId);
    const trackingNumber = await nextTrackingNumber();

    const complaint = await Complaint.create({
      trackingNumber,
      citizenId: actor.id,
      categoryId: category.id,
      officeId: office.id,
      citizenName: payload.citizenName || actor.fullName,
      citizenPhone: payload.citizenPhone || payload.phone || actor.phone,
      description: payload.description,
      location,
      cell: payload.cell || '',
      village: payload.village || '',
      priority: rule.priority || category.defaultPriority,
      status: 'Assigned',
      assignedTo: office.contactPerson,
      channel: payload.channel || 'Web Portal',
      attachmentName: file?.originalname || payload.attachmentName || '',
      attachmentPath: file ? `/uploads/${file.filename}` : '',
      dueDate: dueDateFromDays(rule.slaDays || category.slaDays)
    });

    await createResponse(complaint, 'System', `Complaint received and automatically routed to ${office.name}.`, 'Assigned');
    await notifyCitizen(complaint, 'Complaint submitted', `Your complaint ${trackingNumber} was received and assigned to ${office.name}.`);
    await logAction(actor.fullName, `Submitted complaint ${trackingNumber}`, { entity: 'complaint', entityId: trackingNumber });

    return publicComplaint(await loadComplaint(trackingNumber));
  },

  async update(trackingNumber, payload, actor) {
    const complaint = await loadComplaint(trackingNumber);
    if (actor) assertVisibleToActor(complaint, actor);
    const status = payload.status || complaint.status;
    const officeChanged = Boolean(payload.assignedOfficeId) && Number(payload.assignedOfficeId) !== complaint.officeId;
    const updates = {
      status,
      priority: payload.priority || complaint.priority
    };

    let newOffice = null;
    if (payload.assignedOfficeId) {
      newOffice = await Office.findByPk(payload.assignedOfficeId);
      if (!newOffice) {
        const error = new Error('Office not found');
        error.status = 422;
        throw error;
      }
      updates.officeId = newOffice.id;
      updates.assignedTo = newOffice.contactPerson;
    }

    if (['Resolved', 'Closed'].includes(status)) updates.resolvedAt = complaint.resolvedAt || new Date();
    if (status === 'Closed') updates.closedAt = complaint.closedAt || new Date();

    const actorName = actor?.fullName || 'Administrative Staff';
    await complaint.update(updates);
    await createResponse(complaint, payload.responder || actorName, payload.responseText, status, actor?.id);

    if (officeChanged) {
      await notifyCitizen(complaint, 'Complaint assigned', `Your complaint ${trackingNumber} was reassigned to ${newOffice.name}.`);
    } else if (status === 'Closed') {
      await notifyCitizen(complaint, 'Complaint closed', `Your complaint ${trackingNumber} has been closed. Thank you for using SCFCMS.`);
    } else {
      await notifyCitizen(complaint, 'Complaint updated', `${trackingNumber} is now ${status}.`);
    }

    await logAction(actorName, `Updated complaint ${trackingNumber} to ${status}`, { entity: 'complaint', entityId: trackingNumber });

    return publicComplaint(await loadComplaint(trackingNumber));
  },

  async escalate(trackingNumber, payload = {}, actor) {
    const complaint = await loadComplaint(trackingNumber);
    if (actor) assertVisibleToActor(complaint, actor);
    const actorName = actor?.fullName || 'Administrative Staff';
    await complaint.update({
      status: 'Escalated',
      priority: payload.priority || 'Critical',
      escalatedTo: payload.escalatedTo || 'Sector Executive Office'
    });
    await createResponse(
      complaint,
      payload.responder || actorName,
      payload.reason || `Complaint escalated to ${payload.escalatedTo || 'Sector Executive Office'} for faster follow-up.`,
      'Escalated',
      actor?.id
    );
    await notifyCitizen(complaint, 'Complaint escalated', `${trackingNumber} was escalated to ${payload.escalatedTo || 'Sector Executive Office'}.`);
    await logAction(actorName, `Escalated complaint ${trackingNumber}`, { entity: 'complaint', entityId: trackingNumber });
    return publicComplaint(await loadComplaint(trackingNumber));
  },

  async rate(trackingNumber, payload, actor) {
    const complaint = await loadComplaint(trackingNumber);
    if (actor) assertOwnedByCitizen(complaint, actor);
    const score = Math.max(1, Math.min(5, Number(payload.score || 5)));
    const [rating] = await SatisfactionRating.findOrCreate({
      where: { complaintId: complaint.id },
      defaults: {
        complaintId: complaint.id,
        score,
        comment: payload.comment || '',
        ratedAt: new Date()
      }
    });
    await rating.update({ score, comment: payload.comment || rating.comment, ratedAt: new Date() });
    await complaint.update({ status: 'Closed', closedAt: new Date(), resolvedAt: complaint.resolvedAt || new Date() });
    await logAction(actor?.fullName || 'Citizen', `Rated complaint ${trackingNumber} with ${score} stars`, { entity: 'satisfaction_rating', entityId: rating.id });
    return publicComplaint(await loadComplaint(trackingNumber));
  },

  async updateRoutingRule(id, payload, actor) {
    const rule = await RoutingRule.findByPk(id);
    if (!rule) {
      const error = new Error('Routing rule not found');
      error.status = 404;
      throw error;
    }
    await rule.update({
      officeId: payload.officeId || rule.officeId,
      priority: payload.priority || rule.priority,
      slaDays: payload.slaDays || rule.slaDays,
      active: payload.active === undefined ? rule.active : Boolean(payload.active)
    });
    await logAction(actor?.fullName || 'Administrator', `Updated routing rule ${rule.code}`, { entity: 'routing_rule', entityId: rule.id });
    const meta = await this.meta();
    return { rule: meta.routingRules.find((item) => item.id === rule.id), routingRules: meta.routingRules };
  },

  async publicSummary() {
    const complaints = await Complaint.findAll({ attributes: ['status', 'dueDate'] });
    const active = complaints.filter((complaint) => !['Closed', 'Resolved'].includes(complaint.status));
    const ratings = await SatisfactionRating.findAll({ attributes: ['score'] });
    const averageSatisfaction = ratings.length ? ratings.reduce((sum, rating) => sum + Number(rating.score), 0) / ratings.length : 0;

    return {
      totalComplaints: complaints.length,
      resolved: complaints.filter((complaint) => ['Resolved', 'Closed'].includes(complaint.status)).length,
      escalated: complaints.filter((complaint) => complaint.status === 'Escalated').length,
      averageSatisfaction: Number(averageSatisfaction.toFixed(1))
    };
  },

  async reports() {
    const complaints = await Complaint.findAll({
      include: includeComplaintRelations,
      order: [['createdAt', 'DESC']]
    });
    const active = complaints.filter((complaint) => !['Closed', 'Resolved'].includes(complaint.status));
    const ratings = await SatisfactionRating.findAll();
    const averageSatisfaction = ratings.length ? ratings.reduce((sum, rating) => sum + Number(rating.score), 0) / ratings.length : 0;

    const categories = await ComplaintCategory.findAll({ where: { active: true }, order: [['id', 'ASC']] });
    const offices = await Office.findAll({ where: { active: true }, order: [['id', 'ASC']] });

    const byCategory = sortByCodeOrder(categories, categoryOrder).map((category) => ({
      name: category.name,
      value: complaints.filter((complaint) => complaint.categoryId === category.id).length
    }));
    const byOffice = sortByCodeOrder(offices, officeOrder)
      .map((office) => ({
        name: office.name,
        value: complaints.filter((complaint) => complaint.officeId === office.id).length
      }))
      .filter((item) => item.value > 0);

    const auditLogs = await AuditLog.findAll({ order: [['createdAt', 'DESC']], limit: 8 });

    return {
      summary: {
        totalComplaints: complaints.length,
        openComplaints: active.length,
        escalated: complaints.filter((complaint) => complaint.status === 'Escalated').length,
        resolved: complaints.filter((complaint) => ['Resolved', 'Closed'].includes(complaint.status)).length,
        overdue: active.filter((complaint) => complaint.dueDate < today()).length,
        averageSatisfaction: Number(averageSatisfaction.toFixed(1))
      },
      byStatus: await statusCounts(),
      byCategory,
      byOffice,
      recentComplaints: complaints.slice(0, 6).map(publicComplaint),
      auditLogs: auditLogs.map((log) => ({
        id: `audit-${log.id}`,
        actor: log.actor,
        action: log.action,
        metadata: log.metadata,
        createdAt: log.createdAt
      }))
    };
  },

  async notifications(actor) {
    const where = actor?.role === 'citizen' ? { userId: actor.id } : {};
    const rows = await ComplaintNotification.findAll({
      where,
      include: [{ model: Complaint, as: 'complaint' }],
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    return rows.map((row) => ({
      id: `notif-c-${row.id}`,
      dbId: row.id,
      trackingNumber: row.complaint?.trackingNumber,
      title: row.title,
      message: row.message,
      read: row.read,
      createdAt: row.createdAt
    }));
  },

  async markNotificationRead(id, actor) {
    const notificationId = String(id).match(/\d+$/)?.[0];
    const row = notificationId ? await ComplaintNotification.findByPk(notificationId) : null;
    if (!row) {
      const error = new Error('Notification not found');
      error.status = 404;
      throw error;
    }
    if (actor?.role === 'citizen' && row.userId !== actor.id) {
      const error = new Error('Notification not found');
      error.status = 404;
      throw error;
    }
    await row.update({ read: true });
    return { id: `notif-c-${row.id}`, read: true };
  },

  async unreadNotificationCount(actor) {
    const where = actor?.role === 'citizen' ? { userId: actor.id, read: false } : { read: false };
    const count = await ComplaintNotification.count({ where });
    return { count };
  },

  async auditLogs() {
    const logs = await AuditLog.findAll({ order: [['createdAt', 'DESC']], limit: 50 });
    return logs.map((log) => ({
      id: `audit-${log.id}`,
      actor: log.actor,
      action: log.action,
      metadata: log.metadata,
      createdAt: log.createdAt
    }));
  }
};
