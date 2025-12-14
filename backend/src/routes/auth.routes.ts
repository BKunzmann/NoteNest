/**
 * Authentifizierungs-Routes
 */

import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { loginLimiter, registerLimiter } from '../middleware/rateLimit.middleware';
import { trackRateLimitHit } from '../middleware/metrics.middleware';

const router = Router();

// Öffentliche Routes (mit Rate Limiting)
router.post('/register', registerLimiter, trackRateLimitHit('register'), authController.register);
router.post('/login', loginLimiter, trackRateLimitHit('login'), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/mode', authController.getAuthMode);

// Geschützte Routes (benötigen Authentifizierung)
router.get('/me', authenticateToken, authController.getMe);

export default router;

