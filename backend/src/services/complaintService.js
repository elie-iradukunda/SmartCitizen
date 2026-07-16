import { Op } from 'sequelize';
import {
  AuditLog,
  Complaint,
  ComplaintCategory,
  ComplaintMessage,
  ComplaintNotification,
  ComplaintResponse,
  Office,
  RoutingRule,
  SatisfactionRating,
  User
} from '../models/index.js';
import { detectCategory, nextTrackingNumber } from './routingService.js';
import { notificationService } from './notificationService.js';

const today = () => new Date().toISOString().slice(0, 10);
const isOverdue = (complaint) => !['Closed', 'Resolved'].includes(complaint.status)
  && complaint.dueDate
  && complaint.dueDate < today();

// A case may only move along these edges. Without this an "In Review" case could be
// dragged back to "Assigned", or a closed one silently reopened.
const allowedTransitions = {
  Assigned: ['Assigned', 'In Review', 'Waiting for Citizen', 'Resolved', 'Escalated'],
  'In Review': ['In Review', 'Waiting for Citizen', 'Resolved', 'Escalated'],
  'Waiting for Citizen': ['Waiting for Citizen', 'In Review', 'Resolved', 'Escalated'],
  Resolved: ['Resolved', 'Closed', 'Escalated'],
  Escalated: ['Escalated', 'In Review', 'Resolved'],
  Closed: ['Closed']
};

const assertTransition = (from, to) => {
  if (!allowedTransitions[from]?.includes(to)) {
    const error = new Error(`A complaint cannot move from ${from} to ${to}.`);
    error.status = 422;
    throw error;
  }
};

// Every escalation ends up in the same place: the office above the one that was holding
// the case. Falls back to a name-only escalation if nobody has flagged an office yet.
const sectorExecutiveOffice = async () => (await Office.findOne({ where: { isSectorExecutive: true, active: true } }))
  || (await Office.findOne({ where: { name: 'Sector Executive Office' } }));
const dueDateFromDays = (days) => new Date(Date.now() + Number(days || 3) * 86400000).toISOString().slice(0, 10);
const categoryOrder = [
  'citizen-services',
  'infrastructure-sanitation',
  'land-housing-construction',
  'community-safety-health',
  'governance-accountability'
];
const officeOrder = [
  'citizen-services-office',
  'infrastructure-sanitation-office',
  'land-housing-construction-office',
  'community-safety-health-office',
  'governance-accountability-office'
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
  { model: ComplaintMessage, as: 'messages', separate: true, order: [['createdAt', 'ASC']] },
  { model: SatisfactionRating, as: 'satisfaction' }
];

// Reports count and summarise cases; they never render the conversation, so loading every
// message for every case would be weight on the wire for nothing.
const includeReportRelations = includeComplaintRelations.filter((relation) => relation.as !== 'messages');

// The conversation belongs to the citizen and the office holding the case. Any other staff
// member can see that it happened, but not what was said - a housing officer has no business
// reading a corruption report's chat. Admins see everything; that is their oversight role.
const canReadChat = (item, actor) => {
  if (!actor) return false;
  if (actor.role === 'admin') return true;
  if (actor.role === 'citizen') return item.citizenId === actor.id;
  return Boolean(actor.officeId) && item.officeId === actor.officeId;
};

