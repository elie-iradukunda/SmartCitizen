// End-to-end cover for the rules the sector actually runs on: who may register, who may
// answer a case, who may close it, and what the public is allowed to see.
//
// It drives the real services against an in-memory SQLite database, so it needs the sqlite3
// devDependency. MySQL is left completely alone - running the suite never touches it.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_DIALECT = 'sqlite';
process.env.DB_SEED = 'false';
process.env.DB_SYNC = 'false';
process.env.JWT_SECRET = 'test-secret';

const { sequelize, User, Office, ComplaintCategory, RoutingRule, ComplaintNotification, Complaint } = await import('../src/models/index.js');
const { complaintService } = await import('../src/services/complaintService.js');
const { authService } = await import('../src/services/authService.js');
const { adminService } = await import('../src/services/adminService.js');

const ctx = {};

// Rejecting for the right reason matters: a test that only asserts "it threw" would still
// pass if the call blew up on a typo.
const rejects = (promise, message) => assert.rejects(promise, (error) => {
  assert.match(error.message, message);
  return true;
});

before(async () => {
  await sequelize.sync({ force: true });

  ctx.roads = await Office.create({ code: 'roads', name: 'Infrastructure Office', contactPerson: 'Eng. Uwase' });
  ctx.sectorExec = await Office.create({ code: 'sector-exec', name: 'Sector Executive Office', contactPerson: 'Exec. Mugabo', isSectorExecutive: true });
  ctx.health = await Office.create({ code: 'health', name: 'Health Office', contactPerson: 'Dr. Keza' });

  ctx.infraCat = await ComplaintCategory.create({ code: 'infrastructure-sanitation', name: 'Infrastructure & Sanitation', slaDays: 3 });
  ctx.healthCat = await ComplaintCategory.create({ code: 'community-safety-health', name: 'Community Safety & Health', slaDays: 5 });
  await RoutingRule.create({ code: 'r-infra', categoryId: ctx.infraCat.id, officeId: ctx.roads.id, location: 'Kacyiru', priority: 'High', slaDays: 3 });
  await RoutingRule.create({ code: 'r-health', categoryId: ctx.healthCat.id, officeId: ctx.health.id, location: 'Kacyiru', priority: 'Medium', slaDays: 5 });

  ctx.admin = await User.create({ fullName: 'Sector Admin', email: 'admin@t.rw', password: 'x', role: 'admin' });
});

after(async () => sequelize.close());

const validCitizen = {
  fullName: 'Jean Uwase',
  email: 'jean@t.rw',
  password: 'secret123',
  phone: '+250788111222',
  nationalId: '1199 0800 1234 5678',
  cell: 'Kamatamu',
  village: 'Ubumwe',
  sector: 'Kacyiru'
};

test('a citizen must supply name, email, phone, cell, village, sector and National ID', async () => {
  const without = (field) => {
    const payload = { ...validCitizen };
    delete payload[field];
    return payload;
  };

  await rejects(authService.register(without('nationalId')), /National ID/);
  await rejects(authService.register(without('phone')), /Phone number/);
  await rejects(authService.register(without('cell')), /Cell/);
  await rejects(authService.register(without('village')), /Village/);
  await rejects(authService.register(without('sector')), /Sector/);
});

test('the National ID must be 16 digits, and it identifies exactly one account', async () => {
  await rejects(authService.register({ ...validCitizen, nationalId: '119908001234567' }), /16 digits/);
  await rejects(authService.register({ ...validCitizen, nationalId: 'ABCD00801234567X' }), /16 digits/);

  const registered = await authService.register(validCitizen);
  ctx.citizen = await User.findByPk(registered.id);

  assert.equal(registered.role, 'citizen');
  // Stored without the spacing the citizen copies off the card, so the duplicate check below
  // cannot be walked around by typing the same ID a different way.
  assert.equal(registered.nationalId, '1199080012345678');
  assert.equal(registered.cell, 'Kamatamu');
  assert.equal(registered.village, 'Ubumwe');
  assert.equal(registered.sector, 'Kacyiru');

  await rejects(
    authService.register({ ...validCitizen, email: 'other@t.rw', nationalId: '1199 0800 1234 5678' }),
    /National ID already exists/
  );
  await rejects(authService.register({ ...validCitizen, nationalId: '1199080012345679' }), /email already exists/);
});

