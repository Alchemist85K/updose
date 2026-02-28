import { describe, expect, it } from 'vitest';
import { parseRepoInput } from './github.js';

describe('parseRepoInput', () => {
  it('parses owner/repo', () => {
    expect(parseRepoInput('owner/repo')).toEqual({
      repo: 'owner/repo',
      dir: undefined,
    });
  });

  it('parses owner/repo/dir', () => {
    expect(parseRepoInput('owner/repo/nextjs')).toEqual({
      repo: 'owner/repo',
      dir: 'nextjs',
    });
  });

  it('parses owner/repo/nested/dir', () => {
    expect(parseRepoInput('owner/repo/templates/v2')).toEqual({
      repo: 'owner/repo',
      dir: 'templates/v2',
    });
  });

  it('ignores trailing slash', () => {
    expect(parseRepoInput('owner/repo/')).toEqual({
      repo: 'owner/repo',
      dir: undefined,
    });
  });

  it('strips trailing slash from dir', () => {
    expect(parseRepoInput('owner/repo/nextjs/')).toEqual({
      repo: 'owner/repo',
      dir: 'nextjs',
    });
  });

  it('throws on empty string', () => {
    expect(() => parseRepoInput('')).toThrow('Invalid repository format');
  });

  it('throws on single segment', () => {
    expect(() => parseRepoInput('justname')).toThrow(
      'Invalid repository format',
    );
  });

  it('throws on missing owner', () => {
    expect(() => parseRepoInput('/repo')).toThrow('Invalid repository format');
  });

  it('throws on missing name', () => {
    expect(() => parseRepoInput('owner/')).toThrow('Invalid repository format');
  });
});
