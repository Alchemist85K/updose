import { resolve } from 'node:path';

/**
 * Resolves a destination path and ensures it stays within the given root directory.
 * Throws if the resolved path escapes the root (e.g., via "../").
 */
export function ensureWithinDir(root: string, destPath: string): string {
  const resolved = resolve(root, destPath);
  const normalizedRoot = resolve(root);

  if (
    !resolved.startsWith(`${normalizedRoot}/`) &&
    resolved !== normalizedRoot
  ) {
    throw new Error(
      `Path traversal detected: "${destPath}" resolves outside the project directory`,
    );
  }

  return resolved;
}
