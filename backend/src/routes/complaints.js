import { Router } from 'express';
import multer from 'multer';
import { complaintController } from '../controllers/complaintController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const upload = multer({ dest: 'uploads/', limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/public-summary', complaintController.publicSummary);

router.use(requireAuth);

router.get('/meta', complaintController.meta);
router.get('/my', requireRole('citizen'), complaintController.mine);
router.get('/reports', requireRole('staff', 'admin'), complaintController.reports);
router.get('/notifications', complaintController.notifications);
router.patch('/notifications/:id/read', complaintController.markRead);
router.get('/notifications/unread-count', complaintController.unreadCount);
router.get('/audit-logs', requireRole('admin'), complaintController.auditLogs);
router.get('/', requireRole('staff', 'admin'), complaintController.list);
router.get('/:trackingNumber', complaintController.find);
router.post('/', requireRole('citizen'), upload.single('attachment'), complaintController.create);
router.post('/categories', requireRole('admin'), complaintController.createCategory);
router.patch('/categories/:id', requireRole('admin'), complaintController.updateCategory);
router.delete('/categories/:id', requireRole('admin'), complaintController.deleteCategory);
router.post('/routing-rules', requireRole('admin'), complaintController.createRoutingRule);
router.patch('/routing-rules/:id', requireRole('admin'), complaintController.updateRoutingRule);
router.delete('/routing-rules/:id', requireRole('admin'), complaintController.deleteRoutingRule);
router.delete('/:trackingNumber', requireRole('admin'), complaintController.remove);
router.patch('/:trackingNumber/status', requireRole('staff', 'admin'), complaintController.update);
router.post('/:trackingNumber/escalate', requireRole('staff', 'admin'), complaintController.escalate);
router.post('/:trackingNumber/rate', requireRole('citizen'), complaintController.rate);

export default router;
