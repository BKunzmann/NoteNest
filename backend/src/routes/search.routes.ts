/**
 * Search Routes
 */

import { Router } from 'express';
import * as searchController from '../controllers/search.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Alle Routes benötigen Authentifizierung
router.use(authenticateToken);

// Search Operations
router.get('/', searchController.search);

export default router;

