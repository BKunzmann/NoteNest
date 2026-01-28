/**
 * NAS-Pfad-Validierung
 * 
 * Validiert, ob NAS-Pfade existieren und zugänglich sind
 */

import fs from 'fs';
import path from 'path';
import { IS_NAS_MODE } from '../config/constants';
import { getDefaultSharedRoot } from './pathAccess';

/**
 * Prüft, ob ein Pfad existiert und zugänglich ist
 */
export function validatePath(targetPath: string): {
  exists: boolean;
  readable: boolean;
  writable: boolean;
  error?: string;
} {
  try {
    // Prüfe Existenz
    if (!fs.existsSync(targetPath)) {
      return {
        exists: false,
        readable: false,
        writable: false,
        error: `Path does not exist: ${targetPath}`
      };
    }

    // Prüfe Lesezugriff
    try {
      fs.accessSync(targetPath, fs.constants.R_OK);
    } catch {
      return {
        exists: true,
        readable: false,
        writable: false,
        error: `Path not readable: ${targetPath}`
      };
    }

    // Prüfe Schreibzugriff
    let writable = false;
    try {
      fs.accessSync(targetPath, fs.constants.W_OK);
      writable = true;
    } catch {
      // Schreibzugriff nicht vorhanden (z.B. read-only mount)
    }

    return {
      exists: true,
      readable: true,
      writable,
    };
  } catch (error: any) {
    return {
      exists: false,
      readable: false,
      writable: false,
      error: `Validation error: ${error.message}`
    };
  }
}

/**
 * Validiert NAS-Home-Verzeichnis für einen Benutzer
 * @param username - NAS-Username
 * @returns Validierungsergebnis mit vollständigem Pfad
 */
export function validateNasHomePath(username: string): {
  valid: boolean;
  path: string;
  error?: string;
} {
  if (!IS_NAS_MODE) {
    return {
      valid: true,
      path: `/data/users/${username}`,
      error: undefined
    };
  }

  const nasHomesPath = process.env.NAS_HOMES_PATH || '/data/homes';
  const userHomePath = path.join(nasHomesPath, username);

  const validation = validatePath(userHomePath);

  if (!validation.exists) {
    return {
      valid: false,
      path: userHomePath,
      error: `NAS home directory does not exist: ${userHomePath}. Please create the user on the NAS first.`
    };
  }

  if (!validation.readable) {
    return {
      valid: false,
      path: userHomePath,
      error: `NAS home directory not readable: ${userHomePath}. Check permissions.`
    };
  }

  return {
    valid: true,
    path: userHomePath,
    error: undefined
  };
}

/**
 * Validiert NAS-Shared-Ordner
 * @param sharedPath - Pfad zum Shared-Ordner (relativ oder absolut)
 * @returns Validierungsergebnis mit vollständigem Pfad
 */
export function validateNasSharedPath(sharedPath: string): {
  valid: boolean;
  path: string;
  error?: string;
} {
  const nasSharedPath = getDefaultSharedRoot();
  
  // Wenn Pfad absolut ist und mit nasSharedPath beginnt, verwende ihn direkt
  // Sonst kombiniere mit nasSharedPath
  const fullPath = path.isAbsolute(sharedPath) && sharedPath.startsWith(nasSharedPath)
    ? sharedPath
    : path.join(nasSharedPath, sharedPath);

  const validation = validatePath(fullPath);

  if (!validation.exists) {
    return {
      valid: false,
      path: fullPath,
      error: `Shared directory does not exist: ${fullPath}`
    };
  }

  if (!validation.readable) {
    return {
      valid: false,
      path: fullPath,
      error: `Shared directory not readable: ${fullPath}`
    };
  }

  return {
    valid: true,
    path: fullPath,
    error: undefined
  };
}

/**
 * Shared Folder mit Metadaten
 */
export interface SharedFolderInfo {
  name: string;
  path: string;
  exists: boolean;
}

/**
 * Listet verfügbare Shared-Ordner auf (für Admin-Panel)
 */
export function listAvailableSharedFolders(): {
  folders: SharedFolderInfo[];
  error?: string;
} {
  try {
    const nasSharedPath = getDefaultSharedRoot();

    if (!fs.existsSync(nasSharedPath)) {
      // Wenn Pfad nicht existiert, erstelle ihn
      try {
        fs.mkdirSync(nasSharedPath, { recursive: true });
        console.log(`Created shared path: ${nasSharedPath}`);
      } catch (mkdirError: any) {
        return {
          folders: [],
          error: `Shared path does not exist and could not be created: ${nasSharedPath}`
        };
      }
    }

    const entries = fs.readdirSync(nasSharedPath, { withFileTypes: true });
    const folders: SharedFolderInfo[] = entries
      .filter(entry => entry.isDirectory())
      .map(entry => ({
        name: entry.name,
        path: path.join(nasSharedPath, entry.name),
        exists: true
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      folders,
      error: undefined
    };
  } catch (error: any) {
    return {
      folders: [],
      error: `Error listing shared folders: ${error.message}`
    };
  }
}

/**
 * Erstellt einen Ordner, falls er nicht existiert
 * Nur in Standalone-Mode, in NAS-Mode sollten Ordner auf NAS erstellt werden
 */
export function createPathIfNotExists(targetPath: string): {
  created: boolean;
  error?: string;
} {
  try {
    if (fs.existsSync(targetPath)) {
      return { created: false };
    }

    fs.mkdirSync(targetPath, { recursive: true });
    return { created: true };
  } catch (error: any) {
    return {
      created: false,
      error: `Failed to create path: ${error.message}`
    };
  }
}

