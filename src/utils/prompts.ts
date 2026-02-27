import prompts from 'prompts';
import type { ConflictStrategy } from '../core/installer.js';
import type { Target } from '../core/targets.js';

/**
 * Prompts the user to select one or more targets.
 * Returns the selected targets, or an empty array if cancelled.
 * Auto-selects if only one target exists.
 */
export async function selectTargets(
  targets: readonly Target[],
): Promise<Target[]> {
  if (targets.length === 1) return [targets[0]!];

  const { selected } = await prompts({
    type: 'multiselect',
    name: 'selected',
    message: 'Select targets to install',
    choices: targets.map((t) => ({ title: t, value: t, selected: true })),
    min: 1,
    hint: '- Space to select, Enter to confirm',
  });

  return (selected as Target[]) ?? [];
}

/**
 * Asks the user how to handle a file conflict.
 * Main docs (CLAUDE.md, AGENTS.md, GEMINI.md) offer Append / Overwrite / Skip.
 * Other files offer Overwrite / Skip.
 * Returns "skip" if cancelled.
 */
export async function askFileConflict(
  filePath: string,
  isMainDoc: boolean,
): Promise<ConflictStrategy> {
  const choices = isMainDoc
    ? [
        { title: 'Append', value: 'append' as const },
        { title: 'Overwrite', value: 'overwrite' as const },
        { title: 'Skip', value: 'skip' as const },
      ]
    : [
        { title: 'Overwrite', value: 'overwrite' as const },
        { title: 'Skip', value: 'skip' as const },
      ];

  const { action } = await prompts({
    type: 'select',
    name: 'action',
    message: `${filePath} already exists`,
    choices,
  });

  return (action as ConflictStrategy) ?? 'skip';
}

/**
 * Asks the user to confirm an action. Returns true if confirmed, false otherwise.
 */
export async function confirm(message: string): Promise<boolean> {
  const { ok } = await prompts({
    type: 'confirm',
    name: 'ok',
    message,
    initial: true,
  });

  return ok ?? false;
}
