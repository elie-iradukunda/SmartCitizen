import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User } from '../models/index.js';
import { notificationService } from './notificationService.js';
import { publicUser } from './serializers.js';

const allowedRoles = ['citizen', 'staff', 'admin'];
const kacyiruDefaults = {
  province: 'Kigali City',
  district: 'Gasabo',
  sector: 'Kacyiru'
};

const RESET_TOKEN_TTL_MINUTES = 30;
const MIN_PASSWORD_LENGTH = 6;

// The reset link and token are only handed back in the HTTP response for local demo use,
// where there is no mail server and the link is shown on screen. In production, or as soon
// as SMTP is configured, they travel by email only - otherwise anyone could POST a victim's
// email to /forgot-password and read the reset token straight out of the response.
const emailConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const revealResetLink = () => process.env.NODE_ENV !== 'production' && !emailConfigured();

// A Rwandan National ID is 16 digits. Citizens write it with spaces off their card, so the
// spaces are stripped before it is checked or stored - otherwise the same ID stored two
// different ways would slip past the duplicate check below.
const NATIONAL_ID_DIGITS = 16;
export const normalizeNationalId = (value) => String(value || '').replace(/[\s-]/g, '');

export const assertNationalId = (value) => {
  const id = normalizeNationalId(value);
  if (!new RegExp(`^\\d{${NATIONAL_ID_DIGITS}}$`).test(id)) {
    const error = new Error(`The National ID must be ${NATIONAL_ID_DIGITS} digits.`);
    error.status = 422;
    throw error;
  }
  return id;
};

// One person, one account: the National ID is what ties a complaint to a real citizen of
// the sector, so letting it repeat would let one person hold several identities.
export const assertNationalIdUnique = async (nationalId, excludeUserId = null) => {
  const existing = await User.findOne({ where: { nationalId } });
  if (existing && String(existing.id) !== String(excludeUserId ?? '')) {
    const error = new Error('An account with this National ID already exists.');
    error.status = 409;
    throw error;
  }
};

// Registration asks for where the citizen actually lives, because that is what tells the
// sector office which cell and village a complaint is coming from.
const requiredCitizenFields = [
  ['fullName', 'Full name'],
  ['email', 'Email'],
  ['phone', 'Phone number'],
  ['nationalId', 'National ID'],
  ['cell', 'Cell'],
  ['village', 'Village'],
  ['sector', 'Sector']
];

export const assertCitizenProfile = (payload) => {
  const missing = requiredCitizenFields
    .filter(([field]) => !String(payload[field] || '').trim())
    .map(([, label]) => label);
  if (missing.length) {
    const error = new Error(`These details are required: ${missing.join(', ')}.`);
    error.status = 422;
    throw error;
  }
};

// Anything already hashed starts with the bcrypt marker. Accounts seeded before hashing
// existed still hold a plain string, so they are upgraded the first time they log in.
const isHashed = (value = '') => /^\$2[aby]\$/.test(value);

export const hashPassword = (plain) => bcrypt.hash(String(plain), 10);

