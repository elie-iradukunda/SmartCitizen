import { adminService } from '../services/adminService.js';
import { asyncHandler, validateRequired } from './_helpers.js';

export const adminController = {
  users: asyncHandler(async (req, res) => res.json(await adminService.users())),

  createUser: asyncHandler(async (req, res) => {
    validateRequired(req.body, ['fullName', 'email', 'password']);
    res.status(201).json(await adminService.createUser(req.body));
  }),

  updateUser: asyncHandler(async (req, res) => res.json(await adminService.updateUser(req.params.id, req.body))),

  deleteUser: asyncHandler(async (req, res) => res.json(await adminService.deleteUser(req.params.id, req.user.id))),

  auditLogs: asyncHandler(async (req, res) => res.json(await adminService.auditLogs()))
};