test('a registered citizen can log in, and the password is never stored in the clear', async () => {
  const user = await authService.login('jean@t.rw', 'secret123');
  assert.equal(user.id, ctx.citizen.id);
  await rejects(authService.login('jean@t.rw', 'wrong'), /Wrong email or password/);
  assert.ok((await User.findByPk(ctx.citizen.id)).password.startsWith('$2'));
});

test('password reset tokens are shown only in local demo mode', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousSmtpHost = process.env.SMTP_HOST;
  const previousSmtpUser = process.env.SMTP_USER;
  const previousSmtpPass = process.env.SMTP_PASS;

  try {
    delete process.env.NODE_ENV;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    const local = await authService.forgotPassword('jean@t.rw');
    assert.ok(local.resetLink, 'local demo mode shows the one-use reset link');
    assert.ok(local.token, 'local demo mode shows the token because no mail server exists');

    await authService.resetPassword({ email: 'jean@t.rw', token: local.token, password: 'secret456' });
    await authService.login('jean@t.rw', 'secret456');
    await rejects(
      authService.resetPassword({ email: 'jean@t.rw', token: local.token, password: 'secret789' }),
      /invalid or has expired/
    );

    process.env.NODE_ENV = 'production';
    const production = await authService.forgotPassword('jean@t.rw');
    assert.equal(production.resetLink, undefined);
    assert.equal(production.token, undefined);
    assert.equal(production.expiresInMinutes, 30);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousSmtpHost === undefined) delete process.env.SMTP_HOST;
    else process.env.SMTP_HOST = previousSmtpHost;
    if (previousSmtpUser === undefined) delete process.env.SMTP_USER;
    else process.env.SMTP_USER = previousSmtpUser;
    if (previousSmtpPass === undefined) delete process.env.SMTP_PASS;
    else process.env.SMTP_PASS = previousSmtpPass;
  }
});

test('the admin creates accounts, sets roles, and gives every leader a department', async () => {
  await rejects(
    adminService.createUser({ fullName: 'No Office', email: 'no@t.rw', password: 'secret123', role: 'staff' }),
    /linked to a responsible office/
  );
  await rejects(
    adminService.createUser({ fullName: 'Mayor', email: 'mayor@t.rw', password: 'secret123', role: 'superuser' }),
    /Only Citizen, Administrative Staff, and Admin/
  );
  await rejects(
    adminService.createUser({ fullName: 'No ID', email: 'noid@t.rw', password: 'secret123', role: 'citizen' }),
    /National ID/
  );

  const roadsStaff = await adminService.createUser({
    fullName: 'Eng. Uwase', email: 'eng@t.rw', password: 'secret123', role: 'staff', officeId: ctx.roads.id
  });
  const healthStaff = await adminService.createUser({
    fullName: 'Dr. Keza', email: 'dr@t.rw', password: 'secret123', role: 'staff', officeId: ctx.health.id
  });
  const sectorStaff = await adminService.createUser({
    fullName: 'Exec. Mugabo', email: 'exec@t.rw', password: 'secret123', role: 'staff', officeId: ctx.sectorExec.id
  });
  assert.equal(roadsStaff.office.name, 'Infrastructure Office');
  assert.equal(healthStaff.office.name, 'Health Office');
  assert.equal(sectorStaff.office.name, 'Sector Executive Office');

  const moved = await adminService.updateUser(healthStaff.id, { officeId: ctx.roads.id });
  assert.equal(moved.office.name, 'Infrastructure Office');
  await adminService.updateUser(healthStaff.id, { officeId: ctx.health.id });

  assert.ok(!JSON.stringify(await adminService.users()).includes('password'));

  ctx.roadsStaff = await User.findByPk(roadsStaff.id);
  ctx.healthStaff = await User.findByPk(healthStaff.id);
  ctx.sectorStaff = await User.findByPk(sectorStaff.id);
});

