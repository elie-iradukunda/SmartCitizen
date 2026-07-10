import { DataTypes } from 'sequelize';

export const defineUser = (sequelize) => sequelize.define('User', {
  fullName: { type: DataTypes.STRING(160), allowNull: false },
  email: { type: DataTypes.STRING(190), allowNull: false, unique: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  phone: DataTypes.STRING(40),
  role: {
    type: DataTypes.ENUM('citizen', 'staff', 'admin'),
    defaultValue: 'citizen'
  },
  gender: DataTypes.STRING(40),
  province: DataTypes.STRING(120),
  district: DataTypes.STRING(120),
  sector: DataTypes.STRING(120),
  avatar: DataTypes.TEXT,
  officeId: DataTypes.INTEGER,
  status: { type: DataTypes.ENUM('active', 'suspended', 'pending'), defaultValue: 'active' }
});
