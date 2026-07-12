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
  active: { type: DataTypes.BOOLEAN, defaultValue: true }
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
  channel: { type: DataTypes.STRING(80), defaultValue: 'Web Portal' },
  submissionMode: { type: DataTypes.STRING(80), defaultValue: 'Typed form' },
  evidenceType: DataTypes.STRING(40),
  attachmentName: DataTypes.STRING(220),
  attachmentPath: DataTypes.STRING(255),
  dueDate: DataTypes.DATEONLY,
  resolvedAt: DataTypes.DATE,
  closedAt: DataTypes.DATE
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
  ratedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

export const defineComplaintNotification = (sequelize) => sequelize.define('ComplaintNotification', {
  title: { type: DataTypes.STRING(160), allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  read: { type: DataTypes.BOOLEAN, defaultValue: false }
});