test('a complaint can be sent as text, as voice, as both, or as an uploaded document', async () => {
  ctx.typed = await complaintService.create({ type: ctx.infraCat.id, description: 'Amazi yacitse mu mudugudu' }, ctx.citizen, {});
  assert.match(ctx.typed.trackingNumber, /^SCF-\d{4}-\d{4}$/);

  ctx.voiced = await complaintService.create(
    { type: ctx.infraCat.id, description: '' },
    ctx.citizen,
    { voiceNote: { originalname: 'voice.webm', filename: 'v1.webm', mimetype: 'audio/webm' } }
  );
  assert.equal(ctx.voiced.voiceNotePath, '/uploads/v1.webm');
  // A voice complaint still needs something readable in the case list.
  assert.equal(ctx.voiced.description, 'Voice complaint recorded by citizen.');

  ctx.both = await complaintService.create(
    { type: ctx.infraCat.id, description: 'Reba iyi foto' },
    ctx.citizen,
    {
      voiceNote: { originalname: 'v.webm', filename: 'v2.webm', mimetype: 'audio/webm' },
      attachment: { originalname: 'proof.jpg', filename: 'p1.jpg', mimetype: 'image/jpeg' }
    }
  );
  assert.ok(ctx.both.voiceNotePath && ctx.both.attachmentPath);
  assert.equal(ctx.both.evidenceType, 'image');

  ctx.withDoc = await complaintService.create(
    { type: ctx.infraCat.id, description: 'Dosiye' },
    ctx.citizen,
    {
      attachment: {
        originalname: 'doc.docx',
        filename: 'd1.docx',
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      }
    }
  );
  assert.equal(ctx.withDoc.evidenceType, 'document');
});

test('the category decides the department, and only that department is notified', async () => {
  assert.equal(ctx.typed.assignedOffice, 'Infrastructure Office');

  ctx.healthCase = await complaintService.create({ type: ctx.healthCat.id, description: 'Ivuriro ntirikora' }, ctx.citizen, {});
  assert.equal(ctx.healthCase.assignedOffice, 'Health Office');
  assert.ok(ctx.healthCase.dueDate, 'the routing rule sets the SLA due date');

  const healthNotes = await ComplaintNotification.findAll({
    where: { userId: ctx.healthStaff.id, title: 'New complaint assigned' }
  });
  assert.equal(healthNotes.length, 1, 'the health leader hears only about the health case');
  assert.match(healthNotes[0].message, new RegExp(ctx.healthCase.trackingNumber));

  const roadsNotes = await ComplaintNotification.count({
    where: { userId: ctx.roadsStaff.id, title: 'New complaint assigned' }
  });
  assert.equal(roadsNotes, 4, 'the infrastructure leader hears about every infrastructure case');
});

test('a leader cannot act on a case belonging to another department', async () => {
  const tn = ctx.typed.trackingNumber;
  await rejects(complaintService.update(tn, { status: 'In Review', responseText: 'x' }, ctx.healthStaff), /their department/);
  await rejects(complaintService.escalate(tn, {}, ctx.healthStaff), /their department/);
  await rejects(complaintService.sendMessage(tn, { body: 'x' }, ctx.healthStaff), /private/);

  // Viewing stays open on purpose: the restriction is on answering, not on transparency.
  assert.equal((await complaintService.find(tn, ctx.healthStaff)).trackingNumber, tn);

  const scoped = await complaintService.list({}, ctx.healthStaff);
  assert.ok(scoped.every((complaint) => complaint.assignedOffice === 'Health Office'));
});

