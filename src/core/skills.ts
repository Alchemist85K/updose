import { execSync } from 'node:child_process';

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

const SHELL_META = /[;&|`$(){}[\]<>!#~*?\n\r]/;

function validateCommand(parts: string[]): void {
  for (const part of parts) {
    if (SHELL_META.test(part)) {
      throw new Error(`Unsafe character in skill command: "${part}"`);
    }
  }
}

/**
 * Runs a skill install command by splitting it into executable + args.
 * execSync is used (instead of execFileSync) for npx resolution in managed Node environments (nvm, fnm, etc.).
 * Command parts are validated against shell metacharacters before execution.
 */
export function runSkillInstall(
  command: string,
  cwd: string,
  agents: string[],
): void {
  const parts = command.split(/\s+/);
  const [exe, ...args] = parts;
  if (!exe) {
    throw new Error(`Invalid skill command: "${command}"`);
  }
  if (agents.length > 0) {
    args.push('-a', ...agents);
  }
  args.push('--copy', '-y');
  validateCommand([exe, ...args]);
  execSync([exe, ...args].join(' '), {
    cwd,
    stdio: 'inherit',
  });
}
