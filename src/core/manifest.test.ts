import { describe, expect, it, vi } from 'vitest';

vi.mock('../utils/ui.js', () => ({
  warn: vi.fn(),
}));

import { parseManifest } from './manifest.js';

const validManifest = {
  name: 'test-boilerplate',
  author: 'testuser',
  version: '1.0.0',
  targets: ['claude'],
};

describe('parseManifest', () => {
  it('parses a valid manifest', () => {
    const result = parseManifest(validManifest);
    expect(result).toEqual({
      name: 'test-boilerplate',
      author: 'testuser',
      version: '1.0.0',
      description: undefined,
      targets: ['claude'],
      tags: undefined,
    });
  });

  it('treats null description as undefined', () => {
    const result = parseManifest({ ...validManifest, description: null });
    expect(result.description).toBeUndefined();
  });

  it('parses manifest with all optional fields', () => {
    const result = parseManifest({
      ...validManifest,
      description: 'A test boilerplate',
      tags: ['test', 'example'],
    });
    expect(result.description).toBe('A test boilerplate');
    expect(result.tags).toEqual(['test', 'example']);
  });

  it('parses manifest with multiple targets', () => {
    const result = parseManifest({
      ...validManifest,
      targets: ['claude', 'codex', 'gemini'],
    });
    expect(result.targets).toEqual(['claude', 'codex', 'gemini']);
  });

  it('filters out unknown targets with warning', async () => {
    const { warn } = await import('../utils/ui.js');
    const result = parseManifest({
      ...validManifest,
      targets: ['claude', 'unknown-target'],
    });
    expect(result.targets).toEqual(['claude']);
    expect(warn).toHaveBeenCalled();
  });

  it('filters non-string values from tags', () => {
    const result = parseManifest({
      ...validManifest,
      tags: ['valid', 42, null, 'also-valid'],
    });
    expect(result.tags).toEqual(['valid', 'also-valid']);
  });

  // --- error cases ---

  it('throws on null input', () => {
    expect(() => parseManifest(null)).toThrow('expected an object');
  });

  it('throws on non-object input', () => {
    expect(() => parseManifest('string')).toThrow('expected an object');
  });

  it('throws on missing name', () => {
    const { name: _, ...rest } = validManifest;
    expect(() => parseManifest(rest)).toThrow('"name" is required');
  });

  it('throws on empty name', () => {
    expect(() => parseManifest({ ...validManifest, name: '' })).toThrow(
      '"name" is required',
    );
  });

  it('throws on missing author', () => {
    const { author: _, ...rest } = validManifest;
    expect(() => parseManifest(rest)).toThrow('"author" is required');
  });

  it('throws on missing version', () => {
    const { version: _, ...rest } = validManifest;
    expect(() => parseManifest(rest)).toThrow('"version" is required');
  });

  it('throws on empty targets array', () => {
    expect(() => parseManifest({ ...validManifest, targets: [] })).toThrow(
      '"targets" is required',
    );
  });

  it('throws on non-array targets', () => {
    expect(() =>
      parseManifest({ ...validManifest, targets: 'claude' }),
    ).toThrow('"targets" is required');
  });

  it('throws when all targets are unknown', () => {
    expect(() =>
      parseManifest({ ...validManifest, targets: ['unknown'] }),
    ).toThrow('must contain at least one of');
  });

  it('throws on non-string description', () => {
    expect(() => parseManifest({ ...validManifest, description: 123 })).toThrow(
      '"description" must be a string',
    );
  });

  it('throws on non-array tags', () => {
    expect(() =>
      parseManifest({ ...validManifest, tags: 'not-array' }),
    ).toThrow('"tags" must be an array');
  });
});
