/**
 * File Controller
 * 
 * Handles HTTP-Requests für Datei-Operationen
 */

import { Request, Response } from 'express';
import {
  listDirectory,
  listRecentFiles,
  readFile,
  createFile,
  updateFile,
  deleteFile,
  createFolder,
  moveFile,
  copyFile
} from '../services/file.service';
import {
  CreateFileRequest,
  UpdateFileRequest,
  DeleteFileRequest,
  CreateFolderRequest,
  MoveFileRequest,
  CopyFileRequest,
  RenameFileRequest
} from '../types/file';

/**
 * GET /api/files/list
 * Listet Verzeichnis-Inhalt auf
 */
export async function listFiles(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    let { path: dirPath = '/', type = 'private' } = req.query;

    if (typeof dirPath !== 'string' || (type !== 'private' && type !== 'shared')) {
      res.status(400).json({ error: 'Invalid parameters' });
      return;
    }
    
    // URL-decode den Pfad (falls er encoded wurde)
    try {
      dirPath = decodeURIComponent(dirPath);
    } catch (e) {
      // Falls Decoding fehlschlägt, verwende den ursprünglichen Pfad
    }

    const items = await listDirectory(
      req.user.id,
      dirPath,
      type as 'private' | 'shared'
    );

    res.json({
      path: dirPath,
      type: type as 'private' | 'shared',
      items
    });
  } catch (error: any) {
    console.error('List files error:', error);
    res.status(500).json({ error: error.message || 'Failed to list files' });
  }
}

/**
 * GET /api/files/recent
 * Listet zuletzt bearbeitete Dateien rekursiv auf
 */
export async function listRecentFilesHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { type = 'private', notesOnly = 'false', limit = '200' } = req.query;
    if (type !== 'private' && type !== 'shared') {
      res.status(400).json({ error: 'Invalid type (allowed: private, shared)' });
      return;
    }

    const parsedLimit = Number.parseInt(String(limit), 10);
    const safeLimit = Number.isFinite(parsedLimit) ? parsedLimit : 200;
    const onlyNotes = String(notesOnly).toLowerCase() === 'true' || String(notesOnly) === '1';

    const items = await listRecentFiles(req.user.id, type, {
      notesOnly: onlyNotes,
      limit: safeLimit
    });

    res.json({
      type,
      notesOnly: onlyNotes,
      count: items.length,
      items
    });
  } catch (error: any) {
    console.error('List recent files error:', error);
    res.status(500).json({ error: error.message || 'Failed to list recent files' });
  }
}

/**
 * GET /api/files/content
 * Liest Datei-Inhalt
 */
export async function getFileContent(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    let { path: filePath, type = 'private' } = req.query;

    console.log('Get file content - RAW query:', { path: filePath, type, query: req.query });

    if (typeof filePath !== 'string' || (type !== 'private' && type !== 'shared')) {
      res.status(400).json({ error: 'Invalid parameters' });
      return;
    }
    
    // URL-decode den Pfad (falls er encoded wurde)
    try {
      filePath = decodeURIComponent(filePath);
    } catch (e) {
      // Falls Decoding fehlschlägt, verwende den ursprünglichen Pfad
      console.warn('Failed to decode file path:', filePath);
    }
    
    console.log('Get file content - userId:', req.user.id, 'filePath:', filePath, 'type:', type);

    const content = await readFile(
      req.user.id,
      filePath,
      type as 'private' | 'shared'
    );

    // Hole Last-Modified
    const { resolveUserPath } = await import('../services/file.service');
    const fullPath = resolveUserPath(req.user.id, filePath, type as 'private' | 'shared');
    const fs = await import('fs/promises');
    const stats = await fs.stat(fullPath);

    console.log('Sending file content response:', { 
      path: filePath, 
      contentLength: content.length,
      lastModified: stats.mtime.toISOString()
    });
    
    res.json({
      path: filePath,
      content,
      type: type as 'private' | 'shared',
      lastModified: stats.mtime.toISOString()
    });
  } catch (error: any) {
    const errorFilePath = typeof req.query.path === 'string' ? req.query.path : 'unknown';
    const errorType = (req.query.type === 'private' || req.query.type === 'shared') ? req.query.type : 'private';
    console.error('Get file content error:', { 
      userId: req.user?.id, 
      filePath: errorFilePath, 
      type: errorType, 
      error: error.message,
      stack: error.stack
    });
    
    if (error.message === 'File not found') {
      res.status(404).json({ error: 'File not found' });
      return;
    }
    if (error.message === 'No read permission') {
      res.status(403).json({ error: 'No read permission' });
      return;
    }
    res.status(500).json({ error: error.message || 'Failed to read file' });
  }
}

/**
 * POST /api/files/create
 * Erstellt eine neue Datei
 */
