import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-otp', authController.verifyOtp);
router.get('/demo-users', authController.demoUsers);
router.get('/me', requireAuth, authController.me);
router.patch('/me', requireAuth, authController.updateProfile);

export default router;
