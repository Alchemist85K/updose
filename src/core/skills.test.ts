import { exec } from 'node:child_process';
import { describe, expect, it, vi } from 'vitest';
import { formatSkillLabel, parseSkills, runSkillInstall } from './skills.js';

vi.mock('node:child_process', () => ({
  exec: vi.fn(),
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
  it('appends agent flags, --copy, and -y to the command', async () => {
    const mockExec = vi.mocked(exec);
    mockExec.mockImplementation((_cmd, _opts, cb) => {
      (cb as (err: Error | null) => void)(null);
      return {} as ReturnType<typeof exec>;
    });

    await runSkillInstall(
      'npx skills add https://github.com/user/repo --skill review',
      '/path/to/project',
      ['claude-code'],
    );

    expect(mockExec).toHaveBeenCalledWith(
      'npx skills add https://github.com/user/repo --skill review -a claude-code --copy -y',
      { cwd: '/path/to/project' },
      expect.any(Function),
    );
  });

  it('appends multiple agents', async () => {
    const mockExec = vi.mocked(exec);
    mockExec.mockImplementation((_cmd, _opts, cb) => {
      (cb as (err: Error | null) => void)(null);
      return {} as ReturnType<typeof exec>;
    });

    await runSkillInstall('npx skills add repo --skill review', '/tmp', [
      'claude-code',
      'codex',
      'gemini-cli',
    ]);

    expect(mockExec).toHaveBeenCalledWith(
      'npx skills add repo --skill review -a claude-code codex gemini-cli --copy -y',
      { cwd: '/tmp' },
      expect.any(Function),
    );
  });

  it('appends --copy and -y even with empty agents', async () => {
    const mockExec = vi.mocked(exec);
    mockExec.mockImplementation((_cmd, _opts, cb) => {
      (cb as (err: Error | null) => void)(null);
      return {} as ReturnType<typeof exec>;
    });

    await runSkillInstall('npx skills add repo --skill review', '/tmp', []);

    expect(mockExec).toHaveBeenCalledWith(
      'npx skills add repo --skill review --copy -y',
      { cwd: '/tmp' },
      expect.any(Function),
    );
  });

  it('rejects command with shell metacharacters', async () => {
    await expect(
      runSkillInstall('npx skills add repo; rm -rf /', '/tmp', []),
    ).rejects.toThrow('Unsafe character');
  });

  it('rejects command with pipe', async () => {
    await expect(
      runSkillInstall('npx skills add repo | cat /etc/passwd', '/tmp', []),
    ).rejects.toThrow('Unsafe character');
  });

  it('rejects command with backtick', async () => {
    await expect(
      runSkillInstall('npx skills add `whoami`', '/tmp', []),
    ).rejects.toThrow('Unsafe character');
  });

  it('rejects command with $() substitution', async () => {
    await expect(
      runSkillInstall('npx skills add $(whoami)', '/tmp', []),
    ).rejects.toThrow('Unsafe character');
  });

  it('throws on empty command', async () => {
    await expect(runSkillInstall('', '/tmp', [])).rejects.toThrow(
      'Invalid skill command',
    );
  });

  it('propagates errors from exec', async () => {
    const mockExec = vi.mocked(exec);
    mockExec.mockImplementation((_cmd, _opts, cb) => {
      (cb as (err: Error | null) => void)(new Error('npx not found'));
      return {} as ReturnType<typeof exec>;
    });

    await expect(
      runSkillInstall('npx skills add repo --skill test', '/tmp', [
        'claude-code',
      ]),
    ).rejects.toThrow('npx not found');
  });
});

describe('formatSkillLabel', () => {
  it('extracts user/repo > skill-name from full command', () => {
    expect(
      formatSkillLabel(
        'npx skills add https://github.com/user/repo --skill review',
      ),
    ).toBe('user/repo > review');
  });

  it('handles .git suffix in URL', () => {
    expect(
      formatSkillLabel(
        'npx skills add https://github.com/user/repo.git --skill lint',
      ),
    ).toBe('user/repo > lint');
  });

  it('falls back to stripping npx skills add prefix', () => {
    expect(formatSkillLabel('npx skills add some-local-path')).toBe(
      'some-local-path',
    );
  });

  it('returns full command when no prefix match', () => {
    expect(formatSkillLabel('custom-installer run thing')).toBe(
      'custom-installer run thing',
    );
  });
});
