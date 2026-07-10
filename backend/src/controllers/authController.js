import { authService } from '../services/authService.js';
import { signToken } from '../middleware/auth.js';
import { asyncHandler, validateRequired } from './_helpers.js';

export const authController = {
  login: asyncHandler(async (req, res) => {
    validateRequired(req.body, ['email', 'password']);
    const user = await authService.login(req.body.email, req.body.password);
    res.json({ token: signToken(user), user });
  }),

  register: asyncHandler(async (req, res) => {
    validateRequired(req.body, ['fullName', 'email', 'password']);
    const user = await authService.register(req.body);
    res.status(201).json({ token: signToken(user), user });
  }),

  forgotPassword: asyncHandler(async (req, res) => {
    validateRequired(req.body, ['email']);
    res.json({
      message: 'Password reset link generated for demo purposes.',
      resetLink: `/reset-password?email=${encodeURIComponent(req.body.email)}&token=demo-reset-token`
    });
  }),

  verifyOtp: asyncHandler(async (req, res) => {
    validateRequired(req.body, ['email', 'otp']);
    if (!['123456', '000000'].includes(req.body.otp)) {
      const error = new Error('Invalid OTP. Use 123456 in demo mode.');
      error.status = 422;
      throw error;
    }
    res.json({ verified: true, message: 'OTP verified successfully' });
  }),

  demoUsers: asyncHandler(async (req, res) => {
    res.json(await authService.demoUsers());
  }),

  me: asyncHandler(async (req, res) => {
    res.json(await authService.getProfile(req.user.id));
  }),

  updateProfile: asyncHandler(async (req, res) => {
    res.json(await authService.updateProfile(req.user.id, req.body));
  })
};

