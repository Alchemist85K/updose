import { execFileSync } from 'node:child_process';

export interface SkillsManifest {
  skills: string[];
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

  const parsed: string[] = [];

  for (const entry of skills) {
    if (typeof entry !== 'string') continue;
    const trimmed = entry.trim();
    if (!trimmed) continue;
    parsed.push(trimmed);
  }

  return { skills: parsed };
}

/**
 * Runs a skill install command by splitting it into executable + args.
 * Uses execFileSync (no shell) to prevent command injection.
 */
export function runSkillInstall(command: string, cwd: string): void {
  const parts = command.split(/\s+/);
  const [exe, ...args] = parts;
  if (!exe) {
    throw new Error(`Invalid skill command: "${command}"`);
  }
  execFileSync(exe, args, {
    cwd,
    stdio: 'inherit',
  });
}
