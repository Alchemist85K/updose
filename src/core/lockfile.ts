import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { toPosix } from '../utils/path.js';
import { warn } from '../utils/ui.js';
import type { Target } from './targets.js';
import { TARGETS } from './targets.js';

const LOCKFILE_NAME = 'updose-lock.json';
const LOCKFILE_VERSION = 1;

export interface LockfileEntry {
  version: string;
  target: Target;
  installedAt: string;
  files: string[];
}

export interface Lockfile {
  version: number;
  packages: Record<string, LockfileEntry>;
}

function createEmpty(): Lockfile {
  return { version: LOCKFILE_VERSION, packages: {} };
}

function isValidEntry(entry: unknown): entry is LockfileEntry {
  if (typeof entry !== 'object' || entry === null) return false;
  const e = entry as Record<string, unknown>;
  return (
    typeof e.version === 'string' &&
    typeof e.target === 'string' &&
    (TARGETS as readonly string[]).includes(e.target) &&
    typeof e.installedAt === 'string' &&
    Array.isArray(e.files) &&
    e.files.every((f) => typeof f === 'string')
  );
}

export async function readLockfile(cwd: string): Promise<Lockfile> {
  const filePath = join(cwd, LOCKFILE_NAME);
  let content: string;

  try {
    content = await readFile(filePath, 'utf-8');
  } catch {
    return createEmpty();
  }

  try {
    const data = JSON.parse(content) as Record<string, unknown>;
    if (typeof data !== 'object' || data === null || !data.packages) {
      return createEmpty();
    }

    const packages = data.packages as Record<string, unknown>;
    const validated: Record<string, LockfileEntry> = {};

    for (const [key, entry] of Object.entries(packages)) {
      if (!isValidEntry(entry)) continue;
      validated[key] = entry;
    }

    return { version: LOCKFILE_VERSION, packages: validated };
  } catch {
    warn(
      'updose-lock.json is corrupted and will be reset. Existing install tracking may be lost.',
    );
    return createEmpty();
  }
}

export async function writeLockfile(
  cwd: string,
  data: Lockfile,
): Promise<void> {
  const filePath = join(cwd, LOCKFILE_NAME);
  const sorted: Record<string, LockfileEntry> = {};
  for (const key of Object.keys(data.packages).sort()) {
    const entry = data.packages[key]!;
    sorted[key] = { ...entry, files: entry.files.map(toPosix) };
  }
  const output = { ...data, packages: sorted };
  await writeFile(filePath, `${JSON.stringify(output, null, 2)}\n`, 'utf-8');
}
