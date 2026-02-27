import { warn } from '../utils/ui.js';
import type { Target } from './targets.js';
import { TARGETS } from './targets.js';

export interface Manifest {
  name: string;
  author: string;
  version: string;
  description?: string | undefined;
  targets: Target[];
  tags?: string[] | undefined;
}

export function parseManifest(raw: unknown): Manifest {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Invalid manifest: expected an object');
  }

  const obj = raw as Record<string, unknown>;

  return {
    name: requireString(obj, 'name'),
    author: requireString(obj, 'author'),
    version: requireString(obj, 'version'),
    description: optionalString(obj, 'description'),
    targets: requireTargets(obj),
    tags: optionalStringArray(obj, 'tags'),
  };
}

function requireString(obj: Record<string, unknown>, key: string): string {
  const value = obj[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(
      `Invalid manifest: "${key}" is required and must be a non-empty string`,
    );
  }
  return value;
}

function optionalString(
  obj: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = obj[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') {
    throw new Error(`Invalid manifest: "${key}" must be a string`);
  }
  return value;
}

function requireTargets(obj: Record<string, unknown>): Target[] {
  const value = obj.targets;
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(
      'Invalid manifest: "targets" is required and must be a non-empty array',
    );
  }

  const validTargets: Target[] = [];

  for (const t of value) {
    if (typeof t === 'string' && (TARGETS as readonly string[]).includes(t)) {
      validTargets.push(t as Target);
    } else if (typeof t === 'string') {
      warn(
        `Unknown target "${t}" in manifest — ignored. Valid targets: ${TARGETS.join(', ')}`,
      );
    }
  }

  if (validTargets.length === 0) {
    throw new Error(
      `Invalid manifest: "targets" must contain at least one of: ${TARGETS.join(', ')}`,
    );
  }

  return validTargets;
}

function optionalStringArray(
  obj: Record<string, unknown>,
  key: string,
): string[] | undefined {
  const value = obj[key];
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) {
    throw new Error(`Invalid manifest: "${key}" must be an array`);
  }
  return value.filter((v): v is string => typeof v === 'string');
}
