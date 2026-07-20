import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { complaintController } from '../controllers/complaintController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
const maxUploadMb = Number(process.env.MAX_UPLOAD_MB || 100);
fs.mkdirSync(uploadDir, { recursive: true });
const extensionFromMime = (mime = '') => {
  if (mime.includes('webm')) return '.webm';
  if (mime.includes('ogg')) return '.ogg';
  if (mime.includes('mp4')) return '.mp4';
  if (mime.includes('quicktime')) return '.mov';
  if (mime.includes('mpeg')) return '.mp3';
  if (mime.includes('m4a')) return '.m4a';
  if (mime.includes('wav')) return '.wav';
  if (mime.includes('pdf')) return '.pdf';
  if (mime.includes('msword')) return '.doc';
  if (mime.includes('wordprocessingml')) return '.docx';
  if (mime.includes('png')) return '.png';
  if (mime.includes('jpeg')) return '.jpg';
  if (mime.includes('webp')) return '.webp';
  if (mime.includes('gif')) return '.gif';
  return '';
};
const allowedDocument = (mime = '') => [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
].includes(mime);
const allowedUpload = (file) => {
  if (file.fieldname === 'voiceNote') return file.mimetype.startsWith('audio/');
  if (file.fieldname === 'attachment') return file.mimetype.startsWith('image/') || allowedDocument(file.mimetype);
  return false;
};
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '') || extensionFromMime(file.mimetype);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: maxUploadMb * 1024 * 1024, files: 2 },
  fileFilter: (req, file, cb) => {
    if (allowedUpload(file)) return cb(null, true);
    return cb(new Error('Only image or document evidence files are allowed. Use the voice recorder for audio complaints.'));
  }
});
const complaintUploads = upload.fields([
  { name: 'attachment', maxCount: 1 },
  { name: 'voiceNote', maxCount: 1 }
]);

router.get('/public-summary', complaintController.publicSummary);
router.get('/public-feedback', complaintController.publicFeedback);
router.get('/public-track/:trackingNumber', complaintController.publicTrack);
router.post('/public', complaintUploads, complaintController.createAnonymous);

router.use(requireAuth);

router.get('/meta', complaintController.meta);
router.get('/my', requireRole('citizen'), complaintController.mine);
router.get('/reports', requireRole('staff', 'admin'), complaintController.reports);
router.get('/reports/export', requireRole('staff', 'admin'), complaintController.reportExport);
router.get('/notifications', complaintController.notifications);
router.patch('/notifications/:id/read', complaintController.markRead);
router.get('/notifications/unread-count', complaintController.unreadCount);
router.get('/audit-logs', requireRole('admin'), complaintController.auditLogs);
router.post('/sla-check', requireRole('admin'), complaintController.slaCheck);
router.get('/', requireRole('staff', 'admin'), complaintController.list);
router.get('/:trackingNumber', complaintController.find);
router.post('/', requireRole('citizen'), complaintUploads, complaintController.create);
router.post('/offices', requireRole('admin'), complaintController.createOffice);
router.patch('/offices/:id', requireRole('admin'), complaintController.updateOffice);
router.delete('/offices/:id', requireRole('admin'), complaintController.deleteOffice);
router.post('/categories', requireRole('admin'), complaintController.createCategory);
router.patch('/categories/:id', requireRole('admin'), complaintController.updateCategory);
router.delete('/categories/:id', requireRole('admin'), complaintController.deleteCategory);
router.post('/routing-rules', requireRole('admin'), complaintController.createRoutingRule);
router.patch('/routing-rules/:id', requireRole('admin'), complaintController.updateRoutingRule);
router.delete('/routing-rules/:id', requireRole('admin'), complaintController.deleteRoutingRule);
router.delete('/:trackingNumber', requireRole('admin'), complaintController.remove);
router.patch('/:trackingNumber/status', requireRole('staff', 'admin'), complaintController.update);
router.post('/:trackingNumber/escalate', requireRole('staff', 'admin'), complaintController.escalate);
router.get('/:trackingNumber/messages', complaintController.messages);
router.post('/:trackingNumber/messages', complaintController.sendMessage);
router.post('/:trackingNumber/request-escalation', requireRole('citizen'), complaintController.requestEscalation);
router.post('/:trackingNumber/rate', requireRole('citizen'), complaintController.rate);

export default router;
