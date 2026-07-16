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
    res.json(await authService.forgotPassword(req.body.email));
  }),

  resetPassword: asyncHandler(async (req, res) => {
    validateRequired(req.body, ['email', 'token', 'password']);
    res.json(await authService.resetPassword(req.body));
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

