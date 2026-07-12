import { Op } from 'sequelize';
import {
  AuditLog,
  Complaint,
  ComplaintCategory,
  ComplaintNotification,
  ComplaintResponse,
  Office,
  RoutingRule,
  SatisfactionRating,
  User
} from '../models/index.js';

const today = () => new Date().toISOString().slice(0, 10);
const dueDateFromDays = (days) => new Date(Date.now() + Number(days || 3) * 86400000).toISOString().slice(0, 10);
const categoryOrder = [
  'service-delay',
  'documents',
  'infrastructure',
  'water-sanitation',
  'land-housing',
  'health-hygiene',
  'safety-community',
  'market-trade',
  'education-youth',
  'misconduct',
  'feedback'
];
const officeOrder = [
  'service-delivery',
  'responsible-service-unit',
  'infrastructure-office',
  'water-sanitation-unit',
  'land-housing-office',
  'health-social-affairs',
  'safety-desk',
  'trade-cooperatives-desk',
  'education-youth-office',
  'senior-administrator',
  'customer-care-planning'
];
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
  const lowRating = Number(item.satisfaction?.score || 0) > 0 && Number(item.satisfaction?.score || 0) <= 2;
  const overdue = !['Closed', 'Resolved'].includes(item.status) && item.dueDate && item.dueDate < today();
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
    submissionMode: item.submissionMode,
    evidenceType: item.evidenceType,
    attachmentName: item.attachmentName,
    attachmentPath: item.attachmentPath,
    followUpRequired: item.status === 'Escalated' || overdue || lowRating,
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

const officeCodeFrom = (name) => String(name || 'office')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

const uniqueOfficeCode = async (name) => {
  const base = officeCodeFrom(name);
  let code = base;
  let suffix = 2;
  while (await Office.findOne({ where: { code } })) {
    code = `${base}-${suffix}`;
    suffix += 1;
  }
  return code;
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

const evidenceTypeFromFile = (file) => {
  const mime = file?.mimetype || '';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('audio/')) return 'audio';
  return file ? 'file' : '';
};

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

// A citizen sees only their own notifications, a staff member only those raised on
// cases held by their office, and an admin sees the whole system feed.
const notificationScope = (actor) => (actor?.role === 'citizen' ? { userId: actor.id } : {});

const notificationComplaintInclude = (actor) => {
  const include = { model: Complaint, as: 'complaint' };
  if (actor?.role !== 'staff') return include;
  return { ...include, required: true, where: { officeId: actor.officeId ?? -1 } };
};

