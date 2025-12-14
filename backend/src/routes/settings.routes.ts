/**
 * Settings Routes
 */

import { Router } from 'express';
import * as settingsController from '../controllers/settings.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Alle Routes benötigen Authentifizierung
router.use(authenticateToken);

router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);

export default router;

