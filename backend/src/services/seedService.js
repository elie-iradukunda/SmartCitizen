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

const demoCitizens = [
  { fullName: 'Jean Uwimana', email: 'jean@smartcitizen.rw', phone: '+250 788 456 111', nationalId: '1199080012345678', gender: 'Female', province: 'Kigali City', district: 'Gasabo', sector: 'Kacyiru', cell: 'Kamatamu', village: 'Umucyo', address: 'Kamatamu / Umucyo', preferredLanguage: 'Kinyarwanda' },
  { fullName: 'Aline Umutoni', email: 'aline@smartcitizen.rw', phone: '+250 788 456 112', nationalId: '1199180012345678', gender: 'Female', province: 'Kigali City', district: 'Gasabo', sector: 'Kacyiru', cell: 'Kamatamu', village: 'Kamuhire', address: 'Kamatamu / Kamuhire', preferredLanguage: 'Kinyarwanda' },
  { fullName: 'Eric Habimana', email: 'eric.h@smartcitizen.rw', phone: '+250 788 456 113', nationalId: '1198880012345678', gender: 'Male', province: 'Kigali City', district: 'Gasabo', sector: 'Kacyiru', cell: 'Kamutwa', village: 'Rugando', address: 'Kamutwa / Rugando', preferredLanguage: 'English' },
  { fullName: 'Diane Ingabire', email: 'diane@smartcitizen.rw', phone: '+250 788 456 114', nationalId: '1199280012345678', gender: 'Female', province: 'Kigali City', district: 'Gasabo', sector: 'Kacyiru', cell: 'Kibaza', village: 'Virunga', address: 'Kibaza / Virunga', preferredLanguage: 'Kinyarwanda' },
  { fullName: 'Emmanuel Nkurunziza', email: 'emmanuel@smartcitizen.rw', phone: '+250 788 456 115', nationalId: '1198780012345678', gender: 'Male', province: 'Kigali City', district: 'Gasabo', sector: 'Kacyiru', cell: 'Kamutwa', village: 'Kacyiru', address: 'Kamutwa / Kacyiru', preferredLanguage: 'English' },
  { fullName: 'Grace Mukamana', email: 'grace@smartcitizen.rw', phone: '+250 788 456 116', nationalId: '1199380012345678', gender: 'Female', province: 'Kigali City', district: 'Gasabo', sector: 'Kacyiru', cell: 'Kibaza', village: 'Kibaza', address: 'Kibaza / Kibaza', preferredLanguage: 'Kinyarwanda' }
];

const demoStaff = [
  { fullName: 'Patrick Niyonsenga', email: 'staff@smartcitizen.rw', phone: '+250 788 456 222', gender: 'Male', officeCode: 'service-delivery' },
  { fullName: 'Claudine Uwase', email: 'claudine@smartcitizen.rw', phone: '+250 788 456 223', gender: 'Female', officeCode: 'responsible-service-unit' },
  { fullName: 'Eric Ndayisenga', email: 'eric.n@smartcitizen.rw', phone: '+250 788 456 224', gender: 'Male', officeCode: 'infrastructure-office' },
  { fullName: 'Beatrice Uwera', email: 'beatrice@smartcitizen.rw', phone: '+250 788 456 228', gender: 'Female', officeCode: 'water-sanitation-unit' },
  { fullName: 'Samuel Rukundo', email: 'samuel@smartcitizen.rw', phone: '+250 788 456 229', gender: 'Male', officeCode: 'land-housing-office' },
  { fullName: 'Nadine Iradukunda', email: 'nadine@smartcitizen.rw', phone: '+250 788 456 230', gender: 'Female', officeCode: 'health-social-affairs' },
  { fullName: 'Vincent Mugisha', email: 'vincent@smartcitizen.rw', phone: '+250 788 456 225', gender: 'Male', officeCode: 'safety-desk' },
  { fullName: 'Olivier Nshimiyimana', email: 'olivier@smartcitizen.rw', phone: '+250 788 456 231', gender: 'Male', officeCode: 'trade-cooperatives-desk' },
  { fullName: 'Josiane Mukeshimana', email: 'josiane@smartcitizen.rw', phone: '+250 788 456 232', gender: 'Female', officeCode: 'education-youth-office' },
  { fullName: 'Solange Umuhoza', email: 'solange@smartcitizen.rw', phone: '+250 788 456 226', gender: 'Female', officeCode: 'senior-administrator' },
  { fullName: 'Fabrice Ntwali', email: 'fabrice@smartcitizen.rw', phone: '+250 788 456 227', gender: 'Male', officeCode: 'customer-care-planning' }
].map((staff) => ({ ...staff, province: 'Kigali City', district: 'Gasabo', sector: 'Kacyiru', cell: 'Kamatamu', village: 'Umucyo', preferredLanguage: 'English' }));

