import { DataTypes } from 'sequelize';

export const defineAuditLog = (sequelize) => sequelize.define('AuditLog', {
  actor: DataTypes.STRING(160),
  action: { type: DataTypes.STRING(220), allowNull: false },
  metadata: DataTypes.JSON
});
