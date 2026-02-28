import { execFileSync } from 'node:child_process';
import { describe, expect, it, vi } from 'vitest';
import { parseSkills, runSkillInstall } from './skills.js';

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}));

describe('parseSkills', () => {
  it('parses a valid skills manifest', () => {
    const result = parseSkills({
      skills: [
        'npx skills add https://github.com/user/repo --skill review',
        'npx skills add https://github.com/user/repo --skill lint',
      ],
    });
    expect(result.skills).toHaveLength(2);
    expect(result.skills[0]).toBe(
      'npx skills add https://github.com/user/repo --skill review',
    );
  });

  it('returns empty array for no skills', () => {
    const result = parseSkills({ skills: [] });
    expect(result.skills).toEqual([]);
  });

  it('trims whitespace from commands', () => {
    const result = parseSkills({
      skills: ['  npx skills add repo --skill review  '],
    });
    expect(result.skills[0]).toBe('npx skills add repo --skill review');
  });

  it('skips empty strings', () => {
    const result = parseSkills({
      skills: ['', '  ', 'npx skills add repo --skill ok'],
    });
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0]).toBe('npx skills add repo --skill ok');
  });

  it('skips non-string entries', () => {
    const result = parseSkills({
      skills: [
        42,
        null,
        { repo: 'user/repo', skill: 'old' },
        'npx skills add repo --skill ok',
      ],
    });
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0]).toBe('npx skills add repo --skill ok');
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
  it('calls execFileSync with split command parts', () => {
    const mockExecFileSync = vi.mocked(execFileSync);
    mockExecFileSync.mockReturnValue(Buffer.from(''));

    runSkillInstall(
      'npx skills add https://github.com/user/repo --skill review',
      '/path/to/project',
    );

    expect(mockExecFileSync).toHaveBeenCalledWith(
      'npx',
      ['skills', 'add', 'https://github.com/user/repo', '--skill', 'review'],
      { cwd: '/path/to/project', stdio: 'inherit' },
    );
  });

  it('throws on empty command', () => {
    expect(() => runSkillInstall('', '/tmp')).toThrow('Invalid skill command');
  });

  it('propagates errors from execFileSync', () => {
    const mockExecFileSync = vi.mocked(execFileSync);
    mockExecFileSync.mockImplementation(() => {
      throw new Error('npx not found');
    });

    expect(() =>
      runSkillInstall('npx skills add repo --skill test', '/tmp'),
    ).toThrow('npx not found');
  });
});
