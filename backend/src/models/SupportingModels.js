import { DataTypes } from 'sequelize';

export const defineAuditLog = (sequelize) => sequelize.define('AuditLog', {
  actor: DataTypes.STRING(160),
  action: { type: DataTypes.STRING(220), allowNull: false },
  metadata: DataTypes.JSON
});

// One row per year, locked inside the transaction that mints a tracking number, so two
// citizens submitting at the same instant can never receive the same SCF number.
export const defineCounter = (sequelize) => sequelize.define('Counter', {
  key: { type: DataTypes.STRING(60), primaryKey: true },
  value: { type: DataTypes.INTEGER, defaultValue: 0 }
}, { timestamps: false });
