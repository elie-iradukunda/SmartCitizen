import { User } from '../models/index.js';
import { publicUser } from './serializers.js';

const allowedRoles = ['citizen', 'staff', 'admin'];

export const authService = {
  async login(email, password) {
    const user = await User.findOne({ where: { email } });
    if (!user || user.password !== password) {
      const error = new Error('Invalid credentials. Demo password is password.');
      error.status = 401;
      throw error;
    }
    if (!allowedRoles.includes(user.role) || user.status !== 'active') {
      const error = new Error('This account is not enabled in the three-role SCFCMS prototype.');
      error.status = 403;
      throw error;
    }
    return publicUser(user);
  },

  async register(payload) {
    const existing = await User.findOne({ where: { email: payload.email } });
    if (existing) {
      const error = new Error('A user with this email already exists');
      error.status = 409;
      throw error;
    }

    const user = await User.create({
      fullName: payload.fullName,
      email: payload.email,
      password: payload.password,
      phone: payload.phone || '',
      role: 'citizen',
      gender: payload.gender || '',
      province: payload.province || '',
      district: payload.district || '',
      sector: payload.sector || '',
      avatar: payload.avatar || 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=160&q=80'
    });

    return publicUser(user);
  },

  async demoUsers() {
    const users = await User.findAll({ where: { role: allowedRoles, status: 'active' }, order: [['id', 'ASC']] });
    return users.map(publicUser);
  },

  async getProfile(id) {
    const user = await User.findByPk(id);
    if (!user) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }
    return publicUser(user);
  },

  async updateProfile(id, payload) {
    const user = await User.findByPk(id);
    if (!user) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }
    const editableFields = ['fullName', 'phone', 'gender', 'province', 'district', 'sector', 'avatar'];
    const updates = {};
    editableFields.forEach((field) => {
      if (payload[field] !== undefined) updates[field] = payload[field];
    });
    await user.update(updates);
    return publicUser(user);
  }
};
