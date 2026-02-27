import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import type { Target } from './targets.js';
import { getSkillsDir } from './targets.js';

export interface Skill {
  repo: string;
  skill: string;
}

export interface SkillsManifest {
  skills: Skill[];
}

export function parseSkills(raw: unknown): SkillsManifest {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Invalid skills.json: expected an object');
  }

  const obj = raw as Record<string, unknown>;
  const skills = obj.skills;

  if (!Array.isArray(skills)) {
    throw new Error('Invalid skills.json: "skills" must be an array');
  }

  const parsed: Skill[] = [];

  for (const entry of skills) {
    if (typeof entry !== 'object' || entry === null) continue;
    const e = entry as Record<string, unknown>;

    const repo = typeof e.repo === 'string' ? e.repo.trim() : null;
    const skill = typeof e.skill === 'string' ? e.skill.trim() : null;

    if (!repo || !skill) continue;

    parsed.push({ repo, skill });
  }

  return { skills: parsed };
}

/**
 * Returns the local directory path for a skill (e.g., ".claude/skills/review").
 */
export function getSkillDir(target: Target, skillName: string): string {
  return join(getSkillsDir(target), skillName);
}

/**
 * Returns the local path for a skill's SKILL.md entry file.
 */
export function getSkillEntryPath(target: Target, skillName: string): string {
  return join(getSkillsDir(target), skillName, 'SKILL.md');
}

/**
 * Runs `npx skills add <repo> --skill <skill>` to install an external skill.
 */
export function runSkillInstall(
  repo: string,
  skill: string,
  cwd: string,
): void {
  execFileSync('npx', ['skills', 'add', repo, '--skill', skill], {
    cwd,
    stdio: 'inherit',
  });
}
