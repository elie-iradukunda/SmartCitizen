import sequelize from '../config/database.js';
import { defineAuditLog, defineCounter } from './SupportingModels.js';
import {
  defineComplaint,
  defineComplaintCategory,
  defineComplaintMessage,
  defineComplaintNotification,
  defineComplaintResponse,
  defineOffice,
  defineRoutingRule,
  defineSatisfactionRating
} from './ComplaintModels.js';
import { defineUser } from './User.js';

export const User = defineUser(sequelize);
export const ComplaintCategory = defineComplaintCategory(sequelize);
export const Office = defineOffice(sequelize);
export const RoutingRule = defineRoutingRule(sequelize);
export const Complaint = defineComplaint(sequelize);
export const ComplaintResponse = defineComplaintResponse(sequelize);
export const ComplaintMessage = defineComplaintMessage(sequelize);
export const SatisfactionRating = defineSatisfactionRating(sequelize);
export const ComplaintNotification = defineComplaintNotification(sequelize);
export const AuditLog = defineAuditLog(sequelize);
export const Counter = defineCounter(sequelize);

User.hasMany(Complaint, { foreignKey: 'citizenId', as: 'complaints' });
Complaint.belongsTo(User, { foreignKey: 'citizenId', as: 'citizen' });

ComplaintCategory.hasMany(Complaint, { foreignKey: 'categoryId', as: 'complaints' });
Complaint.belongsTo(ComplaintCategory, { foreignKey: 'categoryId', as: 'category' });

Office.hasMany(Complaint, { foreignKey: 'officeId', as: 'complaints' });
Complaint.belongsTo(Office, { foreignKey: 'officeId', as: 'office' });

Office.hasMany(Complaint, { foreignKey: 'escalationSourceOfficeId', as: 'escalatedFromComplaints' });
Complaint.belongsTo(Office, { foreignKey: 'escalationSourceOfficeId', as: 'escalationSourceOffice' });

Office.hasMany(User, { foreignKey: 'officeId', as: 'staff' });
User.belongsTo(Office, { foreignKey: 'officeId', as: 'office' });

ComplaintCategory.hasMany(RoutingRule, { foreignKey: 'categoryId', as: 'routingRules' });
RoutingRule.belongsTo(ComplaintCategory, { foreignKey: 'categoryId', as: 'category' });

Office.hasMany(RoutingRule, { foreignKey: 'officeId', as: 'routingRules' });
RoutingRule.belongsTo(Office, { foreignKey: 'officeId', as: 'office' });

Complaint.hasMany(ComplaintResponse, { foreignKey: 'complaintId', as: 'responses' });
ComplaintResponse.belongsTo(Complaint, { foreignKey: 'complaintId', as: 'complaint' });

User.hasMany(ComplaintResponse, { foreignKey: 'responderId', as: 'complaintResponses' });
ComplaintResponse.belongsTo(User, { foreignKey: 'responderId', as: 'responderUser' });

Complaint.hasMany(ComplaintMessage, { foreignKey: 'complaintId', as: 'messages' });
ComplaintMessage.belongsTo(Complaint, { foreignKey: 'complaintId', as: 'complaint' });

User.hasMany(ComplaintMessage, { foreignKey: 'senderId', as: 'complaintMessages' });
ComplaintMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

Complaint.hasOne(SatisfactionRating, { foreignKey: 'complaintId', as: 'satisfaction' });
SatisfactionRating.belongsTo(Complaint, { foreignKey: 'complaintId', as: 'complaint' });

User.hasMany(ComplaintNotification, { foreignKey: 'userId', as: 'complaintNotifications' });
ComplaintNotification.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Complaint.hasMany(ComplaintNotification, { foreignKey: 'complaintId', as: 'notifications' });
ComplaintNotification.belongsTo(Complaint, { foreignKey: 'complaintId', as: 'complaint' });

export const models = {
  User,
  ComplaintCategory,
  Office,
  RoutingRule,
  Complaint,
  ComplaintResponse,
  ComplaintMessage,
  SatisfactionRating,
  ComplaintNotification,
  AuditLog,
  Counter
};

export { sequelize };
