/**
 * Admin-Routes
 * 
 * Routen für Admin-Benutzerverwaltung
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/admin.middleware';
import {
  getUsers,
  createUser,
  deleteUser,
  resetPassword,
  updateUserRole,
  updateUserStatus
} from '../controllers/admin.controller';

const router = Router();

// Alle Admin-Routes erfordern Authentifizierung und Admin-Rechte
router.use(authenticateToken);
router.use(requireAdmin);

// Benutzer-Verwaltung
router.get('/users', getUsers);
router.post('/users', createUser);
router.delete('/users/:id', deleteUser);
router.post('/users/:id/reset-password', resetPassword);
router.patch('/users/:id/role', updateUserRole);
router.patch('/users/:id/status', updateUserStatus);

export default router;