const demoAdmins = [
  { fullName: 'Admin Manager', email: 'admin@smartcitizen.rw', phone: '+250 788 456 444', gender: 'Other' },
  { fullName: 'Alice Admin', email: 'alice.admin@smartcitizen.rw', phone: '+250 788 456 445', gender: 'Female' }
].map((admin) => ({ ...admin, province: 'Kigali City', district: 'Gasabo', sector: 'Kacyiru', cell: 'Kamatamu', village: 'Umucyo', preferredLanguage: 'English' }));

const scfcmsCategories = [
  { code: 'service-delay', name: 'Service Delay or Poor Service', description: 'Delayed service delivery or poor administrative response.', defaultPriority: 'High', slaDays: 3 },
  { code: 'documents', name: 'Document or Application Follow-up', description: 'National ID, certificate, permit, or application follow-up.', defaultPriority: 'Medium', slaDays: 5 },
  { code: 'infrastructure', name: 'Infrastructure or Environmental Concern', description: 'Road, drainage, lighting, water, sanitation, environment, or local works concern.', defaultPriority: 'High', slaDays: 4 },
  { code: 'water-sanitation', name: 'Water, Sanitation or Waste Collection', description: 'Public water access, sanitation, waste collection, drainage cleaning, and hygiene service concern.', defaultPriority: 'High', slaDays: 3 },
  { code: 'land-housing', name: 'Land, Housing or Construction Concern', description: 'Land records, construction permits, housing disputes, plots, or property-related follow-up.', defaultPriority: 'High', slaDays: 5 },
  { code: 'health-hygiene', name: 'Health, Hygiene or Public Nuisance', description: 'Community health, hygiene risks, public nuisance, noise, or conditions affecting public wellbeing.', defaultPriority: 'Medium', slaDays: 4 },
  { code: 'safety-community', name: 'Safety or Community Concern', description: 'Public safety, community security, or urgent neighborhood concern.', defaultPriority: 'High', slaDays: 3 },
  { code: 'market-trade', name: 'Market, Trade or Cooperative Service', description: 'Trading permits, market space, cooperative support, business service follow-up, or vendor concern.', defaultPriority: 'Medium', slaDays: 5 },
  { code: 'education-youth', name: 'Education, Youth or Social Support', description: 'School access, youth programs, vulnerable citizen support, or social affairs follow-up.', defaultPriority: 'Medium', slaDays: 5 },
  { code: 'misconduct', name: 'Misconduct or Corruption Allegation', description: 'Unfair treatment, misconduct, corruption concern, or sensitive complaint.', defaultPriority: 'Critical', slaDays: 2 },
  { code: 'feedback', name: 'Suggestion or General Feedback', description: 'Service suggestion, appreciation, feedback, or request for clarification.', defaultPriority: 'Low', slaDays: 7 }
];

