import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { toPosix } from '../utils/path.js';
import { warn } from '../utils/ui.js';
import type { Target } from './targets.js';
import { TARGETS } from './targets.js';

const LOCKFILE_NAME = 'updose-lock.json';
const LOCKFILE_VERSION = 1;

export interface SkillLockEntry {
  repo: string;
  skill: string;
}

export interface LockfileEntry {
  version: string;
  targets: Target[];
  installedAt: string;
  files: Record<string, string[]>;
  skills: SkillLockEntry[];
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
  if (typeof e.version !== 'string' || typeof e.installedAt !== 'string')
    return false;
  if (
    !Array.isArray(e.targets) ||
    e.targets.length === 0 ||
    !e.targets.every(
      (t) =>
        typeof t === 'string' && (TARGETS as readonly string[]).includes(t),
    )
  )
    return false;
  if (typeof e.files !== 'object' || e.files === null || Array.isArray(e.files))
    return false;
  const files = e.files as Record<string, unknown>;
  for (const [key, val] of Object.entries(files)) {
    if (!(TARGETS as readonly string[]).includes(key)) return false;
    if (!Array.isArray(val) || !val.every((f) => typeof f === 'string'))
      return false;
  }
  // skills is optional — validated if present, defaulted to [] after validation
  if (e.skills !== undefined) {
    if (!Array.isArray(e.skills)) return false;
    for (const s of e.skills) {
      if (typeof s !== 'object' || s === null) return false;
      const se = s as Record<string, unknown>;
      if (typeof se.repo !== 'string' || typeof se.skill !== 'string')
        return false;
    }
  }
  return true;
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
      // Default skills to [] if missing (backward compatibility)
      if (entry.skills === undefined) {
        entry.skills = [];
      }
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
    const normalizedFiles: Record<string, string[]> = {};
    for (const [target, paths] of Object.entries(entry.files)) {
      normalizedFiles[target] = paths.map(toPosix);
    }
    sorted[key] = { ...entry, files: normalizedFiles };
  }
  const output = { ...data, packages: sorted };
  await writeFile(filePath, `${JSON.stringify(output, null, 2)}\n`, 'utf-8');
}