test('the chat opens on the leader\'s first reply and then runs both ways', async () => {
  const tn = ctx.typed.trackingNumber;

  assert.equal((await complaintService.find(tn, ctx.citizen)).chatOpen, false);
  await rejects(complaintService.sendMessage(tn, { body: 'Muraho' }, ctx.citizen), /opens as soon as/);

  let live = await complaintService.update(tn, { status: 'In Review', responseText: 'Turabikurikirana.' }, ctx.roadsStaff);
  assert.equal(live.chatOpen, true);
  assert.equal(live.messages.length, 1, 'the official answer becomes the first message');
  assert.equal(live.messages[0].senderRole, 'staff');

  live = await complaintService.sendMessage(tn, { body: 'Ni ryari bizakemuka?' }, ctx.citizen);
  assert.equal(live.messages.length, 2);
  live = await complaintService.sendMessage(tn, { body: 'Mu minsi 2.' }, ctx.roadsStaff);
  assert.equal(live.messages.length, 3);

  await rejects(complaintService.sendMessage(tn, { body: '   ' }, ctx.citizen), /Write a message/);

  assert.equal(await ComplaintNotification.count({ where: { userId: ctx.citizen.id, title: 'New message on your complaint' } }), 1);
  assert.equal(await ComplaintNotification.count({ where: { userId: ctx.roadsStaff.id, title: 'New message from citizen' } }), 1);

  assert.equal((await complaintService.find(tn, ctx.citizen)).unreadMessages, 2);
  await complaintService.messages(tn, ctx.citizen);
  assert.equal((await complaintService.find(tn, ctx.citizen)).unreadMessages, 0, 'opening the thread clears the badge');
});

test('a leader can send the first feedback message without changing the case status', async () => {
  const tn = ctx.healthCase.trackingNumber;
  const live = await complaintService.sendMessage(tn, { body: 'Twakiriye ikibazo cyawe, turagikurikirana.' }, ctx.healthStaff);
  const row = await Complaint.findOne({ where: { trackingNumber: tn } });

  assert.equal(live.chatOpen, true);
  assert.equal(live.status, 'Assigned');
  assert.equal(live.messages.length, 1);
  assert.equal(live.messages[0].senderRole, 'staff');
  assert.equal(await ComplaintNotification.count({
    where: { userId: ctx.citizen.id, complaintId: row.id, title: 'New message on your complaint' }
  }), 1);
});

test('the chat is private to the citizen and the department holding the case', async () => {
  const tn = ctx.typed.trackingNumber;

  const outsider = await complaintService.find(tn, ctx.healthStaff);
  assert.equal(outsider.messages.length, 0);
  assert.equal(outsider.chatRedacted, true, 'another department sees that a chat exists, not what it says');
  await rejects(complaintService.messages(tn, ctx.healthStaff), /private/);

  assert.equal((await complaintService.find(tn, ctx.admin)).messages.length, 3, 'the admin keeps oversight');

  const neighbour = await User.create({
    fullName: 'Nosy Neighbour', email: 'nosy@t.rw', password: 'x', role: 'citizen', nationalId: '1199080012349999'
  });
  await rejects(complaintService.find(tn, neighbour), /not found/);
});

test('only the citizen can close a case, and closing publishes their feedback', async () => {
  const tn = ctx.typed.trackingNumber;

  const resolved = await complaintService.update(tn, { status: 'Resolved', responseText: 'Umuyoboro wasanwe.' }, ctx.roadsStaff);
  assert.equal(resolved.status, 'Resolved');

  // The whole point of the flow: an office cannot sign off its own work.
  await rejects(complaintService.update(tn, { status: 'Closed', responseText: 'done' }, ctx.roadsStaff), /Only the citizen can close/);
  await rejects(complaintService.update(tn, { status: 'Closed', responseText: 'done' }, ctx.admin), /Only the citizen can close/);
  await rejects(complaintService.rate(ctx.voiced.trackingNumber, { score: 5 }, ctx.citizen), /only rate a complaint once/);

  const closed = await complaintService.rate(tn, { score: 5, comment: 'Bakoze neza cyane.', isPublic: true }, ctx.citizen);
  assert.equal(closed.status, 'Closed');
  assert.equal(closed.satisfaction.score, 5);
  await rejects(complaintService.sendMessage(tn, { body: 'x' }, ctx.citizen), /closed/);
});

test('public feedback shows finished cases only, and never the conversation', async () => {
  let feedback = await complaintService.publicFeedback({});
  assert.equal(feedback.entries.length, 1);
  assert.equal(feedback.entries[0].citizenName, 'Jean Uwase');
  assert.equal(feedback.entries[0].score, 5);
  assert.equal(feedback.entries[0].category, 'Infrastructure & Sanitation');
  assert.equal(feedback.summary.averageScore, 5);
  assert.ok(!JSON.stringify(feedback).includes('Ni ryari bizakemuka'), 'the private chat stays private after closing');

  // Opting out keeps the rating off the public page without blocking the close.
  await complaintService.update(ctx.withDoc.trackingNumber, { status: 'Resolved', responseText: 'Byakemutse.' }, ctx.roadsStaff);
  const quiet = await complaintService.rate(ctx.withDoc.trackingNumber, { score: 4, comment: 'Ntibimenyekane.', isPublic: false }, ctx.citizen);
  assert.equal(quiet.status, 'Closed');

  feedback = await complaintService.publicFeedback({});
  assert.equal(feedback.entries.length, 1, 'feedback held back by the citizen is not published');
});

