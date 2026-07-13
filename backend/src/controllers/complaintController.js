import { complaintService } from '../services/complaintService.js';
import { asyncHandler, validateRequired } from './_helpers.js';

export const complaintController = {
  meta: asyncHandler(async (req, res) => res.json(await complaintService.meta())),
  publicSummary: asyncHandler(async (req, res) => res.json(await complaintService.publicSummary())),
  list: asyncHandler(async (req, res) => res.json(await complaintService.list(req.query, req.user))),
  mine: asyncHandler(async (req, res) => res.json(await complaintService.mine(req.user))),
  find: asyncHandler(async (req, res) => res.json(await complaintService.find(req.params.trackingNumber, req.user))),

  create: asyncHandler(async (req, res) => {
    const files = {
      attachment: req.file || req.files?.attachment?.[0] || null,
      voiceNote: req.files?.voiceNote?.[0] || null
    };
    validateRequired(req.body, ['type']);
    if (!req.body.description?.trim() && !req.body.evidenceLink?.trim() && !files.voiceNote && !files.attachment) {
      const error = new Error('Description, voice recording, evidence upload, or evidence link is required');
      error.status = 422;
      throw error;
    }
    res.status(201).json(await complaintService.create(req.body, req.user, files));
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

  remove: asyncHandler(async (req, res) => {
    res.json(await complaintService.remove(req.params.trackingNumber, req.user));
  }),

  updateRoutingRule: asyncHandler(async (req, res) => {
    res.json(await complaintService.updateRoutingRule(req.params.id, req.body, req.user));
  }),

  deleteRoutingRule: asyncHandler(async (req, res) => {
    res.json(await complaintService.deleteRoutingRule(req.params.id, req.user));
  }),

  createCategory: asyncHandler(async (req, res) => {
    res.status(201).json(await complaintService.createCategory({ ...req.body, actor: req.user?.fullName }));
  }),

  createOffice: asyncHandler(async (req, res) => {
    res.status(201).json(await complaintService.createOffice(req.body, req.user));
  }),

  updateOffice: asyncHandler(async (req, res) => {
    res.json(await complaintService.updateOffice(req.params.id, req.body, req.user));
  }),

  deleteOffice: asyncHandler(async (req, res) => {
    res.json(await complaintService.deleteOffice(req.params.id, req.user));
  }),

  updateCategory: asyncHandler(async (req, res) => {
    res.json(await complaintService.updateCategory(req.params.id, req.body, req.user));
  }),

  deleteCategory: asyncHandler(async (req, res) => {
    res.json(await complaintService.deleteCategory(req.params.id, req.user));
  }),

  createRoutingRule: asyncHandler(async (req, res) => {
    res.status(201).json(await complaintService.createRoutingRule(req.body, req.user));
  }),

  reports: asyncHandler(async (req, res) => res.json(await complaintService.reports(req.user))),
  notifications: asyncHandler(async (req, res) => res.json(await complaintService.notifications(req.user))),
  markRead: asyncHandler(async (req, res) => res.json(await complaintService.markNotificationRead(req.params.id, req.user))),
  unreadCount: asyncHandler(async (req, res) => res.json(await complaintService.unreadNotificationCount(req.user))),
  auditLogs: asyncHandler(async (req, res) => res.json(await complaintService.auditLogs()))
};
