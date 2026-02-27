import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ensureWithinDir, toPosix } from './path.js';

describe('ensureWithinDir', () => {
  const root = resolve('/project');

  it('allows a normal relative path', () => {
    expect(ensureWithinDir(root, 'src/index.ts')).toBe(
      resolve('/project', 'src/index.ts'),
    );
  });

  it('allows nested paths', () => {
    expect(ensureWithinDir(root, '.claude/commands/review.md')).toBe(
      resolve('/project', '.claude/commands/review.md'),
    );
  });

  it('allows the root directory itself', () => {
    expect(ensureWithinDir(root, '.')).toBe(resolve('/project'));
  });

  it('blocks path traversal with ../', () => {
    expect(() => ensureWithinDir(root, '../etc/passwd')).toThrow(
      'Path traversal detected',
    );
  });

  it('blocks deeply nested traversal', () => {
    expect(() => ensureWithinDir(root, 'a/b/../../../../etc/passwd')).toThrow(
      'Path traversal detected',
    );
  });

  it('blocks absolute path outside root', () => {
    expect(() => ensureWithinDir(root, '/etc/passwd')).toThrow(
      'Path traversal detected',
    );
  });

  it('allows path with .. that stays within root', () => {
    expect(ensureWithinDir(root, 'src/../lib/util.ts')).toBe(
      resolve('/project', 'lib/util.ts'),
    );
  });
});

describe('toPosix', () => {
  it('converts backslashes to forward slashes', () => {
    expect(toPosix('.claude\\commands\\review.md')).toBe(
      '.claude/commands/review.md',
    );
  });

  it('leaves forward slashes unchanged', () => {
    expect(toPosix('.claude/commands/review.md')).toBe(
      '.claude/commands/review.md',
    );
  });

  it('handles mixed separators', () => {
    expect(toPosix('.claude\\commands/review.md')).toBe(
      '.claude/commands/review.md',
    );
  });

  it('handles empty string', () => {
    expect(toPosix('')).toBe('');
  });

  it('handles filename without separators', () => {
    expect(toPosix('CLAUDE.md')).toBe('CLAUDE.md');
  });
});
