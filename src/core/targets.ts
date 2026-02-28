import { join } from 'node:path';

export const TARGETS = ['claude', 'codex', 'gemini'] as const;
export type Target = (typeof TARGETS)[number];

export const MAIN_DOCS: Record<Target, string> = {
  claude: 'CLAUDE.md',
  codex: 'AGENTS.md',
  gemini: 'GEMINI.md',
};

/**
 * Skills directory per target.
 * All three targets support skills with SKILL.md format.
 */
const SKILLS_DIRS: Record<Target, string> = {
  claude: join('.claude', 'skills'),
  codex: join('.agents', 'skills'),
  gemini: join('.gemini', 'skills'),
};

export function hasSkillsSupport(_target: Target): boolean {
  return true;
}

export function getSkillsDir(target: Target): string {
  const dir = SKILLS_DIRS[target];
  if (!dir) {
    throw new Error(`Target "${target}" does not support skills.`);
  }
  return dir;
}

export function isMainDoc(target: Target, relativePath: string): boolean {
  return relativePath === MAIN_DOCS[target];
}

/**
 * Maps a file's relative path (within the target source dir) to its local destination.
 *
 * Claude:  "commands/review.md"   → ".claude/commands/review.md"
 * Codex:   "utils/AGENTS.md"      → "utils/AGENTS.md"  (project root — .codex/ is config-only)
 * Gemini:  "commands/review.toml" → ".gemini/commands/review.toml"
 */
export function mapToLocalPath(target: Target, relativePath: string): string {
  if (isMainDoc(target, relativePath)) {
    return MAIN_DOCS[target];
  }

  switch (target) {
    case 'claude':
      return join('.claude', relativePath);
    case 'codex':
      return relativePath;
    case 'gemini':
      return join('.gemini', relativePath);
  }
}

export function getSourceDir(target: Target): string {
  return target;
}

export function shouldSkipFile(relativePath: string): boolean {
  return relativePath.endsWith('.gitkeep');
}

const TARGET_TO_AGENT: Record<Target, string> = {
  claude: 'claude-code',
  codex: 'codex',
  gemini: 'gemini-cli',
};

export function getAgentName(target: Target): string {
  return TARGET_TO_AGENT[target];
}
