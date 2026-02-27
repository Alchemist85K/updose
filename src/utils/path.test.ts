import { describe, expect, it } from 'vitest';
import { ensureWithinDir } from './path.js';

describe('ensureWithinDir', () => {
  const root = '/project';

  it('allows a normal relative path', () => {
    expect(ensureWithinDir(root, 'src/index.ts')).toBe(
      '/project/src/index.ts',
    );
  });

  it('allows nested paths', () => {
    expect(ensureWithinDir(root, '.claude/commands/review.md')).toBe(
      '/project/.claude/commands/review.md',
    );
  });

  it('allows the root directory itself', () => {
    expect(ensureWithinDir(root, '.')).toBe('/project');
  });

  it('blocks path traversal with ../', () => {
    expect(() => ensureWithinDir(root, '../etc/passwd')).toThrow(
      'Path traversal detected',
    );
  });

  it('blocks deeply nested traversal', () => {
    expect(() =>
      ensureWithinDir(root, 'a/b/../../../../etc/passwd'),
    ).toThrow('Path traversal detected');
  });

  it('blocks absolute path outside root', () => {
    expect(() => ensureWithinDir(root, '/etc/passwd')).toThrow(
      'Path traversal detected',
    );
  });

  it('allows path with .. that stays within root', () => {
    expect(ensureWithinDir(root, 'src/../lib/util.ts')).toBe(
      '/project/lib/util.ts',
    );
  });
});
