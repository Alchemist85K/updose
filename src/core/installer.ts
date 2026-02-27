import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { askFileConflict } from '../utils/prompts.js';

const APPEND_SEPARATOR = '\n\n---\n\n';

export type ConflictStrategy = 'append' | 'overwrite' | 'skip';

/**
 * Writes content to destPath based on the given strategy.
 * Returns true if the file was written, false if skipped.
 */
export async function installFile(
  content: string,
  destPath: string,
  strategy: ConflictStrategy,
): Promise<boolean> {
  if (strategy === 'skip') return false;

  await mkdir(dirname(destPath), { recursive: true });

  if (strategy === 'append') {
    let existing = '';
    try {
      existing = await readFile(destPath, 'utf-8');
    } catch {
      // File doesn't exist, treat as fresh write
    }
    const trimmed = existing.trimEnd();
    const separator = trimmed.length > 0 ? APPEND_SEPARATOR : '';
    await writeFile(destPath, trimmed + separator + content, 'utf-8');
    return true;
  }

  // overwrite
  await writeFile(destPath, content, 'utf-8');
  return true;
}

/**
 * Checks whether a file exists at the given path.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
      return false;
    }
    throw err;
  }
}

/**
 * Determines how to handle a file conflict.
 * - If skipPrompts (--yes): always overwrite
 * - If main doc (CLAUDE.md, etc.): ask Append / Overwrite / Skip
 * - Otherwise: ask Overwrite / Skip
 */
export async function resolveConflict(
  filePath: string,
  isMainDoc: boolean,
  skipPrompts: boolean,
): Promise<ConflictStrategy> {
  if (skipPrompts) return isMainDoc ? 'append' : 'overwrite';
  return askFileConflict(filePath, isMainDoc);
}