export const assertPasswordStrength = (plain) => {
  if (!plain || String(plain).length < MIN_PASSWORD_LENGTH) {
    const error = new Error(`The password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
    error.status = 422;
    throw error;
  }
};

const verifyPassword = async (user, plain) => {
  if (isHashed(user.password)) return bcrypt.compare(String(plain), user.password);
  if (user.password !== plain) return false;
  await user.update({ password: await hashPassword(plain) });
  return true;
};

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const authService = {
  async login(email, password) {
    const user = await User.findOne({ where: { email } });
    const invalid = () => {
      const error = new Error('Wrong email or password.');
      error.status = 401;
      throw error;
    };

    if (!user) return invalid();
    if (!await verifyPassword(user, password)) return invalid();
    if (!allowedRoles.includes(user.role)) {
      const error = new Error('This account is not enabled in the three-role SCFCMS prototype.');
      error.status = 403;
      throw error;
    }
    if (user.status !== 'active') {
      const error = new Error('This account is suspended or pending. Ask the admin to activate it.');
      error.status = 403;
      throw error;
    }
    return publicUser(user);
  },

  async register(payload) {
    assertCitizenProfile(payload);
    const existing = await User.findOne({ where: { email: payload.email } });
    if (existing) {
      const error = new Error('A user with this email already exists');
      error.status = 409;
      throw error;
    }
    assertPasswordStrength(payload.password);
    const nationalId = assertNationalId(payload.nationalId);
    await assertNationalIdUnique(nationalId);

    const user = await User.create({
      fullName: payload.fullName,
      email: payload.email,
      password: await hashPassword(payload.password),
      phone: payload.phone,
      nationalId,
      role: 'citizen',
      gender: payload.gender || '',
      province: payload.province || kacyiruDefaults.province,
      district: payload.district || kacyiruDefaults.district,
      sector: payload.sector || kacyiruDefaults.sector,
      cell: payload.cell || '',
      village: payload.village || '',
      address: payload.address || '',
      preferredLanguage: payload.preferredLanguage || 'English'
    });

    return publicUser(user);
  },

  // A single-use token, valid for 30 minutes. Only its hash is stored, so a stolen
  // database row cannot be used to take over the account.
  async forgotPassword(email) {
    const user = await User.findOne({ where: { email } });
    const message = 'If that email has an account, a reset link has been generated.';
    if (!user) return { message };

    const token = crypto.randomBytes(32).toString('hex');
    await user.update({
      resetTokenHash: hashToken(token),
      resetTokenExpiry: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60000)
    });

    const resetLink = `/reset-password?email=${encodeURIComponent(email)}&token=${token}`;
    await notificationService.sendPasswordReset({
      user,
      resetLink,
      token,
      expiresInMinutes: RESET_TOKEN_TTL_MINUTES
    }).catch((error) => console.error('[password-reset-email]', error.message));

    return revealResetLink()
      ? {
        message,
        resetLink,
        token,
        expiresInMinutes: RESET_TOKEN_TTL_MINUTES
      }
      : {
        message,
        expiresInMinutes: RESET_TOKEN_TTL_MINUTES
      };
  },

  async resetPassword({ email, token, password }) {
    const user = await User.findOne({ where: { email } });
    const invalid = () => {
      const error = new Error('This reset link is invalid or has expired. Ask for a new one.');
      error.status = 422;
      throw error;
    };

    if (!user || !user.resetTokenHash || !user.resetTokenExpiry) return invalid();
    if (user.resetTokenExpiry.getTime() < Date.now()) return invalid();
    if (user.resetTokenHash !== hashToken(String(token || ''))) return invalid();

    assertPasswordStrength(password);
    await user.update({
      password: await hashPassword(password),
      resetTokenHash: null,
      resetTokenExpiry: null
    });
    return { message: 'Your password was changed. You can log in now.' };
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
    const editableFields = [
      'fullName',
      'phone',
      'nationalId',
      'gender',
      'province',
      'district',
      'sector',
      'cell',
      'village',
      'address',
      'preferredLanguage',
      'avatar'
    ];
    const updates = {};
    editableFields.forEach((field) => {
      if (payload[field] !== undefined) updates[field] = payload[field];
    });
    // The ID identifies the citizen behind every complaint they filed, so editing it has to
    // clear the same bar registration does rather than sneaking past through the profile.
    if (updates.nationalId !== undefined) {
      updates.nationalId = assertNationalId(updates.nationalId);
      await assertNationalIdUnique(updates.nationalId, user.id);
    }
    updates.province ||= kacyiruDefaults.province;
    updates.district ||= kacyiruDefaults.district;
    updates.sector ||= kacyiruDefaults.sector;
    await user.update(updates);
    return publicUser(user);
  }
};
