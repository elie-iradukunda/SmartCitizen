import { Op } from 'sequelize';
import {
  AuditLog,
  Complaint,
  ComplaintCategory,
  ComplaintNotification,
  ComplaintResponse,
  Counter,
  Office,
  RoutingRule,
  SatisfactionRating,
  User
} from '../models/index.js';
import { hashPassword } from './authService.js';

const DEMO_PASSWORD = 'password';

const demoCitizens = [
  { fullName: 'Jean Uwimana', email: 'jean@smartcitizen.rw', phone: '+250 788 456 111', nationalId: '1199080012345678', gender: 'Female', province: 'Kigali City', district: 'Gasabo', sector: 'Kacyiru', cell: 'Kamatamu', village: 'Umucyo', address: 'Kamatamu / Umucyo', preferredLanguage: 'Kinyarwanda' }
];

const demoStaff = [
  { fullName: 'Patrick Niyonsenga', email: 'staff@smartcitizen.rw', phone: '+250 788 456 222', gender: 'Male', officeCode: 'citizen-services-office' },
  { fullName: 'Claudine Mukamana', email: 'executive@smartcitizen.rw', phone: '+250 788 456 227', gender: 'Female', officeCode: 'sector-executive-office' }
].map((staff) => ({ ...staff, province: 'Kigali City', district: 'Gasabo', sector: 'Kacyiru', cell: 'Kamatamu', village: 'Umucyo', preferredLanguage: 'English' }));

const demoAdmins = [
  { fullName: 'Admin Manager', email: 'admin@smartcitizen.rw', phone: '+250 788 456 444', gender: 'Other' }
].map((admin) => ({ ...admin, province: 'Kigali City', district: 'Gasabo', sector: 'Kacyiru', cell: 'Kamatamu', village: 'Umucyo', preferredLanguage: 'English' }));

const scfcmsCategories = [
  { code: 'citizen-services', name: 'Citizen Services and Documents', description: 'Delayed services, civil documents, certificates, permits, applications, and front-desk support.', defaultPriority: 'High', slaDays: 3 }
];

// One normal office is enough for the demo. The Sector Executive Office stays because it is
// the escalation target every overdue or badly-rated case needs.
const offices = [
  { code: 'citizen-services-office', name: 'Citizen Services and Documentation Office', contactPerson: 'Patrick Niyonsenga', phone: '+250 788 300 101', email: 'citizen.services@kacyiru.gov.rw' },
  { code: 'sector-executive-office', name: 'Sector Executive Office', contactPerson: 'Claudine Mukamana', phone: '+250 788 300 111', email: 'executive@kacyiru.gov.rw', isSectorExecutive: true }
];

const routeSeeds = [
  { code: 'route-citizen-services', categoryCode: 'citizen-services', officeCode: 'citizen-services-office', location: 'Kacyiru', priority: 'High', slaDays: 3 }
];

export const seedDemoInventory = {
  currentUserEmails: [
    ...demoCitizens.map((user) => user.email),
    ...demoStaff.map((user) => user.email),
    ...demoAdmins.map((user) => user.email)
  ],
  legacyUserEmails: [
    'jean@smartcitizen.rw',
    'aline@smartcitizen.rw',
    'eric.h@smartcitizen.rw',
    'diane@smartcitizen.rw',
    'emmanuel@smartcitizen.rw',
    'grace@smartcitizen.rw',
    'staff@smartcitizen.rw',
    'eric.n@smartcitizen.rw',
    'samuel@smartcitizen.rw',
    'vincent@smartcitizen.rw',
    'solange@smartcitizen.rw',
    'executive@smartcitizen.rw',
    'admin@smartcitizen.rw',
    'alice.admin@smartcitizen.rw'
  ],
  currentCategoryCodes: scfcmsCategories.map((category) => category.code),
  legacyCategoryCodes: [
    'citizen-services',
    'infrastructure-sanitation',
    'land-housing-construction',
    'community-safety-health',
    'governance-accountability'
  ],
  currentOfficeCodes: offices.map((office) => office.code),
  legacyOfficeCodes: [
    'citizen-services-office',
    'infrastructure-sanitation-office',
    'land-housing-construction-office',
    'community-safety-health-office',
    'governance-accountability-office',
    'sector-executive-office'
  ],
  currentRoutingRuleCodes: routeSeeds.map((route) => route.code),
  legacyRoutingRuleCodes: [
    'route-citizen-services',
    'route-infrastructure-sanitation',
    'route-land-housing-construction',
    'route-community-safety-health',
    'route-governance-accountability'
  ]
};

const staleSeedValues = (legacy, current) => legacy.filter((value) => !current.includes(value));

const findOrCreateBy = async (model, where, defaults) => {
  const [record, created] = await model.findOrCreate({ where, defaults });
  if (!created) await record.update(defaults);
  return record;
};

