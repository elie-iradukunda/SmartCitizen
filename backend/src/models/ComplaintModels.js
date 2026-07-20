import { DataTypes } from 'sequelize';

export const defineComplaintCategory = (sequelize) => sequelize.define('ComplaintCategory', {
  code: { type: DataTypes.STRING(80), allowNull: false, unique: true },
  name: { type: DataTypes.STRING(180), allowNull: false, unique: true },
  description: DataTypes.TEXT,
  defaultPriority: {
    type: DataTypes.ENUM('Low', 'Medium', 'High', 'Critical'),
    defaultValue: 'Medium'
  },
  slaDays: { type: DataTypes.INTEGER, defaultValue: 3 },
  active: { type: DataTypes.BOOLEAN, defaultValue: true }
});

export const defineOffice = (sequelize) => sequelize.define('Office', {
  code: { type: DataTypes.STRING(80), allowNull: false, unique: true },
  name: { type: DataTypes.STRING(180), allowNull: false, unique: true },
  contactPerson: DataTypes.STRING(160),
  phone: DataTypes.STRING(40),
  email: DataTypes.STRING(190),
  active: { type: DataTypes.BOOLEAN, defaultValue: true },
  // The office every overdue or low-rated complaint is escalated to.
  isSectorExecutive: { type: DataTypes.BOOLEAN, defaultValue: false }
});

export const defineRoutingRule = (sequelize) => sequelize.define('RoutingRule', {
  code: { type: DataTypes.STRING(80), allowNull: false, unique: true },
  location: { type: DataTypes.STRING(180), defaultValue: 'Kacyiru' },
  priority: {
    type: DataTypes.ENUM('Low', 'Medium', 'High', 'Critical'),
    defaultValue: 'Medium'
  },
  slaDays: { type: DataTypes.INTEGER, defaultValue: 3 },
  active: { type: DataTypes.BOOLEAN, defaultValue: true }
});

export const defineComplaint = (sequelize) => sequelize.define('Complaint', {
  trackingNumber: { type: DataTypes.STRING(40), allowNull: false, unique: true },
  // An anonymous complaint has no citizenId, so misconduct can be reported without fear.
  isAnonymous: { type: DataTypes.BOOLEAN, defaultValue: false },
  citizenName: { type: DataTypes.STRING(160), allowNull: false },
  citizenPhone: DataTypes.STRING(40),
  description: { type: DataTypes.TEXT, allowNull: false },
  location: DataTypes.STRING(240),
  cell: DataTypes.STRING(120),
  village: DataTypes.STRING(120),
  priority: {
    type: DataTypes.ENUM('Low', 'Medium', 'High', 'Critical'),
    defaultValue: 'Medium'
  },
  status: {
    type: DataTypes.ENUM('Assigned', 'In Review', 'Waiting for Citizen', 'Resolved', 'Closed', 'Escalated'),
    defaultValue: 'Assigned'
  },
  assignedTo: DataTypes.STRING(160),
  escalatedTo: DataTypes.STRING(180),
  // The department that owned the case before escalation. It stays attached so the admin
  // can keep that leader in the feedback thread after the case moves upstairs.
  escalationSourceOfficeId: DataTypes.INTEGER,
  channel: { type: DataTypes.STRING(80), defaultValue: 'Web Portal' },
  submissionMode: { type: DataTypes.STRING(80), defaultValue: 'Typed form' },
  evidenceType: DataTypes.STRING(40),
  attachmentName: DataTypes.STRING(220),
  attachmentPath: DataTypes.STRING(255),
  evidenceLink: DataTypes.STRING(500),
  voiceNoteName: DataTypes.STRING(220),
  voiceNotePath: DataTypes.STRING(255),
  voiceNoteType: DataTypes.STRING(40),
  dueDate: DataTypes.DATEONLY,
  // Set the moment the assigned office answers for the first time. Until then the citizen
  // has nobody to talk to, so the chat stays shut.
  chatOpenedAt: DataTypes.DATE,
  // Set when the citizen asks the Sector Executive for help, so the same case cannot be
  // pushed upstairs twice.
  escalationRequestedAt: DataTypes.DATE,
  resolvedAt: DataTypes.DATE,
  closedAt: DataTypes.DATE
});

// The private conversation between one citizen and the office holding their case. Separate
// from ComplaintResponse: that table is the official status trail, this one is people talking.
export const defineComplaintMessage = (sequelize) => sequelize.define('ComplaintMessage', {
  senderName: { type: DataTypes.STRING(180), allowNull: false },
  senderRole: { type: DataTypes.ENUM('citizen', 'staff', 'admin'), allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: false },
  readByCitizen: { type: DataTypes.BOOLEAN, defaultValue: false },
  readByOffice: { type: DataTypes.BOOLEAN, defaultValue: false }
});

export const defineComplaintResponse = (sequelize) => sequelize.define('ComplaintResponse', {
  responder: { type: DataTypes.STRING(180), allowNull: false },
  responseText: { type: DataTypes.TEXT, allowNull: false },
  statusUpdate: {
    type: DataTypes.ENUM('Assigned', 'In Review', 'Waiting for Citizen', 'Resolved', 'Closed', 'Escalated'),
    allowNull: false
  }
});

export const defineSatisfactionRating = (sequelize) => sequelize.define('SatisfactionRating', {
  score: { type: DataTypes.INTEGER, allowNull: false },
  comment: DataTypes.TEXT,
  // Feedback on a finished case is published so the sector can be held to its record. A
  // citizen who would rather not be named can opt out without losing the rating itself.
  isPublic: { type: DataTypes.BOOLEAN, defaultValue: true },
  ratedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

export const defineComplaintNotification = (sequelize) => sequelize.define('ComplaintNotification', {
  title: { type: DataTypes.STRING(160), allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  read: { type: DataTypes.BOOLEAN, defaultValue: false }
});
