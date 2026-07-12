import { AuditLog, Complaint, Office, User } from '../models/index.js';
import { publicUser, serializeAuditLog } from './serializers.js';

const allowedRoles = ['citizen', 'staff', 'admin'];
const kacyiruDefaults = {
  province: 'Kigali City',
  district: 'Gasabo',
  sector: 'Kacyiru'
};

// Staff only ever see the cases of the office they belong to, so a staff account
// without an office can open nothing. Citizens and admins are never office-bound.
const resolveOfficeId = async (role, requestedOfficeId, currentOfficeId = null) => {
  if (role !== 'staff') return null;
  const officeId = requestedOfficeId === undefined ? currentOfficeId : requestedOfficeId;
  if (!officeId) {
    const error = new Error('An Administrative Staff account must be linked to a responsible office.');
    error.status = 422;
    throw error;
  }
  const office = await Office.findByPk(officeId);
  if (!office || !office.active) {
    const error = new Error('Responsible office not found');
    error.status = 422;
    throw error;
  }
  return office.id;
};

export const adminService = {
  async users() {
    const users = await User.findAll({
      where: { role: allowedRoles },
      include: [{ model: Office, as: 'office' }],
      order: [['createdAt', 'DESC']]
    });
    return users.map(publicUser);
  },

  async createUser(payload) {
    if (!payload.fullName || !payload.email || !payload.password) {
      const error = new Error('fullName, email and password are required');
      error.status = 422;
      throw error;
    }
    if (payload.role && !allowedRoles.includes(payload.role)) {
      const error = new Error('Only Citizen, Administrative Staff, and Admin roles are enabled.');
      error.status = 422;
      throw error;
    }
    const existing = await User.findOne({ where: { email: payload.email } });
    if (existing) {
      const error = new Error('A user with this email already exists');
      error.status = 409;
      throw error;
    }
    const role = payload.role || 'citizen';
    const user = await User.create({
      fullName: payload.fullName,
      email: payload.email,
      password: payload.password,
      phone: payload.phone || '',
      nationalId: payload.nationalId || '',
      role,
      gender: payload.gender || '',
      province: payload.province || kacyiruDefaults.province,
      district: payload.district || kacyiruDefaults.district,
      sector: payload.sector || kacyiruDefaults.sector,
      cell: payload.cell || '',
      village: payload.village || '',
      address: payload.address || '',
      preferredLanguage: payload.preferredLanguage || 'English',
      officeId: await resolveOfficeId(role, payload.officeId),
      status: payload.status || 'active'
    });
    return publicUser(await User.findByPk(user.id, { include: [{ model: Office, as: 'office' }] }));
  },

  async updateUser(id, payload) {
    const user = await User.findByPk(id);
    if (!user) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }
    const updates = { ...payload };
    if (updates.role && !allowedRoles.includes(updates.role)) {
      const error = new Error('Only Citizen, Administrative Staff, and Admin roles are enabled.');
      error.status = 422;
      throw error;
    }
    const role = updates.role || user.role;
    updates.officeId = await resolveOfficeId(role, payload.officeId, user.officeId);
    await user.update(updates);
    return publicUser(await User.findByPk(user.id, { include: [{ model: Office, as: 'office' }] }));
  },

  async deleteUser(id, requesterId) {
    const user = await User.findByPk(id);
    if (!user) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }
    if (String(user.id) === String(requesterId)) {
      const error = new Error('You cannot delete your own account while logged in.');
      error.status = 422;
      throw error;
    }
    if (user.role === 'admin') {
      const otherAdmins = await User.count({ where: { role: 'admin' } });
      if (otherAdmins <= 1) {
        const error = new Error('At least one Admin account must remain.');
        error.status = 422;
        throw error;
      }
    }
    const linkedComplaints = await Complaint.count({ where: { citizenId: user.id } });
    if (linkedComplaints > 0) {
      const error = new Error('This user has submitted complaints and cannot be deleted. Suspend the account instead.');
      error.status = 422;
      throw error;
    }
    await user.destroy();
    return { deleted: true };
  },

  async auditLogs() {
    const logs = await AuditLog.findAll({ order: [['createdAt', 'DESC']] });
    return logs.map(serializeAuditLog);
  }
};