const publicComplaint = (record, actor = null) => {
  const item = record.toJSON ? record.toJSON() : record;
  const lowRating = Number(item.satisfaction?.score || 0) > 0 && Number(item.satisfaction?.score || 0) <= 2;
  const overdue = !['Closed', 'Resolved'].includes(item.status) && item.dueDate && item.dueDate < today();
  const chatVisible = canReadChat(item, actor);
  const messages = item.messages || [];
  const chatOpen = Boolean(item.chatOpenedAt);
  // The citizen may ask for the Sector Executive once the office has run out of road: the
  // deadline passed, or they were answered and the answer did not solve anything.
  const canRequestEscalation = Boolean(item.citizenId)
    && !item.escalationRequestedAt
    && !['Escalated', 'Closed'].includes(item.status)
    && (overdue || item.status === 'Resolved' || lowRating);
  return {
    id: `cmp-${item.id}`,
    dbId: item.id,
    trackingNumber: item.trackingNumber,
    isAnonymous: Boolean(item.isAnonymous),
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
    evidenceLink: item.evidenceLink,
    voiceNoteName: item.voiceNoteName,
    voiceNotePath: item.voiceNotePath,
    voiceNoteType: item.voiceNoteType,
    followUpRequired: item.status === 'Escalated' || overdue || lowRating,
    dueDate: item.dueDate,
    chatOpen,
    chatOpenedAt: item.chatOpenedAt,
    canRequestEscalation,
    escalationRequestedAt: item.escalationRequestedAt,
    messageCount: messages.length,
    // Redacted rather than dropped: other departments can see a conversation is running
    // without reading it, which is what makes the case history auditable.
    messages: chatVisible
      ? messages.map((message) => ({
        id: `msg-${message.id}`,
        dbId: message.id,
        senderName: message.senderName,
        senderRole: message.senderRole,
        body: message.body,
        mine: Boolean(actor) && message.senderId === actor.id,
        createdAt: message.createdAt
      }))
      : [],
    chatRedacted: !chatVisible && messages.length > 0,
    unreadMessages: chatVisible && actor
      ? messages.filter((message) => (actor.role === 'citizen'
        ? !message.readByCitizen && message.senderRole !== 'citizen'
        : !message.readByOffice && message.senderRole === 'citizen')).length
      : 0,
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
      isPublic: item.satisfaction.isPublic !== false,
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
  .replace(/(^-|-$)/g, '') || 'office';

const categoryCodeFrom = (name) => String(name || 'complaint-category')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '') || 'complaint-category';

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

const logAction = async (actor, action, metadata = {}) => AuditLog.create({ actor, action, metadata });

// An anonymous complaint has nobody to notify - the reporter follows it with the tracking
// number instead.
const notifyCitizen = async (complaint, title, message) => {
  if (!complaint.citizenId) return null;
  const notification = await ComplaintNotification.create({
    userId: complaint.citizenId,
    complaintId: complaint.id,
    title,
    message
  });
  const user = await User.findByPk(complaint.citizenId);
  await notificationService.sendComplaintUpdate({
    user,
    phone: complaint.citizenPhone,
    trackingNumber: complaint.trackingNumber,
    title,
    message
  }).catch((error) => console.error('[complaint-notification]', error.message));
  return notification;
};

// The other half of notifyCitizen: tell the office that actually owns the case. Every
// active member of the assigned office is notified, because the office - not one named
// person - is what routing picks, and whoever is on duty has to be able to pick it up.
const notifyOffice = async (complaint, title, message, { includeAdmins = false } = {}) => {
  if (!complaint.officeId) return [];
  const recipients = await User.findAll({
    where: {
      status: 'active',
      [Op.or]: [
        { role: 'staff', officeId: complaint.officeId },
        ...(includeAdmins ? [{ role: 'admin' }] : [])
      ]
    }
  });
  if (!recipients.length) return [];

  const notifications = await ComplaintNotification.bulkCreate(
    recipients.map((user) => ({
      userId: user.id,
      complaintId: complaint.id,
      title,
      message
    }))
  );

  await Promise.all(recipients.map((user) => notificationService.sendComplaintUpdate({
    user,
    phone: user.phone,
    trackingNumber: complaint.trackingNumber,
    title,
    message
  }).catch((error) => console.error('[office-notification]', error.message))));

  return notifications;
};

// Every chat message goes through here so the "first office reply opens the chat" rule is
// enforced in one place, whether the reply came from the chat box or from the status form.
const appendMessage = async (complaint, actor, body, { notify = true } = {}) => {
  const text = String(body || '').trim();
  if (!text) return null;

  const fromOffice = actor.role !== 'citizen';
  const message = await ComplaintMessage.create({
    complaintId: complaint.id,
    senderId: actor.id,
    senderName: actor.fullName,
    senderRole: actor.role,
    body: text,
    readByCitizen: !fromOffice,
    readByOffice: fromOffice
  });

  if (fromOffice && !complaint.chatOpenedAt) {
    await complaint.update({ chatOpenedAt: new Date() });
  }

  if (notify) {
    if (fromOffice) {
      await notifyCitizen(
        complaint,
        'New message on your complaint',
        `${actor.fullName} replied to ${complaint.trackingNumber}.`
      );
    } else {
      await notifyOffice(
        complaint,
        'New message from citizen',
        `${actor.fullName} sent a message on ${complaint.trackingNumber}.`
      );
    }
  }

  return message;
};

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
};

