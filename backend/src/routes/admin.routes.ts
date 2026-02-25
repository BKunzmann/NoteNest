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
  updateUserStatus,
  reindexAll,
  getIndexStatus,
  getBibleStatus,
  reimportBibleDatabase,
  getHiddenFolders,
  updateHiddenFolders
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

// Such-Index-Verwaltung
router.post('/search/reindex', reindexAll);
router.get('/search/index-status', getIndexStatus);

// Bibel-Datenbank-Verwaltung
router.get('/bible/status', getBibleStatus);
router.post('/bible/reimport', reimportBibleDatabase);

// Konfiguration
router.get('/config/hidden-folders', getHiddenFolders);
router.put('/config/hidden-folders', updateHiddenFolders);

export default router;
 