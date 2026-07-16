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
  { fullName: 'Jean Uwimana', email: 'jean@smartcitizen.rw', phone: '+250 788 456 111', nationalId: '1199080012345678', gender: 'Female', province: 'Kigali City', district: 'Gasabo', sector: 'Kacyiru', cell: 'Kamatamu', village: 'Umucyo', address: 'Kamatamu / Umucyo', preferredLanguage: 'Kinyarwanda' },
  { fullName: 'Aline Umutoni', email: 'aline@smartcitizen.rw', phone: '+250 788 456 112', nationalId: '1199180012345678', gender: 'Female', province: 'Kigali City', district: 'Gasabo', sector: 'Kacyiru', cell: 'Kamatamu', village: 'Kamuhire', address: 'Kamatamu / Kamuhire', preferredLanguage: 'Kinyarwanda' },
  { fullName: 'Eric Habimana', email: 'eric.h@smartcitizen.rw', phone: '+250 788 456 113', nationalId: '1198880012345678', gender: 'Male', province: 'Kigali City', district: 'Gasabo', sector: 'Kacyiru', cell: 'Kamutwa', village: 'Rugando', address: 'Kamutwa / Rugando', preferredLanguage: 'English' },
  { fullName: 'Diane Ingabire', email: 'diane@smartcitizen.rw', phone: '+250 788 456 114', nationalId: '1199280012345678', gender: 'Female', province: 'Kigali City', district: 'Gasabo', sector: 'Kacyiru', cell: 'Kibaza', village: 'Virunga', address: 'Kibaza / Virunga', preferredLanguage: 'Kinyarwanda' },
  { fullName: 'Emmanuel Nkurunziza', email: 'emmanuel@smartcitizen.rw', phone: '+250 788 456 115', nationalId: '1198780012345678', gender: 'Male', province: 'Kigali City', district: 'Gasabo', sector: 'Kacyiru', cell: 'Kamutwa', village: 'Kacyiru', address: 'Kamutwa / Kacyiru', preferredLanguage: 'English' },
  { fullName: 'Grace Mukamana', email: 'grace@smartcitizen.rw', phone: '+250 788 456 116', nationalId: '1199380012345678', gender: 'Female', province: 'Kigali City', district: 'Gasabo', sector: 'Kacyiru', cell: 'Kibaza', village: 'Kibaza', address: 'Kibaza / Kibaza', preferredLanguage: 'Kinyarwanda' }
];

const demoStaff = [
  { fullName: 'Patrick Niyonsenga', email: 'staff@smartcitizen.rw', phone: '+250 788 456 222', gender: 'Male', officeCode: 'citizen-services-office' },
  { fullName: 'Eric Ndayisenga', email: 'eric.n@smartcitizen.rw', phone: '+250 788 456 224', gender: 'Male', officeCode: 'infrastructure-sanitation-office' },
  { fullName: 'Samuel Rukundo', email: 'samuel@smartcitizen.rw', phone: '+250 788 456 229', gender: 'Male', officeCode: 'land-housing-construction-office' },
  { fullName: 'Vincent Mugisha', email: 'vincent@smartcitizen.rw', phone: '+250 788 456 225', gender: 'Male', officeCode: 'community-safety-health-office' },
  { fullName: 'Solange Umuhoza', email: 'solange@smartcitizen.rw', phone: '+250 788 456 226', gender: 'Female', officeCode: 'governance-accountability-office' },
  { fullName: 'Claudine Mukamana', email: 'executive@smartcitizen.rw', phone: '+250 788 456 227', gender: 'Female', officeCode: 'sector-executive-office' }
].map((staff) => ({ ...staff, province: 'Kigali City', district: 'Gasabo', sector: 'Kacyiru', cell: 'Kamatamu', village: 'Umucyo', preferredLanguage: 'English' }));

const demoAdmins = [
  { fullName: 'Admin Manager', email: 'admin@smartcitizen.rw', phone: '+250 788 456 444', gender: 'Other' },
  { fullName: 'Alice Admin', email: 'alice.admin@smartcitizen.rw', phone: '+250 788 456 445', gender: 'Female' }
].map((admin) => ({ ...admin, province: 'Kigali City', district: 'Gasabo', sector: 'Kacyiru', cell: 'Kamatamu', village: 'Umucyo', preferredLanguage: 'English' }));