export async function createFileHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const data: CreateFileRequest = req.body;

    if (!data.path || data.content === undefined || !data.type) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    await createFile(
      req.user.id,
      data.path,
      data.content,
      data.type
    );

    res.status(201).json({
      success: true,
      path: data.path,
      message: 'File created successfully'
    });
  } catch (error: any) {
    if (error.message === 'File already exists') {
      res.status(409).json({ error: 'File already exists' });
      return;
    }
    console.error('Create file error:', error);
    res.status(500).json({ error: error.message || 'Failed to create file' });
  }
}

/**
 * PUT /api/files/update
 * Aktualisiert eine Datei
 */
export async function updateFileHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const data: UpdateFileRequest = req.body;

    if (!data.path || data.content === undefined || !data.type) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    await updateFile(
      req.user.id,
      data.path,
      data.content,
      data.type
    );

    res.json({
      success: true,
      path: data.path,
      message: 'File updated successfully'
    });
  } catch (error: any) {
    if (error.message === 'File not found') {
      res.status(404).json({ error: 'File not found' });
      return;
    }
    console.error('Update file error:', error);
    res.status(500).json({ error: error.message || 'Failed to update file' });
  }
}

/**
 * DELETE /api/files/delete
 * Löscht eine Datei oder einen Ordner
 */
export async function deleteFileHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const data: DeleteFileRequest = req.body;

    if (!data.path || !data.type) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    await deleteFile(
      req.user.id,
      data.path,
      data.type
    );

    res.json({
      success: true,
      path: data.path,
      message: 'File or folder deleted successfully'
    });
  } catch (error: any) {
    if (error.message === 'File or folder not found') {
      res.status(404).json({ error: 'File or folder not found' });
      return;
    }
    console.error('Delete file error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete file' });
  }
}

/**
 * POST /api/files/create-folder
 * Erstellt einen neuen Ordner
 */
export async function createFolderHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const data: CreateFolderRequest = req.body;

    if (!data.path || !data.type) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    await createFolder(
      req.user.id,
      data.path,
      data.type
    );

    res.status(201).json({
      success: true,
      path: data.path,
      message: 'Folder created successfully'
    });
  } catch (error: any) {
    if (error.message === 'Folder already exists') {
      res.status(409).json({ error: 'Folder already exists' });
      return;
    }
    console.error('Create folder error:', error);
    res.status(500).json({ error: error.message || 'Failed to create folder' });
  }
}

/**
 * POST /api/files/move
 * Verschiebt oder benennt eine Datei/Ordner um
 */
export async function moveFileHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const data: MoveFileRequest = req.body;

    if (!data.from || !data.to || !data.fromType || !data.toType) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    await moveFile(
      req.user.id,
      data.from,
      data.to,
      data.fromType,
      data.toType
    );

    res.json({
      success: true,
      from: data.from,
      to: data.to,
      message: 'File or folder moved successfully'
    });
  } catch (error: any) {
    if (error.message === 'Source file or folder not found') {
      res.status(404).json({ error: 'Source file or folder not found' });
      return;
    }
    if (error.message === 'Destination already exists') {
      res.status(409).json({ error: 'Destination already exists' });
      return;
    }
    console.error('Move file error:', error);
    res.status(500).json({ error: error.message || 'Failed to move file' });
  }
}

/**
 * POST /api/files/copy
 * Kopiert eine Datei/Ordner
 */
export async function copyFileHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const data: CopyFileRequest = req.body;

    if (!data.from || !data.to || !data.fromType || !data.toType) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    await copyFile(
      req.user.id,
      data.from,
      data.to,
      data.fromType,
      data.toType
    );

    res.status(201).json({
      success: true,
      from: data.from,
      to: data.to,
      message: 'File or folder copied successfully'
    });
  } catch (error: any) {
    if (error.message === 'Source file or folder not found') {
      res.status(404).json({ error: 'Source file or folder not found' });
      return;
    }
    if (error.message === 'Destination already exists') {
      res.status(409).json({ error: 'Destination already exists' });
      return;
    }
    console.error('Copy file error:', error);
    res.status(500).json({ error: error.message || 'Failed to copy file or folder' });
  }
}

/**
 * POST /api/files/rename
 * Benennt eine Datei/Ordner um (Wrapper für move)
 */
export async function renameFileHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const data: RenameFileRequest = req.body;

    if (!data.path || !data.newName || !data.type) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Erstelle neuen Pfad mit neuem Namen
    const pathLib = await import('path');
    const dir = pathLib.dirname(data.path);
    const newPath = dir === '.' || dir === '/' 
      ? data.newName 
      : pathLib.join(dir, data.newName);

    await moveFile(
      req.user.id,
      data.path,
      newPath,
      data.type,
      data.type
    );

    res.json({
      success: true,
      path: data.path,
      newPath,
      message: 'File or folder renamed successfully'
    });
  } catch (error: any) {
    console.error('Rename file error:', error);
    res.status(500).json({ error: error.message || 'Failed to rename file' });
  }
}

