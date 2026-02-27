import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../utils/ui.js', () => ({
  warn: vi.fn(),
}));

import { readLockfile, writeLockfile } from './lockfile.js';
import type { Lockfile } from './lockfile.js';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'updose-test-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('readLockfile', () => {
  it('returns empty lockfile when file does not exist', async () => {
    const result = await readLockfile(tempDir);
    expect(result).toEqual({ version: 1, packages: {} });
  });

  it('reads a valid lockfile', async () => {
    const data: Lockfile = {
      version: 1,
      packages: {
        'user/repo': {
          version: '1.0.0',
          target: 'claude',
          installedAt: '2025-01-01T00:00:00.000Z',
          files: ['CLAUDE.md', '.claude/commands/review.md'],
        },
      },
    };
    await writeFile(
      join(tempDir, 'updose-lock.json'),
      JSON.stringify(data),
    );

    const result = await readLockfile(tempDir);
    expect(result.packages['user/repo']).toEqual(data.packages['user/repo']);
  });

  it('skips invalid entries', async () => {
    const data = {
      version: 1,
      packages: {
        'valid/repo': {
          version: '1.0.0',
          target: 'claude',
          installedAt: '2025-01-01T00:00:00.000Z',
          files: ['CLAUDE.md'],
        },
        'invalid/repo': {
          version: 123,
          target: 'claude',
        },
      },
    };
    await writeFile(
      join(tempDir, 'updose-lock.json'),
      JSON.stringify(data),
    );

    const result = await readLockfile(tempDir);
    expect(result.packages['valid/repo']).toBeDefined();
    expect(result.packages['invalid/repo']).toBeUndefined();
  });

  it('returns empty lockfile for corrupted JSON', async () => {
    await writeFile(
      join(tempDir, 'updose-lock.json'),
      'not valid json {{{',
    );

    const result = await readLockfile(tempDir);
    expect(result).toEqual({ version: 1, packages: {} });
  });

  it('returns empty lockfile when packages key is missing', async () => {
    await writeFile(
      join(tempDir, 'updose-lock.json'),
      JSON.stringify({ version: 1 }),
    );

    const result = await readLockfile(tempDir);
    expect(result).toEqual({ version: 1, packages: {} });
  });

  it('rejects entry with invalid target', async () => {
    const data = {
      version: 1,
      packages: {
        'user/repo': {
          version: '1.0.0',
          target: 'invalid-target',
          installedAt: '2025-01-01T00:00:00.000Z',
          files: [],
        },
      },
    };
    await writeFile(
      join(tempDir, 'updose-lock.json'),
      JSON.stringify(data),
    );

    const result = await readLockfile(tempDir);
    expect(result.packages['user/repo']).toBeUndefined();
  });

  it('rejects entry with non-string files', async () => {
    const data = {
      version: 1,
      packages: {
        'user/repo': {
          version: '1.0.0',
          target: 'claude',
          installedAt: '2025-01-01T00:00:00.000Z',
          files: [123, 456],
        },
      },
    };
    await writeFile(
      join(tempDir, 'updose-lock.json'),
      JSON.stringify(data),
    );

    const result = await readLockfile(tempDir);
    expect(result.packages['user/repo']).toBeUndefined();
  });
});

describe('writeLockfile', () => {
  it('writes a lockfile to disk', async () => {
    const data: Lockfile = {
      version: 1,
      packages: {
        'user/repo': {
          version: '1.0.0',
          target: 'claude',
          installedAt: '2025-01-01T00:00:00.000Z',
          files: ['CLAUDE.md'],
        },
      },
    };

    await writeLockfile(tempDir, data);

    const content = await readFile(
      join(tempDir, 'updose-lock.json'),
      'utf-8',
    );
    const parsed = JSON.parse(content);
    expect(parsed.version).toBe(1);
    expect(parsed.packages['user/repo'].version).toBe('1.0.0');
  });

  it('sorts packages alphabetically', async () => {
    const data: Lockfile = {
      version: 1,
      packages: {
        'z-user/repo': {
          version: '1.0.0',
          target: 'claude',
          installedAt: '2025-01-01T00:00:00.000Z',
          files: [],
        },
        'a-user/repo': {
          version: '2.0.0',
          target: 'codex',
          installedAt: '2025-01-01T00:00:00.000Z',
          files: [],
        },
      },
    };

    await writeLockfile(tempDir, data);

    const content = await readFile(
      join(tempDir, 'updose-lock.json'),
      'utf-8',
    );
    const keys = Object.keys(JSON.parse(content).packages);
    expect(keys).toEqual(['a-user/repo', 'z-user/repo']);
  });

  it('writes with trailing newline and pretty print', async () => {
    const data: Lockfile = { version: 1, packages: {} };
    await writeLockfile(tempDir, data);

    const content = await readFile(
      join(tempDir, 'updose-lock.json'),
      'utf-8',
    );
    expect(content).toContain('\n');
    expect(content.endsWith('\n')).toBe(true);
  });
});