test('a citizen can ask the senior leader for help once the case has earned it', async () => {
  const tn = ctx.voiced.trackingNumber;

  assert.equal((await complaintService.find(tn, ctx.citizen)).canRequestEscalation, false);
  await rejects(complaintService.requestEscalation(tn, {}, ctx.citizen), /once the deadline/);

  await Complaint.update({ dueDate: '2020-01-01' }, { where: { trackingNumber: tn } });
  assert.equal((await complaintService.find(tn, ctx.citizen)).canRequestEscalation, true);

  const appealed = await complaintService.requestEscalation(tn, { reason: 'Nta gisubizo nabonye.' }, ctx.citizen);
  assert.equal(appealed.status, 'Escalated');
  assert.equal(appealed.assignedOffice, 'Sector Executive Office');
  assert.equal(appealed.escalationSourceOffice, 'Infrastructure Office');
  assert.equal(await ComplaintNotification.count({ where: { userId: ctx.admin.id, title: 'Citizen requested senior review' } }), 1);

  const sectorAssigned = await complaintService.list({}, ctx.sectorStaff);
  assert.ok(sectorAssigned.some((complaint) => complaint.trackingNumber === tn), 'the escalation office staff receives the case');

  let live = await complaintService.sendMessage(tn, { body: 'Sector Executive Office irakurikirana iyi dosiye.' }, ctx.sectorStaff);
  assert.equal(live.chatOpen, true);
  assert.equal(live.messages.at(-1).senderRole, 'staff');

  live = await complaintService.sendMessage(tn, { body: 'Tuzaha admin amakuru yose.' }, ctx.roadsStaff);
  assert.equal(live.messages.at(-1).senderRole, 'staff');
  await rejects(complaintService.update(tn, { status: 'Resolved', responseText: 'done' }, ctx.roadsStaff), /their department/);
  await rejects(complaintService.sendMessage(tn, { body: 'health here' }, ctx.healthStaff), /private/);

  const roadsAssigned = await complaintService.list({}, ctx.roadsStaff);
  assert.ok(roadsAssigned.some((complaint) => complaint.trackingNumber === tn), 'the original department keeps the escalated case in Assigned to Me');

  await rejects(complaintService.requestEscalation(tn, {}, ctx.citizen), /already/);
});

test('a low rating sends the case back instead of closing it', async () => {
  await complaintService.update(ctx.both.trackingNumber, { status: 'Resolved', responseText: 'Byarangiye.' }, ctx.roadsStaff);
  const angry = await complaintService.rate(ctx.both.trackingNumber, { score: 1, comment: 'Nta cyakozwe.' }, ctx.citizen);

  assert.equal(angry.status, 'Escalated');
  assert.equal(angry.assignedOffice, 'Sector Executive Office');
  assert.equal(await ComplaintNotification.count({ where: { userId: ctx.admin.id, title: 'Complaint returned after low rating' } }), 1);
});

test('the admin can report on the whole sector, filtered to a period', async () => {
  const report = await complaintService.reports(ctx.admin);
  assert.equal(report.summary.totalComplaints, 5);
  assert.equal(report.summary.escalated, 2);
  assert.ok(report.byStatus.length > 0);
  assert.ok(report.byCategory.length > 0);
  assert.ok(report.byOffice.length > 0);
  assert.ok(report.summary.averageSatisfaction > 0);
  assert.ok(!JSON.stringify(report).includes('Ni ryari bizakemuka'), 'reports carry no chat payload');

  const staffReport = await complaintService.reports(ctx.roadsStaff);
  assert.ok(staffReport.summary.totalComplaints < report.summary.totalComplaints, 'a leader only reports on their own department');

  assert.equal((await complaintService.list({ dateFrom: '2020-01-01', dateTo: '2999-12-31' }, ctx.admin)).length, 5);
  assert.equal((await complaintService.list({ dateFrom: '2019-01-01', dateTo: '2019-12-31' }, ctx.admin)).length, 0);
  assert.equal((await complaintService.list({ status: 'Escalated' }, ctx.admin)).length, 2);
  assert.equal((await complaintService.list({ status: 'Closed' }, ctx.admin)).length, 2);

  const { reportExportService } = await import('../src/services/reportExportService.js');
  assert.ok(reportExportService.file('csv', report, ctx.admin).body.length > 0);
  assert.ok(reportExportService.file('html', report, ctx.admin).body.length > 0);
});

