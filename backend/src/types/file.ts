/**
 * File Management Types
 */

export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: number;
  lastModified?: string;
  fileType?: string; // 'md', 'txt', 'pdf', etc.
  isEditable?: boolean;
  canRead?: boolean;
  canWrite?: boolean;
}

export interface FileListResponse {
  path: string;
  type: 'private' | 'shared';
  notesOnly?: boolean;
  items: FileItem[];
}

export interface FileContentResponse {
  path: string;
  content: string;
  type: 'private' | 'shared';
  lastModified: string;
}

export interface FileStatsResponse {
  type: 'private' | 'shared';
  totalFiles: number;
  totalNotes: number;
}

export interface CreateFileRequest {
  path: string;
  content: string;
  type: 'private' | 'shared';
}

export interface UpdateFileRequest {
  path: string;
  content: string;
  type: 'private' | 'shared';
}

export interface DeleteFileRequest {
  path: string;
  type: 'private' | 'shared';
}

export interface CreateFolderRequest {
  path: string;
  type: 'private' | 'shared';
}

export interface MoveFileRequest {
  from: string;
  to: string;
  fromType: 'private' | 'shared';
  toType: 'private' | 'shared';
}

export interface CopyFileRequest {
  from: string;
  to: string;
  fromType: 'private' | 'shared';
  toType: 'private' | 'shared';
}

export interface RenameFileRequest {
  path: string;
  newName: string;
  type: 'private' | 'shared';
}

export interface TrashItem {
  id: number;
  user_id: number;
  item_name: string;
  item_type: 'file' | 'folder';
  original_path: string;
  original_type: 'private' | 'shared';
  trash_path: string;
  trash_type: 'private' | 'shared';
  deleted_at: string;
}

export interface RestoreTrashRequest {
  trashItemId: number;
  type: 'private' | 'shared';
}