const offices = [
  { code: 'service-delivery', name: 'Service Delivery Office', contactPerson: 'Patrick Niyonsenga', phone: '+250 788 300 101', email: 'service.office@kacyiru.gov.rw' },
  { code: 'responsible-service-unit', name: 'Responsible Service Unit', contactPerson: 'Claudine Uwase', phone: '+250 788 300 102', email: 'service.unit@kacyiru.gov.rw' },
  { code: 'infrastructure-office', name: 'Infrastructure Office', contactPerson: 'Eric Ndayisenga', phone: '+250 788 300 103', email: 'infrastructure@kacyiru.gov.rw' },
  { code: 'water-sanitation-unit', name: 'Water and Sanitation Unit', contactPerson: 'Beatrice Uwera', phone: '+250 788 300 106', email: 'water.sanitation@kacyiru.gov.rw' },
  { code: 'land-housing-office', name: 'Land and Housing Office', contactPerson: 'Samuel Rukundo', phone: '+250 788 300 107', email: 'land.housing@kacyiru.gov.rw' },
  { code: 'health-social-affairs', name: 'Health and Social Affairs Office', contactPerson: 'Nadine Iradukunda', phone: '+250 788 300 108', email: 'health.social@kacyiru.gov.rw' },
  { code: 'safety-desk', name: 'Security or Community Safety Desk', contactPerson: 'Vincent Mugisha', phone: '+250 788 300 104', email: 'safety@kacyiru.gov.rw' },
  { code: 'trade-cooperatives-desk', name: 'Trade and Cooperatives Desk', contactPerson: 'Olivier Nshimiyimana', phone: '+250 788 300 109', email: 'trade.cooperatives@kacyiru.gov.rw' },
  { code: 'education-youth-office', name: 'Education and Youth Office', contactPerson: 'Josiane Mukeshimana', phone: '+250 788 300 110', email: 'education.youth@kacyiru.gov.rw' },
  { code: 'senior-administrator', name: 'Senior Administrator', contactPerson: 'Solange Umuhoza', phone: '+250 788 300 100', email: 'senior.admin@kacyiru.gov.rw' },
  { code: 'customer-care-planning', name: 'Customer Care or Planning Office', contactPerson: 'Fabrice Ntwali', phone: '+250 788 300 105', email: 'customer.care@kacyiru.gov.rw' }
];