const assertCanReadChat = (complaint, actor) => {
  if (canReadChat(complaint, actor)) return;
  const error = new Error('This conversation is private to the citizen and the department handling the case.');
  error.status = 403;
  throw error;
};

const assertStaffCanWork = (complaint, actor) => {
  if (actor?.role !== 'staff') return;
  if (actor.officeId && complaint.officeId === actor.officeId) return;
  const error = new Error('Staff can view every complaint, but can only update complaints assigned to their department.');
  error.status = 403;
  throw error;
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

    const code = payload.code || officeCodeFrom(payload.name);
    let office = await Office.findOne({
      where: {
        [Op.or]: [
          { name: payload.name },
          { code }
        ]
      }
    });

    if (office) {
      await office.update({
        name: payload.name,
        contactPerson: payload.contactPerson || office.contactPerson || '',
        phone: payload.phone || office.phone || '',
        email: payload.email || office.email || '',
        active: payload.active === undefined ? true : Boolean(payload.active)
      });
      await logAction(actor?.fullName || 'Administrator', `Updated responsible office ${office.name}`, { entity: 'office', entityId: office.id });
      return publicOffice(office);
    }

    office = await Office.create({
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

    const code = payload.code || categoryCodeFrom(payload.name);
    let category = await ComplaintCategory.findOne({
      where: {
        [Op.or]: [
          { name: payload.name },
          { code }
        ]
      }
    });

    if (category) {
      await category.update({
        name: payload.name,
        description: payload.description || category.description || '',
        defaultPriority: payload.defaultPriority || category.defaultPriority || 'Medium',
        slaDays: payload.slaDays || category.slaDays || 3,
        active: true
      });
      await logAction(payload.actor || 'Admin', `Updated complaint category ${category.name}`, { entity: 'complaint_category', entityId: category.id });
      return publicCategory(category);
    }

    category = await ComplaintCategory.create({
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
    let rule = await RoutingRule.findOne({
      where: {
        categoryId: category.id,
        active: true,
        [Op.or]: [
          { location },
          { location: { [Op.ne]: null } }
        ]
      },
      order: [['id', 'ASC']]
    });

    if (rule) {
      await rule.update({
        officeId: office.id,
        location,
        priority: payload.priority || category.defaultPriority || rule.priority || 'Medium',
        slaDays: payload.slaDays || category.slaDays || rule.slaDays || 3,
        active: payload.active === undefined ? true : Boolean(payload.active)
      });
      await logAction(actor?.fullName || 'Administrator', `Updated routing rule ${rule.code}`, { entity: 'routing_rule', entityId: rule.id });
      const meta = await this.meta();
      return { rule: meta.routingRules.find((item) => item.id === rule.id), routingRules: meta.routingRules };
    }

    rule = await RoutingRule.create({
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
    if (filters.status && filters.status !== 'all') where.status = filters.status;
    if (filters.categoryId) where.categoryId = Number(filters.categoryId);
    if (filters.priority && filters.priority !== 'all') where.priority = filters.priority;
    if (actor?.role === 'staff' && filters.scope !== 'all' && actor.officeId) {
      where.officeId = actor.officeId;
    } else if (actor?.role === 'staff' && filters.scope !== 'all' && !actor.officeId) {
      return [];
    } else if (filters.officeId) {
      where.officeId = Number(filters.officeId);
    }
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt[Op.gte] = new Date(`${filters.dateFrom}T00:00:00.000Z`);
      if (filters.dateTo) where.createdAt[Op.lte] = new Date(`${filters.dateTo}T23:59:59.999Z`);
    }

    const complaints = await Complaint.findAll({
      where,
      include: includeComplaintRelations,
      order: [['createdAt', 'DESC']]
    });
    const term = String(filters.query || filters.q || '').trim().toLowerCase();
    const overdueOnly = String(filters.overdue || '') === 'true';
    return complaints
      .map((complaint) => publicComplaint(complaint, actor))
      .filter((complaint) => {
        if (overdueOnly && !isOverdue(complaint)) return false;
        if (!term) return true;
        return [
          complaint.trackingNumber,
          complaint.description,
          complaint.assignedOffice,
          complaint.category,
          complaint.citizenName,
          complaint.location,
          complaint.cell,
          complaint.village
        ].some((value) => String(value || '').toLowerCase().includes(term));
      });
  },

  async mine(actor) {
    const complaints = await Complaint.findAll({
      where: { citizenId: actor.id },
      include: includeComplaintRelations,
      order: [['createdAt', 'DESC']]
    });
    return complaints.map((complaint) => publicComplaint(complaint, actor));
  },

  async find(trackingNumber, actor) {
    const complaint = await loadComplaint(trackingNumber);
    if (actor) assertVisibleToActor(complaint, actor);
    return publicComplaint(complaint, actor);
  },

  // `actor` is null for an anonymous submission, so somebody reporting misconduct never
  // has to attach their name to it. The category is decided here, from the text, whenever
  // the caller did not pick one.
  async create(payload, actor, files = {}) {
    const attachmentFile = files?.attachment || (files?.mimetype ? files : null);
    const voiceNoteFile = files?.voiceNote || null;
    const anonymous = !actor;
    const chosen = payload.categoryId || payload.type || payload.category;
    const category = chosen
      ? await findCategory(chosen)
      : await detectCategory(payload.description);
    if (!category) {
      const error = new Error('No active complaint category exists to route this complaint to');
      error.status = 422;
      throw error;
    }

    const location = payload.location || [payload.sector, payload.district, payload.province].filter(Boolean).join(', ') || 'Kacyiru Sector, Gasabo District';
    const rule = await findRoutingRule(category.id, location);
    const office = rule.office || await Office.findByPk(rule.officeId);
    const trackingNumber = await nextTrackingNumber();
    const fallbackDescription = voiceNoteFile
      ? 'Voice complaint recorded by citizen.'
      : attachmentFile
        ? 'Evidence submitted by citizen.'
        : payload.evidenceLink?.trim()
          ? 'Evidence link submitted by citizen.'
          : '';

    const complaint = await Complaint.create({
      trackingNumber,
      isAnonymous: anonymous,
      citizenId: anonymous ? null : actor.id,
      categoryId: category.id,
      officeId: office.id,
      citizenName: anonymous ? 'Anonymous' : (payload.citizenName || actor.fullName),
      citizenPhone: anonymous ? '' : (payload.citizenPhone || payload.phone || actor.phone),
      description: payload.description?.trim() || fallbackDescription,
      location,
      cell: anonymous ? '' : (payload.cell || ''),
      village: anonymous ? '' : (payload.village || ''),
      priority: rule.priority || category.defaultPriority,
      status: 'Assigned',
      assignedTo: office.contactPerson,
      channel: payload.channel || (anonymous ? 'Anonymous Web Report' : 'Web Portal'),
      submissionMode: payload.submissionMode || payload.channel || 'Typed form',
      evidenceType: evidenceTypeFromFile(attachmentFile),
      attachmentName: attachmentFile?.originalname || payload.attachmentName || '',
      attachmentPath: attachmentFile ? `/uploads/${attachmentFile.filename}` : '',
      evidenceLink: payload.evidenceLink?.trim() || '',
      voiceNoteName: voiceNoteFile?.originalname || '',
      voiceNotePath: voiceNoteFile ? `/uploads/${voiceNoteFile.filename}` : '',
      voiceNoteType: evidenceTypeFromFile(voiceNoteFile),
      dueDate: dueDateFromDays(rule.slaDays || category.slaDays)
    });

    await createResponse(complaint, 'System', `Complaint received and automatically routed to ${office.name}.`, 'Assigned');
    await notifyCitizen(complaint, 'Complaint submitted', `Your complaint ${trackingNumber} was received and assigned to ${office.name}.`);
    await notifyOffice(
      complaint,
      'New complaint assigned',
      `${trackingNumber} (${category.name}, ${complaint.priority}) was assigned to your department. Answer it by ${complaint.dueDate}.`
    );
    await logAction(anonymous ? 'Anonymous' : actor.fullName, `Submitted complaint ${trackingNumber}`, { entity: 'complaint', entityId: trackingNumber, anonymous });

    return publicComplaint(await loadComplaint(trackingNumber), actor);
  },

  async update(trackingNumber, payload, actor) {
    const complaint = await loadComplaint(trackingNumber);
    if (actor) assertVisibleToActor(complaint, actor);
    assertStaffCanWork(complaint, actor);
    const status = payload.status || complaint.status;
    assertTransition(complaint.status, status);
    // Closing is the citizen confirming the problem is actually gone. An office signing off
    // its own work is the thing this system exists to prevent, so the door is shut here and
    // not only in the UI: a case reaches Closed through rate(), or it does not get there.
    if (status === 'Closed' && actor && actor.role !== 'citizen') {
      const error = new Error('Only the citizen can close a complaint, by confirming it is solved.');
      error.status = 403;
      throw error;
    }
    const requestedOfficeId = payload.assignedOfficeId ? Number(payload.assignedOfficeId) : null;
    if (actor?.role === 'staff' && requestedOfficeId && requestedOfficeId !== complaint.officeId) {
      const error = new Error('Staff can only update complaints assigned to their department.');
      error.status = 403;
      throw error;
    }
    const canReassignOffice = actor?.role === 'admin' && requestedOfficeId;
    const officeChanged = Boolean(canReassignOffice) && requestedOfficeId !== complaint.officeId;
    const updates = {
      status,
      priority: payload.priority || complaint.priority
    };

    let newOffice = null;
    if (canReassignOffice) {
      newOffice = await Office.findByPk(requestedOfficeId);
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

    // The officer's written answer is the reply the citizen was waiting for, so it opens the
    // conversation. The citizen is told once, by the status notification below, not twice.
    if (actor && actor.role !== 'citizen' && payload.responseText?.trim()) {
      await appendMessage(complaint, actor, payload.responseText, { notify: false });
    }

    if (officeChanged) {
      await notifyCitizen(complaint, 'Complaint assigned', `Your complaint ${trackingNumber} was reassigned to ${newOffice.name}.`);
      await notifyOffice(complaint, 'Complaint reassigned to your department', `${trackingNumber} was reassigned to your department by ${actorName}.`);
    } else if (status === 'Closed') {
      await notifyCitizen(complaint, 'Complaint closed', `Your complaint ${trackingNumber} has been closed. Thank you for using SCFCMS.`);
    } else {
      await notifyCitizen(complaint, 'Complaint updated', `${trackingNumber} is now ${status}.`);
    }

    await logAction(actorName, `Updated complaint ${trackingNumber} to ${status}`, { entity: 'complaint', entityId: trackingNumber });

    return publicComplaint(await loadComplaint(trackingNumber), actor);
  },

  // The private conversation on one case. Reading it also clears the unread badge for
  // whichever side is looking, which is why this is a POST-free but stateful read.
  async messages(trackingNumber, actor) {
    const complaint = await loadComplaint(trackingNumber);
    assertVisibleToActor(complaint, actor);
    assertCanReadChat(complaint, actor);

    const fromOffice = actor.role !== 'citizen';
    await ComplaintMessage.update(
      fromOffice ? { readByOffice: true } : { readByCitizen: true },
      {
        where: {
          complaintId: complaint.id,
          senderRole: fromOffice ? 'citizen' : { [Op.ne]: 'citizen' },
          ...(fromOffice ? { readByOffice: false } : { readByCitizen: false })
        }
      }
    );

    return publicComplaint(await loadComplaint(trackingNumber), actor);
  },

  async sendMessage(trackingNumber, payload, actor) {
    const complaint = await loadComplaint(trackingNumber);
    assertVisibleToActor(complaint, actor);
    assertCanReadChat(complaint, actor);
    // Staff outside the assigned department may read a case, but answering it is exactly
    // what department ownership means, so the same guard as the status form applies here.
    assertStaffCanWork(complaint, actor);

    const body = String(payload.body || payload.message || '').trim();
    if (!body) {
      const error = new Error('Write a message before sending.');
      error.status = 422;
      throw error;
    }
    if (complaint.status === 'Closed') {
      const error = new Error('This complaint is closed. The conversation is read-only.');
      error.status = 422;
      throw error;
    }
    // The citizen speaks second: until the office has answered there is nobody assigned to
    // read them, and an unanswered inbox is how cases get lost.
    if (actor.role === 'citizen' && !complaint.chatOpenedAt) {
      const error = new Error('The conversation opens as soon as the assigned office replies to your complaint.');
      error.status = 422;
      throw error;
    }

    await appendMessage(complaint, actor, body);
    await logAction(actor.fullName, `Sent a message on complaint ${trackingNumber}`, { entity: 'complaint', entityId: trackingNumber });
    return publicComplaint(await loadComplaint(trackingNumber), actor);
  },

  // Escalating hands the case over: it leaves the office that was sitting on it and moves to
  // the Sector Executive Office, which is the whole point of an escalation.
  async escalate(trackingNumber, payload = {}, actor) {
    const complaint = await loadComplaint(trackingNumber);
    if (actor) assertVisibleToActor(complaint, actor);
    assertStaffCanWork(complaint, actor);
    assertTransition(complaint.status, 'Escalated');

    const actorName = actor?.fullName || 'Administrative Staff';
    const sector = await sectorExecutiveOffice();
    const escalatedTo = sector?.name || payload.escalatedTo || 'Sector Executive Office';

    await complaint.update({
      status: 'Escalated',
      priority: payload.priority || 'Critical',
      escalatedTo,
      ...(sector ? { officeId: sector.id, assignedTo: sector.contactPerson } : {})
    });
    await createResponse(
      complaint,
      payload.responder || actorName,
      payload.reason?.trim() || `Complaint escalated to ${escalatedTo} for faster follow-up.`,
      'Escalated',
      actor?.id
    );
    await notifyCitizen(complaint, 'Complaint escalated', `${trackingNumber} was escalated to ${escalatedTo}.`);
    await notifyOffice(
      complaint,
      'Escalated complaint received',
      `${trackingNumber} was escalated to ${escalatedTo} by ${actorName} and needs urgent follow-up.`,
      { includeAdmins: true }
    );
    await logAction(actorName, `Escalated complaint ${trackingNumber}`, { entity: 'complaint', entityId: trackingNumber });
    return publicComplaint(await loadComplaint(trackingNumber), actor);
  },

  // The citizen's own appeal. Escalation is otherwise something that happens *to* a case -
  // by deadline or by an officer - and a citizen who is being ignored needs a way to say so.
  // Gated to cases that have earned it: past the deadline, or answered without being solved.
  async requestEscalation(trackingNumber, payload, actor) {
    const complaint = await loadComplaint(trackingNumber);
    assertOwnedByCitizen(complaint, actor);

    const view = publicComplaint(complaint, actor);
    if (!view.canRequestEscalation) {
      const error = new Error(
        complaint.escalationRequestedAt
          ? 'You have already asked for this complaint to be escalated.'
          : 'You can ask for help once the deadline has passed or the office has answered your complaint.'
      );
      error.status = 422;
      throw error;
    }

    assertTransition(complaint.status, 'Escalated');
    const sector = await sectorExecutiveOffice();
    const escalatedTo = sector?.name || 'Sector Executive Office';
    const reason = String(payload.reason || '').trim();

    await complaint.update({
      status: 'Escalated',
      priority: 'Critical',
      escalatedTo,
      escalationRequestedAt: new Date(),
      closedAt: null,
      ...(sector ? { officeId: sector.id, assignedTo: sector.contactPerson } : {})
    });
    await createResponse(
      complaint,
      complaint.citizenName,
      reason
        ? `Citizen asked for senior review: ${reason}`
        : 'Citizen asked for senior review because the complaint was not resolved.',
      'Escalated',
      actor.id
    );
    if (reason && complaint.chatOpenedAt) {
      await appendMessage(complaint, actor, reason, { notify: false });
    }
    await notifyCitizen(complaint, 'Complaint escalated', `${trackingNumber} was escalated to ${escalatedTo} at your request.`);
    await notifyOffice(
      complaint,
      'Citizen requested senior review',
      `${complaint.citizenName} asked for help on ${trackingNumber}. It was escalated to ${escalatedTo}.`,
      { includeAdmins: true }
    );
    await logAction(actor.fullName, `Requested escalation of complaint ${trackingNumber}`, { entity: 'complaint', entityId: trackingNumber });
    return publicComplaint(await loadComplaint(trackingNumber), actor);
  },

  async rate(trackingNumber, payload, actor) {
    const complaint = await loadComplaint(trackingNumber);
    if (actor) assertOwnedByCitizen(complaint, actor);
    // Rating is what closes a case, so it only makes sense once an office has answered it.
    if (complaint.status !== 'Resolved') {
      const error = new Error('You can only rate a complaint once it has been resolved.');
      error.status = 422;
      throw error;
    }
    const score = Math.max(1, Math.min(5, Number(payload.score || 5)));
    const isPublic = payload.isPublic === undefined ? true : Boolean(payload.isPublic);
    const [rating] = await SatisfactionRating.findOrCreate({
      where: { complaintId: complaint.id },
      defaults: {
        complaintId: complaint.id,
        score,
        comment: payload.comment || '',
        isPublic,
        ratedAt: new Date()
      }
    });
    await rating.update({
      score,
      comment: payload.comment || rating.comment,
      isPublic,
      ratedAt: new Date()
    });

    if (score <= 2) {
      const sector = await sectorExecutiveOffice();
      const escalatedTo = sector?.name || 'Sector Executive Office';
      await complaint.update({
        status: 'Escalated',
        priority: 'Critical',
        escalatedTo,
        closedAt: null,
        resolvedAt: complaint.resolvedAt || new Date(),
        ...(sector ? { officeId: sector.id, assignedTo: sector.contactPerson } : {})
      });
      await createResponse(
        complaint,
        'System',
        `Citizen marked the response as unsatisfactory (${score}/5). The case was returned to ${escalatedTo} for follow-up.`,
        'Escalated'
      );
      await notifyCitizen(complaint, 'Complaint escalated', `${trackingNumber} was escalated to ${escalatedTo} because you were not satisfied with the response.`);
      await notifyOffice(
        complaint,
        'Complaint returned after low rating',
        `${trackingNumber} was rated ${score}/5 by the citizen and returned to ${escalatedTo} for follow-up.`,
        { includeAdmins: true }
      );
    } else {
      await complaint.update({ status: 'Closed', closedAt: new Date(), resolvedAt: complaint.resolvedAt || new Date() });
      await notifyOffice(
        complaint,
        'Complaint confirmed resolved',
        `${complaint.citizenName} confirmed ${trackingNumber} is resolved and rated it ${score}/5.`
      );
    }

    await logAction(actor?.fullName || 'Citizen', `Rated complaint ${trackingNumber} with ${score} stars`, { entity: 'satisfaction_rating', entityId: rating.id });
    return publicComplaint(await loadComplaint(trackingNumber), actor);
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

  // Anyone holding a tracking number can check progress without an account.
  // Only routing/progress fields are exposed, never the description or citizen identity.
  // The sector's public record. Only finished cases, only the rating the citizen chose to
  // publish, and never the conversation - the chat stays private even after closing.
  async publicFeedback(filters = {}) {
    const limit = Math.min(Number(filters.limit) || 50, 100);
    const complaints = await Complaint.findAll({
      where: { status: 'Closed' },
      include: [
        { model: ComplaintCategory, as: 'category' },
        { model: Office, as: 'office' },
        {
          model: SatisfactionRating,
          as: 'satisfaction',
          required: true,
          where: { isPublic: true }
        }
      ],
      order: [['closedAt', 'DESC']],
      limit
    });

    const entries = complaints.map((record) => {
      const item = record.toJSON();
      return {
        id: `fb-${item.id}`,
        trackingNumber: item.trackingNumber,
        category: item.category?.name,
        office: item.office?.name,
        // An anonymous report has no name to show, and never gained one by being resolved.
        citizenName: item.isAnonymous ? 'Anonymous' : item.citizenName,
        cell: item.cell,
        village: item.village,
        score: item.satisfaction.score,
        comment: item.satisfaction.comment,
        ratedAt: item.satisfaction.ratedAt,
        closedAt: item.closedAt
      };
    });

    const total = entries.length;
    const averageScore = total
      ? Number((entries.reduce((sum, entry) => sum + entry.score, 0) / total).toFixed(2))
      : 0;

    return { entries, summary: { total, averageScore } };
  },

  async publicTrack(trackingNumber) {
    const complaint = await Complaint.findOne({
      where: { trackingNumber: String(trackingNumber || '').trim().toUpperCase() },
      include: [
        { model: ComplaintCategory, as: 'category' },
        { model: Office, as: 'office' },
        { model: ComplaintResponse, as: 'responses', separate: true, order: [['createdAt', 'ASC']] }
      ]
    });
    if (!complaint) {
      const error = new Error('Complaint not found');
      error.status = 404;
      throw error;
    }
    return {
      trackingNumber: complaint.trackingNumber,
      status: complaint.status,
      category: complaint.category?.name,
      assignedOffice: complaint.office?.name,
      dueDate: complaint.dueDate,
      createdAt: complaint.createdAt,
      resolvedAt: complaint.resolvedAt,
      overdue: !['Closed', 'Resolved'].includes(complaint.status) && complaint.dueDate < today(),
      // Progress only. The system's own messages (routing, escalation) are safe to show,
      // but an officer's written answer is not - that is for the citizen's own account.
      timeline: (complaint.responses || []).map((response) => ({
        status: response.statusUpdate,
        label: response.responder === 'System' ? response.responseText : `Handled by ${complaint.office?.name}`,
        at: response.createdAt
      }))
    };
  },

  // Every complaint past its SLA due date is escalated on its own, so an ignored
  // case cannot simply stay open forever.
  async runSlaCheck(actor) {
    const overdue = await Complaint.findAll({
      where: {
        status: { [Op.notIn]: ['Resolved', 'Closed', 'Escalated'] },
        dueDate: { [Op.lt]: today() }
      }
    });

    const sector = await sectorExecutiveOffice();
    const escalatedTo = sector?.name || 'Sector Executive Office';

    for (const complaint of overdue) {
      await complaint.update({
        status: 'Escalated',
        priority: 'Critical',
        escalatedTo,
        ...(sector ? { officeId: sector.id, assignedTo: sector.contactPerson } : {})
      });
      await createResponse(
        complaint,
        'System',
        `The due date passed before this case was resolved, so it was escalated automatically to ${escalatedTo}.`,
        'Escalated'
      );
      await notifyCitizen(
        complaint,
        'Complaint escalated',
        `${complaint.trackingNumber} passed its due date and was escalated automatically to ${escalatedTo}.`
      );
    }

    await logAction(actor?.fullName || 'System', `Ran the SLA check and escalated ${overdue.length} overdue complaints`, {
      entity: 'complaint',
      escalated: overdue.length
    });

    return {
      escalated: overdue.length,
      trackingNumbers: overdue.map((complaint) => complaint.trackingNumber)
    };
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
      include: includeReportRelations,
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
      id: category.id,
      code: category.code,
      name: category.name,
      value: complaints.filter((complaint) => complaint.categoryId === category.id).length
    }));
    const byOffice = sortByCodeOrder(offices, officeOrder)
      .map((office) => ({
        id: office.id,
        code: office.code,
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
      recentComplaints: complaints.slice(0, 6).map((complaint) => publicComplaint(complaint, actor)),
      adminAttention: attentionComplaints.slice(0, 8).map((complaint) => publicComplaint(complaint, actor)),
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