const daysAgoIso = (days, hour = 9, minute = 0) => {
  const date = new Date(Date.now() - days * 86400000);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const daysAheadDate = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const daysAgoDate = (days) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

// A demo account is created with a hashed password. On later boots the profile is refreshed
// but the password is left alone, otherwise re-seeding would wipe a password the user changed
// (and undo the hashing).
const seedUser = async (profile) => {
  const [record, created] = await User.findOrCreate({
    where: { email: profile.email },
    defaults: { ...profile, password: await hashPassword(DEMO_PASSWORD) }
  });
  if (!created) {
    const { password, ...withoutPassword } = profile;
    await record.update(withoutPassword);
  }
  return record;
};

const seedUsers = async () => {
  for (const citizen of demoCitizens) {
    await seedUser({ ...citizen, role: 'citizen', status: 'active' });
  }
  for (const admin of demoAdmins) {
    await seedUser({ ...admin, role: 'admin', status: 'active' });
  }
};

const seedStaffUsers = async (officeByCode) => {
  const staffByOfficeCode = {};
  for (const staff of demoStaff) {
    const office = officeByCode[staff.officeCode];
    const { officeCode, ...profile } = staff;
    const record = await seedUser({ ...profile, role: 'staff', status: 'active', officeId: office.id });
    if (record.officeId !== office.id) await record.update({ officeId: office.id });
    staffByOfficeCode[staff.officeCode] = record;
  }
  return staffByOfficeCode;
};

const seedComplaintReferenceData = async () => {
  const categoryByCode = {};
  const officeByCode = {};
  const staleCategoryCodes = staleSeedValues(seedDemoInventory.legacyCategoryCodes, seedDemoInventory.currentCategoryCodes);
  const staleOfficeCodes = staleSeedValues(seedDemoInventory.legacyOfficeCodes, seedDemoInventory.currentOfficeCodes);
  const staleRouteCodes = staleSeedValues(seedDemoInventory.legacyRoutingRuleCodes, seedDemoInventory.currentRoutingRuleCodes);

  for (const category of scfcmsCategories) {
    categoryByCode[category.code] = await findOrCreateBy(ComplaintCategory, { code: category.code }, { ...category, active: true });
  }

  for (const office of offices) {
    officeByCode[office.code] = await findOrCreateBy(Office, { code: office.code }, { ...office, active: true });
  }

  for (const route of routeSeeds) {
    await findOrCreateBy(RoutingRule, { code: route.code }, {
      code: route.code,
      categoryId: categoryByCode[route.categoryCode].id,
      officeId: officeByCode[route.officeCode].id,
      location: route.location,
      priority: route.priority,
      slaDays: route.slaDays,
      active: true
    });
  }

  if (staleCategoryCodes.length) {
    await ComplaintCategory.update({ active: false }, { where: { code: { [Op.in]: staleCategoryCodes } } });
  }
  if (staleOfficeCodes.length) {
    await Office.update({ active: false }, { where: { code: { [Op.in]: staleOfficeCodes } } });
  }
  if (staleRouteCodes.length) {
    await RoutingRule.update({ active: false }, { where: { code: { [Op.in]: staleRouteCodes } } });
  }

  return { categoryByCode, officeByCode };
};

// Demo complaints are opt-in. A live sector portal is not a showroom: every case an officer
// opens has to be a real citizen waiting for an answer.
const caseTemplates = [
  {
    citizen: 0,
    category: 'citizen-services',
    description: 'I requested a service certificate ten days ago, but I have not received any clear update from the office.',
    cell: 'Kamatamu',
    village: 'Umucyo',
    status: 'Assigned',
    priority: 'High',
    daysAgo: 2
  }
];

const seedComplaintCases = async ({ categoryByCode, officeByCode, staffByOfficeCode }) => {
  const existingComplaints = await Complaint.count();
  if (existingComplaints > 0) return;

  const year = new Date().getFullYear();
  let sequence = 1;
  const auditRows = [];

  for (const template of caseTemplates) {
    const citizen = demoCitizens[template.citizen];
    const citizenRecord = await User.findOne({ where: { email: citizen.email } });
    const category = categoryByCode[template.category];
    const routeOfficeCode = routeSeeds.find((route) => route.categoryCode === template.category).officeCode;
    const office = officeByCode[routeOfficeCode];
    const staffMember = staffByOfficeCode[routeOfficeCode];

    const trackingNumber = `SCF-${year}-${String(sequence).padStart(4, '0')}`;
    sequence += 1;

    const createdAt = daysAgoIso(template.daysAgo, 8 + (sequence % 6), (sequence * 7) % 60);
    const dueDate = template.overdue ? daysAgoDate(1) : daysAheadDate(Math.max(1, category.slaDays - Math.floor(template.daysAgo / 2)));
    const resolvedAt = template.resolvedDaysAgo !== undefined ? daysAgoIso(template.resolvedDaysAgo, 11) : null;
    const closedAt = template.closedDaysAgo !== undefined ? daysAgoIso(template.closedDaysAgo, 16) : null;

    const complaint = await Complaint.create({
      trackingNumber,
      citizenId: citizenRecord.id,
      categoryId: category.id,
      officeId: office.id,
      citizenName: citizen.fullName,
      citizenPhone: citizen.phone,
      description: template.description,
      location: `${citizen.sector} Sector, ${citizen.district} District`,
      cell: template.cell,
      village: template.village,
      priority: template.priority,
      status: template.status,
      assignedTo: office.contactPerson,
      escalatedTo: template.escalatedTo || null,
      channel: template.channel || 'Web Portal',
      submissionMode: template.channel || 'Typed form',
      evidenceType: '',
      attachmentName: '',
      attachmentPath: '',
      dueDate,
      resolvedAt,
      closedAt,
      createdAt,
      updatedAt: closedAt || resolvedAt || createdAt
    });

    await ComplaintResponse.create({
      complaintId: complaint.id,
      responderId: null,
      responder: 'System',
      responseText: `Complaint received and automatically routed to ${office.name}.`,
      statusUpdate: 'Assigned',
      createdAt,
      updatedAt: createdAt
    });

    await ComplaintNotification.create({
      userId: citizenRecord.id,
      complaintId: complaint.id,
      title: 'Complaint submitted',
      message: `Your complaint ${trackingNumber} was received and assigned to ${office.name}.`,
      read: template.status !== 'Assigned',
      createdAt,
      updatedAt: createdAt
    });

    if (template.status !== 'Assigned') {
      const followUpAt = daysAgoIso(Math.max(0, template.daysAgo - 1), 13);
      const responseText = template.status === 'Escalated'
        ? (template.reason || `Case reviewed and escalated to ${template.escalatedTo} for urgent follow-up.`)
        : `Case reviewed by ${staffMember.fullName} and status updated to ${template.status}.`;

      await ComplaintResponse.create({
        complaintId: complaint.id,
        responderId: staffMember.id,
        responder: staffMember.fullName,
        responseText,
        statusUpdate: template.status,
        createdAt: followUpAt,
        updatedAt: followUpAt
      });

      const title = template.status === 'Escalated' ? 'Complaint escalated' : template.status === 'Closed' ? 'Complaint closed' : 'Complaint updated';
      const message = template.status === 'Escalated'
        ? `${trackingNumber} was escalated to ${template.escalatedTo}.`
        : `${trackingNumber} is now ${template.status}.`;

      await ComplaintNotification.create({
        userId: citizenRecord.id,
        complaintId: complaint.id,
        title,
        message,
        read: ['Closed', 'Resolved'].includes(template.status),
        createdAt: followUpAt,
        updatedAt: followUpAt
      });

      auditRows.push({
        actor: staffMember.fullName,
        action: template.status === 'Escalated' ? `Escalated complaint ${trackingNumber}` : `Updated complaint ${trackingNumber} to ${template.status}`,
        metadata: { entity: 'complaint', entityId: trackingNumber },
        createdAt: followUpAt,
        updatedAt: followUpAt
      });
    }

    if (template.rating) {
      const ratedAt = closedAt || daysAgoIso(Math.max(0, template.daysAgo - 2), 17);
      await SatisfactionRating.create({
        complaintId: complaint.id,
        score: template.rating.score,
        comment: template.rating.comment,
        ratedAt,
        createdAt: ratedAt,
        updatedAt: ratedAt
      });
      auditRows.push({
        actor: citizen.fullName,
        action: `Rated complaint ${trackingNumber} with ${template.rating.score} stars`,
        metadata: { entity: 'satisfaction_rating', entityId: trackingNumber },
        createdAt: ratedAt,
        updatedAt: ratedAt
      });
    }

    auditRows.push({
      actor: citizen.fullName,
      action: `Submitted complaint ${trackingNumber}`,
      metadata: { entity: 'complaint', entityId: trackingNumber },
      createdAt,
      updatedAt: createdAt
    });
  }

  await AuditLog.bulkCreate(auditRows);
};

// The tracking-number counter must start above whatever is already in the table, or the
// first new complaint would try to reuse SCF-2026-0001.
const syncTrackingCounter = async () => {
  const year = new Date().getFullYear();
  const key = `complaint-${year}`;
  const latest = await Complaint.findOne({
    where: { trackingNumber: { [Op.like]: `SCF-${year}-%` } },
    order: [['trackingNumber', 'DESC']]
  });
  const highest = latest ? Number(latest.trackingNumber.split('-').pop()) : 0;

  const [counter] = await Counter.findOrCreate({ where: { key }, defaults: { key, value: highest } });
  if (counter.value < highest) await counter.update({ value: highest });
};

export const seedDemoData = async () => {
  await seedUsers();
  const { categoryByCode, officeByCode } = await seedComplaintReferenceData();
  const staffByOfficeCode = await seedStaffUsers(officeByCode);
  if (process.env.DB_SEED_COMPLAINTS === 'true') {
    await seedComplaintCases({ categoryByCode, officeByCode, staffByOfficeCode });
  }
  await syncTrackingCounter();
};
