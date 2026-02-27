import { ensureWithinDir } from '../utils/path.js';
import type { TreeEntry } from './github.js';
import { fetchFile } from './github.js';
import { fileExists, installFile, resolveConflict } from './installer.js';
import type { Target } from './targets.js';
import { getSkillsDir, hasSkillsSupport } from './targets.js';

export interface Skill {
  name: string;
  description: string;
  path: string;
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

    const name = typeof e.name === 'string' ? e.name : null;
    const description = typeof e.description === 'string' ? e.description : '';
    const path = typeof e.path === 'string' ? e.path : null;

    if (!name || !path) continue;
    if (!/^[\w-]+$/.test(name)) continue;

    parsed.push({ name, description, path });
  }

  return { skills: parsed };
}

/**
 * Returns the local directory path for a skill (e.g., ".claude/skills/review").
 */
export function getSkillDir(target: Target, skillName: string): string {
  return `${getSkillsDir(target)}/${skillName}`;
}

/**
 * Returns the local path for a skill's SKILL.md entry file.
 */
export function getSkillEntryPath(target: Target, skillName: string): string {
  return `${getSkillsDir(target)}/${skillName}/SKILL.md`;
}

/**
 * Installs a skill from a boilerplate repo.
 * Skills are directory-based: each skill is a directory containing SKILL.md
 * and optional supporting files.
 *
 * Returns the list of installed file paths (relative to cwd), or empty array if skipped.
 */
export async function installSkill(
  repo: string,
  skill: Skill,
  target: Target,
  cwd: string,
  skipPrompts: boolean,
  repoTree: TreeEntry[],
): Promise<string[]> {
  if (!hasSkillsSupport(target)) {
    return [];
  }

  const skillPrefix = skill.path.endsWith('/') ? skill.path : `${skill.path}/`;
  const skillFiles = repoTree.filter(
    (e) => e.type === 'blob' && e.path.startsWith(skillPrefix),
  );

  // Directory-based skill: install all files
  if (skillFiles.length > 0) {
    const installedFiles: string[] = [];

    for (const entry of skillFiles) {
      const relativePath = entry.path.slice(skillPrefix.length);
      if (!relativePath) continue;

      const destRelPath = `${getSkillDir(target, skill.name)}/${relativePath}`;
      const destPath = ensureWithinDir(cwd, destRelPath);

      const content = await fetchFile(repo, entry.path);
      if (content === null) continue;

      let strategy: 'overwrite' | 'append' | 'skip' = 'overwrite';
      if (await fileExists(destPath)) {
        strategy = await resolveConflict(destPath, false, skipPrompts);
      }

      if (await installFile(content, destPath, strategy)) {
        installedFiles.push(destRelPath);
      }
    }

    return installedFiles;
  }

  // Fallback: single-file skill (legacy) → install as SKILL.md
  const content = await fetchFile(repo, skill.path);
  if (content === null) {
    throw new Error(`Skill not found in repo: ${skill.path}`);
  }

  const destRelPath = getSkillEntryPath(target, skill.name);
  const destPath = ensureWithinDir(cwd, destRelPath);

  let strategy: 'overwrite' | 'append' | 'skip' = 'overwrite';
  if (await fileExists(destPath)) {
    strategy = await resolveConflict(destPath, false, skipPrompts);
  }

  if (await installFile(content, destPath, strategy)) {
    return [destRelPath];
  }

  return [];
}
