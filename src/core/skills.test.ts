import { execSync } from 'node:child_process';
import { describe, expect, it, vi } from 'vitest';
import { parseSkills, runSkillInstall } from './skills.js';

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
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
  it('appends agent flags, --copy, and -y to the command', () => {
    const mockExecSync = vi.mocked(execSync);
    mockExecSync.mockReturnValue(Buffer.from(''));

    runSkillInstall(
      'npx skills add https://github.com/user/repo --skill review',
      '/path/to/project',
      ['claude-code'],
    );

    expect(mockExecSync).toHaveBeenCalledWith(
      'npx skills add https://github.com/user/repo --skill review -a claude-code --copy -y',
      { cwd: '/path/to/project', stdio: 'inherit' },
    );
  });

  it('appends multiple agents', () => {
    const mockExecSync = vi.mocked(execSync);
    mockExecSync.mockReturnValue(Buffer.from(''));

    runSkillInstall('npx skills add repo --skill review', '/tmp', [
      'claude-code',
      'codex',
      'gemini-cli',
    ]);

    expect(mockExecSync).toHaveBeenCalledWith(
      'npx skills add repo --skill review -a claude-code codex gemini-cli --copy -y',
      { cwd: '/tmp', stdio: 'inherit' },
    );
  });

  it('appends --copy and -y even with empty agents', () => {
    const mockExecSync = vi.mocked(execSync);
    mockExecSync.mockReturnValue(Buffer.from(''));

    runSkillInstall('npx skills add repo --skill review', '/tmp', []);

    expect(mockExecSync).toHaveBeenCalledWith(
      'npx skills add repo --skill review --copy -y',
      { cwd: '/tmp', stdio: 'inherit' },
    );
  });

  it('rejects command with shell metacharacters', () => {
    expect(() =>
      runSkillInstall('npx skills add repo; rm -rf /', '/tmp', []),
    ).toThrow('Unsafe character');
  });

  it('rejects command with pipe', () => {
    expect(() =>
      runSkillInstall('npx skills add repo | cat /etc/passwd', '/tmp', []),
    ).toThrow('Unsafe character');
  });

  it('rejects command with backtick', () => {
    expect(() =>
      runSkillInstall('npx skills add `whoami`', '/tmp', []),
    ).toThrow('Unsafe character');
  });

  it('rejects command with $() substitution', () => {
    expect(() =>
      runSkillInstall('npx skills add $(whoami)', '/tmp', []),
    ).toThrow('Unsafe character');
  });

  it('throws on empty command', () => {
    expect(() => runSkillInstall('', '/tmp', [])).toThrow(
      'Invalid skill command',
    );
  });

  it('propagates errors from execSync', () => {
    const mockExecSync = vi.mocked(execSync);
    mockExecSync.mockImplementation(() => {
      throw new Error('npx not found');
    });

    expect(() =>
      runSkillInstall('npx skills add repo --skill test', '/tmp', [
        'claude-code',
      ]),
    ).toThrow('npx not found');
  });
});
