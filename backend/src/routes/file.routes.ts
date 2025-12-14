/**
 * File Routes
 */

import { Router } from 'express';
import * as fileController from '../controllers/file.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Alle Routes benötigen Authentifizierung
router.use(authenticateToken);

// File Operations
router.get('/list', fileController.listFiles);
router.get('/content', fileController.getFileContent);
router.post('/create', fileController.createFileHandler);
router.put('/update', fileController.updateFileHandler);
router.delete('/delete', fileController.deleteFileHandler);
router.post('/create-folder', fileController.createFolderHandler);
router.post('/move', fileController.moveFileHandler);
router.post('/rename', fileController.renameFileHandler);

export default router;