const routeSeeds = [
  { code: 'route-service-delay', categoryCode: 'service-delay', officeCode: 'service-delivery', location: 'Kacyiru', priority: 'High', slaDays: 3 },
  { code: 'route-documents', categoryCode: 'documents', officeCode: 'responsible-service-unit', location: 'Kacyiru', priority: 'Medium', slaDays: 5 },
  { code: 'route-infrastructure', categoryCode: 'infrastructure', officeCode: 'infrastructure-office', location: 'Kacyiru', priority: 'High', slaDays: 4 },
  { code: 'route-water-sanitation', categoryCode: 'water-sanitation', officeCode: 'water-sanitation-unit', location: 'Kacyiru', priority: 'High', slaDays: 3 },
  { code: 'route-land-housing', categoryCode: 'land-housing', officeCode: 'land-housing-office', location: 'Kacyiru', priority: 'High', slaDays: 5 },
  { code: 'route-health-hygiene', categoryCode: 'health-hygiene', officeCode: 'health-social-affairs', location: 'Kacyiru', priority: 'Medium', slaDays: 4 },
  { code: 'route-safety-community', categoryCode: 'safety-community', officeCode: 'safety-desk', location: 'Kacyiru', priority: 'High', slaDays: 3 },
  { code: 'route-market-trade', categoryCode: 'market-trade', officeCode: 'trade-cooperatives-desk', location: 'Kacyiru', priority: 'Medium', slaDays: 5 },
  { code: 'route-education-youth', categoryCode: 'education-youth', officeCode: 'education-youth-office', location: 'Kacyiru', priority: 'Medium', slaDays: 5 },
  { code: 'route-misconduct', categoryCode: 'misconduct', officeCode: 'senior-administrator', location: 'Kacyiru', priority: 'Critical', slaDays: 2 },
  { code: 'route-feedback', categoryCode: 'feedback', officeCode: 'customer-care-planning', location: 'Kacyiru', priority: 'Low', slaDays: 7 }
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

const seedUsers = async () => {
  for (const citizen of demoCitizens) {
    await findOrCreateBy(User, { email: citizen.email }, { ...citizen, password: 'password', role: 'citizen', status: 'active' });
  }
  for (const admin of demoAdmins) {
    await findOrCreateBy(User, { email: admin.email }, { ...admin, password: 'password', role: 'admin', status: 'active' });
  }
};

const seedStaffUsers = async (officeByCode) => {
  const staffByOfficeCode = {};
  for (const staff of demoStaff) {
    const office = officeByCode[staff.officeCode];
    const { officeCode, ...profile } = staff;
    const record = await findOrCreateBy(
      User,
      { email: staff.email },
      { ...profile, password: 'password', role: 'staff', status: 'active', officeId: office.id }
    );
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

// Each template: which citizen/category/office, how many days ago it was submitted, current
// status, priority, and whether it is overdue/escalated/rated - designed to give every status,
// every category, and a realistic satisfaction-rating spread for reports/dashboards/screenshots.
const caseTemplates = [
  { citizen: 0, category: 'service-delay', description: 'I requested a service certificate ten days ago, but I have not received any clear update from the office.', cell: 'Kamatamu', village: 'Umucyo', status: 'Assigned', priority: 'High', daysAgo: 2 },
  { citizen: 1, category: 'service-delay', description: 'My request for a residency confirmation letter has been pending for over a week with no communication.', cell: 'Kamatamu', village: 'Ubumwe', status: 'In Review', priority: 'High', daysAgo: 4 },
  { citizen: 4, category: 'service-delay', description: 'I visited the sector office three times for a small business permit and each time I was told to come back later.', cell: 'Kamutwa', village: 'Kacyiru', status: 'Waiting for Citizen', priority: 'Medium', daysAgo: 6 },
  { citizen: 2, category: 'service-delay', description: 'Service counter closed early without notice for the third time this month, wasting my travel time.', cell: 'Kamatamu', village: 'Umucyo', status: 'Escalated', priority: 'Critical', daysAgo: 9, escalatedTo: 'Sector Executive Office', overdue: true },

  { citizen: 0, category: 'documents', description: 'My document application was approved online, but I was not told where to collect it.', cell: 'Kamutwa', village: 'Rugando', status: 'Closed', priority: 'Medium', daysAgo: 8, resolvedDaysAgo: 6, closedDaysAgo: 6, rating: { score: 4, comment: 'The answer was clear and I received the document.' } },
  { citizen: 3, category: 'documents', description: 'I need a certified copy of my land ownership document but the online portal keeps rejecting my upload.', cell: 'Kibaza', village: 'Virunga', status: 'In Review', priority: 'Medium', daysAgo: 3 },
  { citizen: 5, category: 'documents', description: 'My birth certificate correction request has been sitting without any status update for two weeks.', cell: 'Kamatamu', village: 'Umucyo', status: 'Assigned', priority: 'Medium', daysAgo: 1 },

  { citizen: 1, category: 'infrastructure', description: 'Drainage near the market is blocked and rain water enters nearby shops every time it rains.', cell: 'Kamatamu', village: 'Agatare', status: 'Escalated', priority: 'Critical', daysAgo: 5, escalatedTo: 'Sector Executive Office', overdue: true },
  { citizen: 2, category: 'infrastructure', description: 'Street lighting along the main road has been off for two weeks, creating safety concerns at night.', cell: 'Kamutwa', village: 'Rugando', status: 'In Review', priority: 'High', daysAgo: 4 },
  { citizen: 4, category: 'infrastructure', description: 'A pothole on the feeder road has grown large enough to damage motorbikes and cause accidents.', cell: 'Kamutwa', village: 'Kacyiru', status: 'Resolved', priority: 'High', daysAgo: 10, resolvedDaysAgo: 2 },
  { citizen: 0, category: 'infrastructure', description: 'The public water tap in our village has been leaking continuously for a month, wasting water.', cell: 'Kamatamu', village: 'Umucyo', status: 'Closed', priority: 'Medium', daysAgo: 12, resolvedDaysAgo: 4, closedDaysAgo: 3, rating: { score: 5, comment: 'Repaired quickly after the visit from the infrastructure office.' } },

  { citizen: 5, category: 'water-sanitation', description: 'Waste has not been collected on our street this week and it is affecting hygiene around nearby homes.', cell: 'Kibaza', village: 'Kibaza', status: 'Assigned', priority: 'High', daysAgo: 1, channel: 'Voice Assisted' },
  { citizen: 2, category: 'land-housing', description: 'A construction activity near our plot appears to be blocking access to the shared path and needs inspection.', cell: 'Kamutwa', village: 'Rugando', status: 'In Review', priority: 'High', daysAgo: 3 },
  { citizen: 3, category: 'health-hygiene', description: 'There is a noisy public nuisance near the residential area late at night and families are requesting follow-up.', cell: 'Kibaza', village: 'Virunga', status: 'Waiting for Citizen', priority: 'Medium', daysAgo: 2 },
  { citizen: 4, category: 'market-trade', description: 'I requested guidance on renewing a small trader permit but have not received a clear answer yet.', cell: 'Kamutwa', village: 'Kacyiru', status: 'Assigned', priority: 'Medium', daysAgo: 1 },
  { citizen: 1, category: 'education-youth', description: 'Youth program registration details are unclear and several applicants need information about next steps.', cell: 'Kamatamu', village: 'Kamuhire', status: 'Resolved', priority: 'Medium', daysAgo: 6, resolvedDaysAgo: 1 },

  { citizen: 3, category: 'safety-community', description: 'Unlit alleyway near the school has become a security risk for children walking home in the evening.', cell: 'Kibaza', village: 'Virunga', status: 'Assigned', priority: 'High', daysAgo: 1 },
  { citizen: 5, category: 'safety-community', description: 'Reported a group causing disturbances near the trading center late at night, community members are worried.', cell: 'Kamatamu', village: 'Umucyo', status: 'In Review', priority: 'High', daysAgo: 3 },
  { citizen: 2, category: 'safety-community', description: 'A damaged fence around the construction site poses a danger to pedestrians and children in the area.', cell: 'Kamutwa', village: 'Rugando', status: 'Closed', priority: 'High', daysAgo: 15, resolvedDaysAgo: 5, closedDaysAgo: 4, rating: { score: 3, comment: 'Took a while, but the fence was eventually repaired.' } },

  { citizen: 1, category: 'misconduct', description: 'A staff member requested an unofficial payment before processing my application, which I refused.', cell: 'Kamatamu', village: 'Ubumwe', status: 'Escalated', priority: 'Critical', daysAgo: 6, escalatedTo: 'Sector Executive Office', overdue: true },
  { citizen: 4, category: 'misconduct', description: 'I was treated rudely and dismissed without explanation when I asked about my file status.', cell: 'Kamutwa', village: 'Kacyiru', status: 'In Review', priority: 'Critical', daysAgo: 2 },
  { citizen: 0, category: 'misconduct', description: 'I want to raise a concern about inconsistent application of service fees between different officers.', cell: 'Kamatamu', village: 'Umucyo', status: 'Closed', priority: 'High', daysAgo: 11, resolvedDaysAgo: 3, closedDaysAgo: 2, rating: { score: 4, comment: 'The senior administrator followed up and clarified the fee policy.' } },

  { citizen: 3, category: 'feedback', description: 'Suggesting that the office publishes weekly opening hours online to reduce unnecessary visits.', cell: 'Kibaza', village: 'Virunga', status: 'Assigned', priority: 'Low', daysAgo: 1 },
  { citizen: 5, category: 'feedback', description: 'I appreciate the new queue numbering system introduced at the front desk, it saved a lot of time.', cell: 'Kamatamu', village: 'Umucyo', status: 'Closed', priority: 'Low', daysAgo: 7, resolvedDaysAgo: 5, closedDaysAgo: 5, rating: { score: 5, comment: 'Great improvement, thank you.' } },
  { citizen: 2, category: 'feedback', description: 'Requesting clearer signage at the entrance so first-time visitors know which counter to use.', cell: 'Kamutwa', village: 'Rugando', status: 'Resolved', priority: 'Low', daysAgo: 5, resolvedDaysAgo: 1 }
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

export const seedDemoData = async () => {
  await seedUsers();
  const { categoryByCode, officeByCode } = await seedComplaintReferenceData();
  const staffByOfficeCode = await seedStaffUsers(officeByCode);
  await seedComplaintCases({ categoryByCode, officeByCode, staffByOfficeCode });
};
