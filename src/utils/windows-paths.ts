import path from 'node:path';

/**
 * Normalizes Windows paths (slashes, casing where applicable, extended paths)
 */
export function normalizeWindowsPath(p: string): string {
  if (!p) return '';
  // Standardize backslashes for Windows path operations
  let normalized = path.normalize(p);
  // Ensure drive letters are uppercase for consistent internal comparisons
  if (/^[a-zA-Z]:/.test(normalized)) {
    normalized = normalized[0]!.toUpperCase() + normalized.slice(1);
  }
  return normalized;
}

/**
 * Checks if two paths refer to the same file or directory on Windows (case-insensitive comparison)
 */
export function pathsEqual(p1: string, p2: string): boolean {
  return normalizeWindowsPath(p1).toLowerCase() === normalizeWindowsPath(p2).toLowerCase();
}

/**
 * Resolves path safely, handling extended-length path prefix if needed
 */
export function resolveWindowsPath(p: string): string {
  const resolved = path.resolve(p);
  return normalizeWindowsPath(resolved);
}

/**
 * Checks if a path is a UNC network path
 */
export function isUncPath(p: string): boolean {
  return /^\\\\[^\\/]+[\\/][^\\/]+/.test(p);
}

/**
 * Strips extended-length path prefix for display purposes if present
 */
export function displayPath(p: string): string {
  if (p.startsWith('\\\\?\\UNC\\')) {
    return '\\\\' + p.slice(8);
  }
  if (p.startsWith('\\\\?\\')) {
    return p.slice(4);
  }
  return p;
}