test('staff escalation moves the case to the sector executive while keeping the source office attached', async () => {
  const complaint = await complaintService.create({ type: ctx.infraCat.id, description: 'Uyu muhanda urasenyutse cyane.' }, ctx.citizen, {});

  const escalated = await complaintService.escalate(
    complaint.trackingNumber,
    { reason: 'Requires senior budget approval.' },
    ctx.roadsStaff
  );

  assert.equal(escalated.status, 'Escalated');
  assert.equal(escalated.assignedOffice, 'Sector Executive Office');
  assert.equal(escalated.escalationSourceOffice, 'Infrastructure Office');
  assert.equal(escalated.priority, 'Critical');

  let live = await complaintService.sendMessage(complaint.trackingNumber, { body: 'The escalation office has received this case.' }, ctx.sectorStaff);
  assert.equal(live.messages.at(-1).senderRole, 'staff');

  live = await complaintService.update(
    complaint.trackingNumber,
    { status: 'Resolved', responseText: 'The escalation office completed the senior review.' },
    ctx.sectorStaff
  );
  assert.equal(live.status, 'Resolved');

  const sourceOfficeCases = await complaintService.list({}, ctx.roadsStaff);
  assert.ok(
    sourceOfficeCases.some((item) => item.trackingNumber === complaint.trackingNumber),
    'the source office keeps escalated cases visible for handover and chat'
  );
});

test('the SLA check automatically escalates overdue open complaints', async () => {
  const complaint = await complaintService.create({ type: ctx.healthCat.id, description: 'Ikibazo cyivuriro ntikirakemuka.' }, ctx.citizen, {});
  await Complaint.update({ dueDate: '2020-01-01' }, { where: { trackingNumber: complaint.trackingNumber } });

  const result = await complaintService.runSlaCheck(ctx.admin);
  assert.ok(result.trackingNumbers.includes(complaint.trackingNumber));

  const escalated = await complaintService.find(complaint.trackingNumber, ctx.admin);
  assert.equal(escalated.status, 'Escalated');
  assert.equal(escalated.assignedOffice, 'Sector Executive Office');
  assert.equal(escalated.escalationSourceOffice, 'Health Office');
});

test('anonymous reports can be tracked without exposing a citizen identity', async () => {
  const complaint = await complaintService.create(
    { description: 'Natanze amakuru ntashaka ko amazina yanjye agaragara.' },
    null,
    {}
  );

  assert.equal(complaint.isAnonymous, true);
  assert.equal(complaint.citizenId, null);
  assert.equal(complaint.citizenName, 'Anonymous');
  assert.equal(await ComplaintNotification.count({ where: { complaintId: complaint.dbId, title: 'Complaint submitted' } }), 0);

  const tracked = await complaintService.publicTrack(complaint.trackingNumber);
  assert.equal(tracked.trackingNumber, complaint.trackingNumber);
  assert.equal(tracked.status, 'Assigned');
  assert.ok(!Object.hasOwn(tracked, 'citizenName'));
  assert.ok(!Object.hasOwn(tracked, 'description'));
});

test('every action lands in the audit log', async () => {
  const actions = (await adminService.auditLogs()).map((log) => log.action).join(' | ');
  assert.match(actions, /Submitted complaint/);
  assert.match(actions, /Updated complaint/);
  assert.match(actions, /Sent a message on complaint/);
  assert.match(actions, /Requested escalation/);
  assert.match(actions, /Rated complaint/);
});
