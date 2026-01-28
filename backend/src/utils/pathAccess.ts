/**
 * Pfad-Utilities für sichere Benutzerpfade
 */

import path from 'path';

export function getDefaultPrivateRoot(username: string): string {
  const nasHomesPath = process.env.NAS_HOMES_PATH;
  if (nasHomesPath && nasHomesPath.trim().length > 0) {
    return path.join(nasHomesPath, username);
  }

  if (process.env.NODE_ENV === 'production') {
    return `/data/users/${username}`;
  }

  return `/app/data/users/${username}`;
}

export function getDefaultSharedRoot(): string {
  const sharedPath = process.env.NAS_SHARED_PATH;
  if (sharedPath && sharedPath.trim().length > 0) {
    return sharedPath;
  }

  return process.env.NODE_ENV === 'production' ? '/data/shared' : '/app/data/shared';
}

export function resolvePathWithinRoot(inputPath: string, rootPath: string): string {
  const trimmedInput = inputPath.trim();
  if (!trimmedInput) {
    throw new Error('Path is empty');
  }

  const candidate = path.isAbsolute(trimmedInput)
    ? trimmedInput
    : path.join(rootPath, trimmedInput);

  const resolvedRoot = path.resolve(rootPath);
  const resolvedCandidate = path.resolve(candidate);

  if (resolvedCandidate === resolvedRoot || resolvedCandidate.startsWith(`${resolvedRoot}${path.sep}`)) {
    return resolvedCandidate;
  }

  throw new Error(`Path must be within ${resolvedRoot}`);
}

export function isPathWithinRoot(targetPath: string, rootPath: string): boolean {
  const resolvedRoot = path.resolve(rootPath);
  const resolvedTarget = path.resolve(targetPath);

  return resolvedTarget === resolvedRoot || resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`);
}