const statusCounts = (rows) => {
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

  async createOffice(payload, actor) {
    if (!payload.name) {
      const error = new Error('Department or office name is required');
      error.status = 422;
      throw error;
    }

    const office = await Office.create({
      code: payload.code || await uniqueOfficeCode(payload.name),
      name: payload.name,
      contactPerson: payload.contactPerson || '',
      phone: payload.phone || '',
      email: payload.email || '',
      active: payload.active === undefined ? true : Boolean(payload.active)
    });
    await logAction(actor?.fullName || 'Administrator', `Created responsible office ${office.name}`, { entity: 'office', entityId: office.id });
    return publicOffice(office);
  },

  async updateOffice(id, payload, actor) {
    const office = await Office.findByPk(id);
    if (!office) {
      const error = new Error('Responsible office not found');
      error.status = 404;
      throw error;
    }

    const updates = {};
    ['name', 'contactPerson', 'phone', 'email'].forEach((field) => {
      if (payload[field] !== undefined) updates[field] = payload[field];
    });
    if (payload.active !== undefined) updates.active = Boolean(payload.active);
    await office.update(updates);
    await logAction(actor?.fullName || 'Administrator', `Updated responsible office ${office.name}`, { entity: 'office', entityId: office.id });
    return publicOffice(office);
  },

  async deleteOffice(id, actor) {
    const office = await Office.findByPk(id);
    if (!office) {
      const error = new Error('Responsible office not found');
      error.status = 404;
      throw error;
    }

    const [linkedComplaints, linkedRules, linkedUsers] = await Promise.all([
      Complaint.count({ where: { officeId: office.id } }),
      RoutingRule.count({ where: { officeId: office.id } }),
      User.count({ where: { officeId: office.id } })
    ]);
    if (linkedComplaints || linkedRules || linkedUsers) {
      const error = new Error('This office is linked to complaints, routing rules, or staff accounts. Deactivate it after moving those responsibilities first.');
      error.status = 422;
      throw error;
    }

    await office.destroy();
    await logAction(actor?.fullName || 'Administrator', `Deleted responsible office ${office.name}`, { entity: 'office', entityId: office.id });
    return { deleted: true };
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

  async updateCategory(id, payload, actor) {
    const category = await ComplaintCategory.findByPk(id);
    if (!category) {
      const error = new Error('Complaint category not found');
      error.status = 404;
      throw error;
    }
    const updates = {};
    ['name', 'description', 'defaultPriority', 'slaDays'].forEach((field) => {
      if (payload[field] !== undefined) updates[field] = payload[field];
    });
    if (payload.active !== undefined) updates.active = Boolean(payload.active);
    await category.update(updates);
    await logAction(actor?.fullName || 'Administrator', `Updated complaint category ${category.name}`, { entity: 'complaint_category', entityId: category.id });
    return publicCategory(category);
  },

  async deleteCategory(id, actor) {
    const category = await ComplaintCategory.findByPk(id);
    if (!category) {
      const error = new Error('Complaint category not found');
      error.status = 404;
      throw error;
    }
    const linkedComplaints = await Complaint.count({ where: { categoryId: category.id } });
    if (linkedComplaints > 0) {
      const error = new Error('Complaints were already submitted under this category, so it cannot be deleted. Set it to inactive instead.');
      error.status = 422;
      throw error;
    }
    await RoutingRule.destroy({ where: { categoryId: category.id } });
    await category.destroy();
    await logAction(actor?.fullName || 'Administrator', `Deleted complaint category ${category.name}`, { entity: 'complaint_category', entityId: category.id });
    return { deleted: true };
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
    if (actor?.role === 'staff' && actor.officeId) {
      where.officeId = actor.officeId;
    } else if (actor?.role === 'staff' && !actor.officeId) {
      return [];
    } else if (filters.officeId) {
      where.officeId = filters.officeId;
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
      submissionMode: payload.submissionMode || payload.channel || 'Typed form',
      evidenceType: evidenceTypeFromFile(file),
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

    if (score <= 2) {
      await complaint.update({
        status: 'Escalated',
        priority: 'Critical',
        escalatedTo: 'Sector Executive Office',
        closedAt: null,
        resolvedAt: complaint.resolvedAt || new Date()
      });
      await createResponse(
        complaint,
        'System',
        `Citizen marked the response as unsatisfactory (${score}/5). The case was returned to the Sector Executive Office for follow-up.`,
        'Escalated'
      );
      await notifyCitizen(complaint, 'Complaint escalated', `${trackingNumber} was escalated to the Sector Executive Office because you were not satisfied with the response.`);
    } else {
      await complaint.update({ status: 'Closed', closedAt: new Date(), resolvedAt: complaint.resolvedAt || new Date() });
    }

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

  async deleteRoutingRule(id, actor) {
    const rule = await RoutingRule.findByPk(id);
    if (!rule) {
      const error = new Error('Routing rule not found');
      error.status = 404;
      throw error;
    }
    await rule.destroy();
    await logAction(actor?.fullName || 'Administrator', `Deleted routing rule ${rule.code}`, { entity: 'routing_rule', entityId: rule.id });
    const meta = await this.meta();
    return { deleted: true, routingRules: meta.routingRules };
  },

  async remove(trackingNumber, actor) {
    const complaint = await loadComplaint(trackingNumber);
    await ComplaintNotification.destroy({ where: { complaintId: complaint.id } });
    await ComplaintResponse.destroy({ where: { complaintId: complaint.id } });
    await SatisfactionRating.destroy({ where: { complaintId: complaint.id } });
    await complaint.destroy();
    await logAction(actor?.fullName || 'Administrator', `Deleted complaint ${trackingNumber}`, { entity: 'complaint', entityId: trackingNumber });
    return { deleted: true, trackingNumber };
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

  async reports(actor) {
    const complaintWhere = {};
    if (actor?.role === 'staff') {
      if (!actor.officeId) {
        return {
          summary: {
            totalComplaints: 0,
            openComplaints: 0,
            escalated: 0,
            resolved: 0,
            overdue: 0,
            needsAdminAttention: 0,
            averageSatisfaction: 0
          },
          byStatus: [],
          byCategory: [],
          byOffice: [],
          recentComplaints: [],
          adminAttention: [],
          auditLogs: []
        };
      }
      complaintWhere.officeId = actor.officeId;
    }

    const complaints = await Complaint.findAll({
      where: complaintWhere,
      include: includeComplaintRelations,
      order: [['createdAt', 'DESC']]
    });
    const active = complaints.filter((complaint) => !['Closed', 'Resolved'].includes(complaint.status));
    const complaintIds = complaints.map((complaint) => complaint.id);
    const ratings = complaintIds.length ? await SatisfactionRating.findAll({ where: { complaintId: complaintIds } }) : [];
    const averageSatisfaction = ratings.length ? ratings.reduce((sum, rating) => sum + Number(rating.score), 0) / ratings.length : 0;
    const overdueComplaints = active.filter((complaint) => complaint.dueDate < today());
    const attentionComplaints = complaints.filter((complaint) => {
      const lowRating = Number(complaint.satisfaction?.score || 0) > 0 && Number(complaint.satisfaction?.score || 0) <= 2;
      const overdue = !['Closed', 'Resolved'].includes(complaint.status) && complaint.dueDate < today();
      return complaint.status === 'Escalated' || overdue || lowRating;
    });

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

    const auditLogs = actor?.role === 'staff'
      ? []
      : await AuditLog.findAll({ order: [['createdAt', 'DESC']], limit: 8 });

    return {
      summary: {
        totalComplaints: complaints.length,
        openComplaints: active.length,
        escalated: complaints.filter((complaint) => complaint.status === 'Escalated').length,
        resolved: complaints.filter((complaint) => ['Resolved', 'Closed'].includes(complaint.status)).length,
        overdue: overdueComplaints.length,
        needsAdminAttention: attentionComplaints.length,
        averageSatisfaction: Number(averageSatisfaction.toFixed(1))
      },
      byStatus: statusCounts(complaints),
      byCategory,
      byOffice,
      recentComplaints: complaints.slice(0, 6).map(publicComplaint),
      adminAttention: attentionComplaints.slice(0, 8).map(publicComplaint),
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
    const rows = await ComplaintNotification.findAll({
      where: notificationScope(actor),
      include: [notificationComplaintInclude(actor)],
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
    const row = notificationId
      ? await ComplaintNotification.findOne({
        where: { id: notificationId, ...notificationScope(actor) },
        include: [notificationComplaintInclude(actor)]
      })
      : null;
    if (!row) {
      const error = new Error('Notification not found');
      error.status = 404;
      throw error;
    }
    await row.update({ read: true });
    return { id: `notif-c-${row.id}`, read: true };
  },

  async unreadNotificationCount(actor) {
    const count = await ComplaintNotification.count({
      where: { read: false, ...notificationScope(actor) },
      include: [notificationComplaintInclude(actor)]
    });
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
