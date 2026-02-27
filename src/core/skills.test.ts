import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  getSkillDir,
  getSkillEntryPath,
  parseSkills,
  runSkillInstall,
} from './skills.js';

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}));

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
        { repo: 'user/skill-repo', skill: 'review' },
        { repo: 'user/skill-repo', skill: 'lint' },
      ],
    });
    expect(result.skills).toHaveLength(2);
    expect(result.skills[0]).toEqual({
      repo: 'user/skill-repo',
      skill: 'review',
    });
  });

  it('returns empty array for no skills', () => {
    const result = parseSkills({ skills: [] });
    expect(result.skills).toEqual([]);
  });

  it('trims whitespace from repo and skill', () => {
    const result = parseSkills({
      skills: [{ repo: '  user/repo  ', skill: '  review  ' }],
    });
    expect(result.skills[0]).toEqual({
      repo: 'user/repo',
      skill: 'review',
    });
  });

  it('skips entries missing repo', () => {
    const result = parseSkills({
      skills: [{ skill: 'review' }],
    });
    expect(result.skills).toEqual([]);
  });

  it('skips entries missing skill', () => {
    const result = parseSkills({
      skills: [{ repo: 'user/repo' }],
    });
    expect(result.skills).toEqual([]);
  });

  it('skips entries with empty repo after trim', () => {
    const result = parseSkills({
      skills: [{ repo: '   ', skill: 'review' }],
    });
    expect(result.skills).toEqual([]);
  });

  it('skips entries with empty skill after trim', () => {
    const result = parseSkills({
      skills: [{ repo: 'user/repo', skill: '   ' }],
    });
    expect(result.skills).toEqual([]);
  });

  it('skips non-object entries', () => {
    const result = parseSkills({
      skills: ['string', 42, null, { repo: 'user/repo', skill: 'ok' }],
    });
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0]!.skill).toBe('ok');
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

describe('runSkillInstall', () => {
  it('calls execFileSync with correct arguments', () => {
    const mockExecFileSync = vi.mocked(execFileSync);
    mockExecFileSync.mockReturnValue(Buffer.from(''));

    runSkillInstall('user/skill-repo', 'review', '/path/to/project');

    expect(mockExecFileSync).toHaveBeenCalledWith(
      'npx',
      ['skills', 'add', 'user/skill-repo', '--skill', 'review'],
      { cwd: '/path/to/project', stdio: 'inherit' },
    );
  });

  it('propagates errors from execFileSync', () => {
    const mockExecFileSync = vi.mocked(execFileSync);
    mockExecFileSync.mockImplementation(() => {
      throw new Error('npx not found');
    });

    expect(() => runSkillInstall('user/repo', 'test', '/tmp')).toThrow(
      'npx not found',
    );
  });
});
