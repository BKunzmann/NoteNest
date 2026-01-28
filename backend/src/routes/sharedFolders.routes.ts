/**
 * Shared-Ordner Routes
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/admin.middleware';
import {
  getAvailableSharedFolders,
  grantSharedFolderAccess,
  revokeSharedFolderAccess,
  getUserSharedFolders,
  revokeSharedFolderAccessById
} from '../controllers/sharedFolders.controller';

const router = express.Router();

// Alle Routes erfordern Admin-Rechte
router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/admin/shared-folders - Verfügbare Ordner auflisten
router.get('/shared-folders', getAvailableSharedFolders);

// GET /api/admin/users/:id/shared-folders - User's Shared-Ordner
router.get('/users/:id/shared-folders', getUserSharedFolders);

// POST /api/admin/users/:id/shared-folders - Zugriff gewähren
router.post('/users/:id/shared-folders', grantSharedFolderAccess);

// DELETE /api/admin/users/:id/shared-folders - Zugriff entziehen (per Pfad im Body)
router.delete('/users/:id/shared-folders', revokeSharedFolderAccess);

// DELETE /api/admin/users/:id/shared-folders/:folderId - Zugriff entziehen (per ID)
router.delete('/users/:id/shared-folders/:folderId', revokeSharedFolderAccessById);

export default router;

