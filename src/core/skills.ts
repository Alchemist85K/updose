import { exec } from 'node:child_process';

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
 * exec is used (instead of execFile) for npx resolution in managed Node environments (nvm, fnm, etc.).
 * Command parts are validated against shell metacharacters before execution.
 */
export function runSkillInstall(
  command: string,
  cwd: string,
  agents: string[],
): Promise<void> {
  const parts = command.split(/\s+/);
  const [exe, ...args] = parts;
  if (!exe) {
    return Promise.reject(new Error(`Invalid skill command: "${command}"`));
  }
  if (agents.length > 0) {
    args.push('-a', ...agents);
  }
  args.push('--copy', '-y');
  try {
    validateCommand([exe, ...args]);
  } catch (err) {
    return Promise.reject(err);
  }
  return new Promise<void>((resolve, reject) => {
    exec([exe, ...args].join(' '), { cwd }, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Extracts a human-readable label from a skill install command.
 * e.g. "npx skills add https://github.com/user/repo --skill review" → "user/repo > review"
 */
export function formatSkillLabel(command: string): string {
  const ghMatch = command.match(
    /github\.com\/([^/\s]+\/[^/\s]+?)(?:\.git)?(?:\s|$)/,
  );
  const skillMatch = command.match(/--skill\s+(\S+)/);

  if (ghMatch && skillMatch) {
    return `${ghMatch[1]} > ${skillMatch[1]}`;
  }

  // Fallback: strip "npx skills add" prefix
  return command.replace(/^npx\s+skills\s+add\s+/, '');
}
