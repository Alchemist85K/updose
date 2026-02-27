import { describe, expect, it } from 'vitest';
import {
  MAIN_DOCS,
  TARGETS,
  getSkillsDir,
  getSourceDir,
  hasSkillsSupport,
  isMainDoc,
  mapToLocalPath,
  shouldSkipFile,
} from './targets.js';

describe('TARGETS', () => {
  it('contains claude, codex, gemini', () => {
    expect(TARGETS).toEqual(['claude', 'codex', 'gemini']);
  });
});

describe('MAIN_DOCS', () => {
  it('maps each target to its main doc', () => {
    expect(MAIN_DOCS.claude).toBe('CLAUDE.md');
    expect(MAIN_DOCS.codex).toBe('AGENTS.md');
    expect(MAIN_DOCS.gemini).toBe('GEMINI.md');
  });
});

describe('isMainDoc', () => {
  it('returns true for the correct main doc', () => {
    expect(isMainDoc('claude', 'CLAUDE.md')).toBe(true);
    expect(isMainDoc('codex', 'AGENTS.md')).toBe(true);
    expect(isMainDoc('gemini', 'GEMINI.md')).toBe(true);
  });

  it('returns false for non-main doc', () => {
    expect(isMainDoc('claude', 'AGENTS.md')).toBe(false);
    expect(isMainDoc('claude', 'commands/review.md')).toBe(false);
  });
});

describe('mapToLocalPath', () => {
  it('maps main doc to project root for all targets', () => {
    expect(mapToLocalPath('claude', 'CLAUDE.md')).toBe('CLAUDE.md');
    expect(mapToLocalPath('codex', 'AGENTS.md')).toBe('AGENTS.md');
    expect(mapToLocalPath('gemini', 'GEMINI.md')).toBe('GEMINI.md');
  });

  it('maps claude files to .claude/ directory', () => {
    expect(mapToLocalPath('claude', 'commands/review.md')).toBe(
      '.claude/commands/review.md',
    );
  });

  it('maps codex files to project root (no prefix)', () => {
    expect(mapToLocalPath('codex', 'utils/helper.md')).toBe(
      'utils/helper.md',
    );
  });

  it('maps gemini files to .gemini/ directory', () => {
    expect(mapToLocalPath('gemini', 'commands/review.toml')).toBe(
      '.gemini/commands/review.toml',
    );
  });
});

describe('getSkillsDir', () => {
  it('returns correct skills dir for each target', () => {
    expect(getSkillsDir('claude')).toBe('.claude/skills');
    expect(getSkillsDir('codex')).toBe('.agents/skills');
    expect(getSkillsDir('gemini')).toBe('.gemini/skills');
  });
});

describe('hasSkillsSupport', () => {
  it('returns true for all targets', () => {
    for (const target of TARGETS) {
      expect(hasSkillsSupport(target)).toBe(true);
    }
  });
});

describe('getSourceDir', () => {
  it('returns the target name as source dir', () => {
    expect(getSourceDir('claude')).toBe('claude');
    expect(getSourceDir('codex')).toBe('codex');
    expect(getSourceDir('gemini')).toBe('gemini');
  });
});

describe('shouldSkipFile', () => {
  it('skips .gitkeep files', () => {
    expect(shouldSkipFile('.gitkeep')).toBe(true);
    expect(shouldSkipFile('dir/.gitkeep')).toBe(true);
  });

  it('does not skip regular files', () => {
    expect(shouldSkipFile('readme.md')).toBe(false);
    expect(shouldSkipFile('commands/review.md')).toBe(false);
  });
});
