import { complaintService } from '../services/complaintService.js';
import { asyncHandler, validateRequired } from './_helpers.js';

export const complaintController = {
  meta: asyncHandler(async (req, res) => res.json(await complaintService.meta())),
  publicSummary: asyncHandler(async (req, res) => res.json(await complaintService.publicSummary())),
  list: asyncHandler(async (req, res) => res.json(await complaintService.list(req.query, req.user))),
  mine: asyncHandler(async (req, res) => res.json(await complaintService.mine(req.user))),
  find: asyncHandler(async (req, res) => res.json(await complaintService.find(req.params.trackingNumber, req.user))),

  create: asyncHandler(async (req, res) => {
    validateRequired(req.body, ['type', 'description']);
    res.status(201).json(await complaintService.create(req.body, req.user, req.file));
  }),

  update: asyncHandler(async (req, res) => {
    res.json(await complaintService.update(req.params.trackingNumber, req.body, req.user));
  }),

  escalate: asyncHandler(async (req, res) => {
    res.json(await complaintService.escalate(req.params.trackingNumber, req.body, req.user));
  }),

  rate: asyncHandler(async (req, res) => {
    validateRequired(req.body, ['score']);
    res.json(await complaintService.rate(req.params.trackingNumber, req.body, req.user));
  }),

  updateRoutingRule: asyncHandler(async (req, res) => {
    res.json(await complaintService.updateRoutingRule(req.params.id, req.body, req.user));
  }),

  createCategory: asyncHandler(async (req, res) => {
    res.status(201).json(await complaintService.createCategory({ ...req.body, actor: req.user?.fullName }));
  }),

  createRoutingRule: asyncHandler(async (req, res) => {
    res.status(201).json(await complaintService.createRoutingRule(req.body, req.user));
  }),

  reports: asyncHandler(async (req, res) => res.json(await complaintService.reports())),
  notifications: asyncHandler(async (req, res) => res.json(await complaintService.notifications(req.user))),
  markRead: asyncHandler(async (req, res) => res.json(await complaintService.markNotificationRead(req.params.id, req.user))),
  unreadCount: asyncHandler(async (req, res) => res.json(await complaintService.unreadNotificationCount(req.user))),
  auditLogs: asyncHandler(async (req, res) => res.json(await complaintService.auditLogs()))
};