const scfcmsCategories = [
  { code: 'citizen-services', name: 'Citizen Services and Documents', description: 'Delayed services, civil documents, certificates, permits, applications, and front-desk support.', defaultPriority: 'High', slaDays: 3 },
  { code: 'infrastructure-sanitation', name: 'Infrastructure, Water and Sanitation', description: 'Roads, drainage, street lights, public water, waste collection, sanitation, and environmental concerns.', defaultPriority: 'High', slaDays: 4 },
  { code: 'land-housing-construction', name: 'Land, Housing and Construction', description: 'Land records, plots, construction permits, housing disputes, and property-related concerns.', defaultPriority: 'High', slaDays: 5 },
  { code: 'community-safety-health', name: 'Community Safety, Health and Social Welfare', description: 'Security, community safety, public health, hygiene, youth, education, and social support concerns.', defaultPriority: 'High', slaDays: 3 },
  { code: 'governance-accountability', name: 'Governance, Misconduct and Feedback', description: 'Misconduct, corruption, unfair treatment, appeals, appreciation, suggestions, and general feedback.', defaultPriority: 'Critical', slaDays: 2 }
];

// The last office is the escalation target: every overdue or badly-rated case lands there,
// which is what stops an ignored complaint from sitting in one office forever.
const offices = [
  { code: 'citizen-services-office', name: 'Citizen Services and Documentation Office', contactPerson: 'Patrick Niyonsenga', phone: '+250 788 300 101', email: 'citizen.services@kacyiru.gov.rw' },
  { code: 'infrastructure-sanitation-office', name: 'Infrastructure, Water and Sanitation Office', contactPerson: 'Eric Ndayisenga', phone: '+250 788 300 103', email: 'infrastructure.sanitation@kacyiru.gov.rw' },
  { code: 'land-housing-construction-office', name: 'Land, Housing and Construction Office', contactPerson: 'Samuel Rukundo', phone: '+250 788 300 107', email: 'land.construction@kacyiru.gov.rw' },
  { code: 'community-safety-health-office', name: 'Community Safety, Health and Social Welfare Office', contactPerson: 'Vincent Mugisha', phone: '+250 788 300 104', email: 'community.safety@kacyiru.gov.rw' },
  { code: 'governance-accountability-office', name: 'Governance and Accountability Office', contactPerson: 'Solange Umuhoza', phone: '+250 788 300 100', email: 'accountability@kacyiru.gov.rw' },
  { code: 'sector-executive-office', name: 'Sector Executive Office', contactPerson: 'Claudine Mukamana', phone: '+250 788 300 111', email: 'executive@kacyiru.gov.rw', isSectorExecutive: true }
];

const routeSeeds = [
  { code: 'route-citizen-services', categoryCode: 'citizen-services', officeCode: 'citizen-services-office', location: 'Kacyiru', priority: 'High', slaDays: 3 },
  { code: 'route-infrastructure-sanitation', categoryCode: 'infrastructure-sanitation', officeCode: 'infrastructure-sanitation-office', location: 'Kacyiru', priority: 'High', slaDays: 4 },
  { code: 'route-land-housing-construction', categoryCode: 'land-housing-construction', officeCode: 'land-housing-construction-office', location: 'Kacyiru', priority: 'High', slaDays: 5 },
  { code: 'route-community-safety-health', categoryCode: 'community-safety-health', officeCode: 'community-safety-health-office', location: 'Kacyiru', priority: 'High', slaDays: 3 },
  { code: 'route-governance-accountability', categoryCode: 'governance-accountability', officeCode: 'governance-accountability-office', location: 'Kacyiru', priority: 'Critical', slaDays: 2 }
];

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
  const activeCategoryCodes = scfcmsCategories.map((category) => category.code);
  const activeOfficeCodes = offices.map((office) => office.code);
  const activeRouteCodes = routeSeeds.map((route) => route.code);

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

  await ComplaintCategory.update({ active: false }, { where: { code: { [Op.notIn]: activeCategoryCodes } } });
  await Office.update({ active: false }, { where: { code: { [Op.notIn]: activeOfficeCodes } } });
  await RoutingRule.update({ active: false }, { where: { code: { [Op.notIn]: activeRouteCodes } } });

  return { categoryByCode, officeByCode };
};

// One worked example, nothing more. A live sector portal is not a showroom: every case an
// officer opens has to be a real citizen waiting for an answer, so the seed leaves a single
// Assigned complaint that the whole flow can be walked through on, and stops there.
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
  await seedComplaintCases({ categoryByCode, officeByCode, staffByOfficeCode });
  await syncTrackingCounter();
};
