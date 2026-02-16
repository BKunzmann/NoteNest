import fs from 'fs';
import path from 'path';

import { IS_NAS_MODE } from '../config/constants';

function normalizeEnvPath(rawPath?: string): string | null {
  const trimmed = rawPath?.trim();
  if (!trimmed) {
    return null;
  }

  if (path.isAbsolute(trimmed)) {
    return path.resolve(trimmed);
  }

  return path.resolve(process.cwd(), trimmed);
}

function firstExistingPath(candidates: string[]): string | null {
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch {
      // ignoriere fehlerhafte Pfade und prüfe den nächsten Kandidaten
    }
  }
  return null;
}

export function getNasHomesRootPath(): string {
  return normalizeEnvPath(process.env.NAS_HOMES_PATH) || '/data/homes';
}

export function getNasSharedRootPath(): string {
  return normalizeEnvPath(process.env.NAS_SHARED_PATH) || '/data/shared';
}

export function getStandaloneUsersRootPath(): string {
  const fromEnv = normalizeEnvPath(process.env.DATA_ROOT);
  if (fromEnv) {
    return fromEnv;
  }

  return firstExistingPath([
    '/data/users',
    '/app/data/users',
    path.resolve(process.cwd(), 'data/users')
  ]) || '/data/users';
}

export function getStandaloneSharedRootPath(): string {
  const fromEnv = normalizeEnvPath(process.env.SHARED_DATA_ROOT);
  if (fromEnv) {
    return fromEnv;
  }

  return firstExistingPath([
    '/data/shared',
    '/app/data/shared',
    path.resolve(process.cwd(), 'data/shared')
  ]) || '/data/shared';
}

export function getPrivateRootPathForDeployment(): string {
  return IS_NAS_MODE ? getNasHomesRootPath() : getStandaloneUsersRootPath();
}

export function getSharedRootPathForDeployment(): string {
  return IS_NAS_MODE ? getNasSharedRootPath() : getStandaloneSharedRootPath();
}

