import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getSkillDir, getSkillEntryPath, parseSkills } from './skills.js';

describe('getSkillDir', () => {
  it('returns skill directory for claude', () => {
    expect(getSkillDir('claude', 'review')).toBe(
      join('.claude', 'skills', 'review'),
    );
  });

  it('returns skill directory for codex', () => {
    expect(getSkillDir('codex', 'lint')).toBe(
      join('.agents', 'skills', 'lint'),
    );
  });

  it('returns skill directory for gemini', () => {
    expect(getSkillDir('gemini', 'test-runner')).toBe(
      join('.gemini', 'skills', 'test-runner'),
    );
  });
});

describe('getSkillEntryPath', () => {
  it('returns SKILL.md path for claude', () => {
    expect(getSkillEntryPath('claude', 'review')).toBe(
      join('.claude', 'skills', 'review', 'SKILL.md'),
    );
  });

  it('returns SKILL.md path for codex', () => {
    expect(getSkillEntryPath('codex', 'lint')).toBe(
      join('.agents', 'skills', 'lint', 'SKILL.md'),
    );
  });

  it('returns SKILL.md path for gemini', () => {
    expect(getSkillEntryPath('gemini', 'deploy')).toBe(
      join('.gemini', 'skills', 'deploy', 'SKILL.md'),
    );
  });
});

describe('parseSkills', () => {
  it('parses a valid skills manifest', () => {
    const result = parseSkills({
      skills: [
        { name: 'review', description: 'Code review', path: 'skills/review' },
        { name: 'lint', description: '', path: 'skills/lint' },
      ],
    });
    expect(result.skills).toHaveLength(2);
    expect(result.skills[0]).toEqual({
      name: 'review',
      description: 'Code review',
      path: 'skills/review',
    });
  });

  it('returns empty array for no skills', () => {
    const result = parseSkills({ skills: [] });
    expect(result.skills).toEqual([]);
  });

  it('defaults description to empty string when missing', () => {
    const result = parseSkills({
      skills: [{ name: 'review', path: 'skills/review' }],
    });
    expect(result.skills[0]!.description).toBe('');
  });

  it('skips entries missing name', () => {
    const result = parseSkills({
      skills: [{ description: 'no name', path: 'skills/x' }],
    });
    expect(result.skills).toEqual([]);
  });

  it('skips entries missing path', () => {
    const result = parseSkills({
      skills: [{ name: 'review', description: 'no path' }],
    });
    expect(result.skills).toEqual([]);
  });

  it('skips entries with invalid name characters', () => {
    const result = parseSkills({
      skills: [
        { name: 'valid-name', path: 'a' },
        { name: 'has spaces', path: 'b' },
        { name: 'has/slash', path: 'c' },
        { name: 'has.dot', path: 'd' },
      ],
    });
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0]!.name).toBe('valid-name');
  });

  it('skips non-object entries', () => {
    const result = parseSkills({
      skills: ['string', 42, null, { name: 'ok', path: 'p' }],
    });
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0]!.name).toBe('ok');
  });

  it('throws on null input', () => {
    expect(() => parseSkills(null)).toThrow('expected an object');
  });

  it('throws on non-object input', () => {
    expect(() => parseSkills('string')).toThrow('expected an object');
  });

  it('throws when skills is not an array', () => {
    expect(() => parseSkills({ skills: 'not-array' })).toThrow(
      '"skills" must be an array',
    );
  });

  it('throws when skills key is missing', () => {
    expect(() => parseSkills({})).toThrow('"skills" must be an array');
  });
});
