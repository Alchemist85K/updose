import { execSync } from 'node:child_process';
import { basename, join } from 'node:path';
import prompts from 'prompts';
import { fileExists, installFile } from '../core/installer.js';

const DEFAULT_VERSION = '0.1.0';
const GH_CLI_TIMEOUT_MS = 10_000;

import type { Target } from '../core/targets.js';
import { MAIN_DOCS, TARGETS } from '../core/targets.js';
import { error, info, success, warn } from '../utils/ui.js';

interface ScaffoldFile {
  path: string;
  content: string;
}

/**
 * Files to scaffold per target.
 * Paths are relative to the project root (as they live in the boilerplate repo).
 */
const TARGET_SCAFFOLDS: Record<Target, string[]> = {
  claude: [
    'claude/CLAUDE.md',
    'claude/rules/.gitkeep',
    'claude/agents/.gitkeep',
    'claude/skills/.gitkeep',
  ],
  codex: ['codex/AGENTS.md'],
  gemini: ['gemini/GEMINI.md', 'gemini/skills/.gitkeep'],
};

function getMainDocContent(target: Target, name: string): string {
  const docs: Record<Target, string> = {
    claude: `# ${name}\n\nAdd your Claude Code instructions here.\n`,
    codex: `# ${name}\n\nAdd your Codex agent instructions here.\n`,
    gemini: `# ${name}\n\nAdd your Gemini instructions here.\n`,
  };
  return docs[target];
}

function getGitHubUsername(): string {
  try {
    const ghUser = execSync('git config github.user', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    if (ghUser) return ghUser;
  } catch {
    // git config github.user not set
  }

  try {
    const login = execSync('gh api user --jq .login', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: GH_CLI_TIMEOUT_MS,
    }).trim();
    if (login) return login;
  } catch {
    // gh CLI not available or not authenticated
  }

  return '';
}

function buildFileList(
  name: string,
  description: string,
  author: string,
  targets: Target[],
): ScaffoldFile[] {
  const files: ScaffoldFile[] = [];

  // updose.json
  const manifest: Record<string, unknown> = {
    name,
    author,
    version: DEFAULT_VERSION,
    targets,
  };
  if (description) manifest.description = description;
  files.push({
    path: 'updose.json',
    content: `${JSON.stringify(manifest, null, 2)}\n`,
  });

  // skills.json
  files.push({
    path: 'skills.json',
    content: `${JSON.stringify({ skills: [] }, null, 2)}\n`,
  });

  // README.md
  const targetList = targets.map((t) => `- ${t}`).join('\n');
  const desc = description || 'An updose boilerplate.';
  files.push({
    path: 'README.md',
    content: [
      `# ${name}`,
      '',
      desc,
      '',
      '## Targets',
      '',
      targetList,
      '',
      '## Installation',
      '',
      '```bash',
      `npx updose add ${author}/${name}`,
      '```',
      '',
    ].join('\n'),
  });

  // Target-specific files
  for (const target of targets) {
    for (const filePath of TARGET_SCAFFOLDS[target]!) {
      const isMainDoc = filePath === `${target}/${MAIN_DOCS[target]}`;
      files.push({
        path: filePath,
        content: isMainDoc ? getMainDocContent(target, name) : '',
      });
    }
  }

  return files;
}

export async function initCommand(): Promise<void> {
  try {
    const cwd = process.cwd();
    const defaultName = basename(cwd);
    const gitUser = getGitHubUsername();

    info('Scaffolding a new updose boilerplate...\n');

    let cancelled = false;
    const response = await prompts(
      [
        {
          type: 'text',
          name: 'name',
          message: 'Boilerplate name',
          initial: defaultName,
          validate: (v: string) => v.trim().length > 0 || 'Name is required',
        },
        {
          type: 'text',
          name: 'description',
          message: 'Description',
        },
        {
          type: 'text',
          name: 'author',
          message: 'Author (GitHub username)',
          initial: gitUser,
          validate: (v: string) => v.trim().length > 0 || 'Author is required',
        },
        {
          type: 'multiselect',
          name: 'targets',
          message: 'Select targets',
          choices: TARGETS.map((t) => ({
            title: t,
            value: t,
            selected: true,
          })),
          min: 1,
          hint: '- Space to select, Enter to confirm',
        },
      ],
      {
        onCancel: () => {
          cancelled = true;
        },
      },
    );

    if (cancelled || !response.targets || response.targets.length === 0) {
      info('Init cancelled.');
      return;
    }

    const name = (response.name as string).trim();
    const description = ((response.description as string) ?? '').trim();
    const author = (response.author as string).trim();
    const targets = response.targets as Target[];

    const files = buildFileList(name, description, author, targets);

    console.log();
    let created = 0;
    let skipped = 0;

    for (const file of files) {
      const destPath = join(cwd, file.path);
      const exists = await fileExists(destPath);

      if (exists) {
        const { action } = await prompts({
          type: 'select',
          name: 'action',
          message: `${file.path} already exists`,
          choices: [
            { title: 'Overwrite', value: 'overwrite' },
            { title: 'Skip', value: 'skip' },
          ],
        });

        if (!action || action === 'skip') {
          warn(`Skipped ${file.path}`);
          skipped++;
          continue;
        }
      }

      await installFile(file.content, destPath, 'overwrite');
      success(`Created ${file.path}`);
      created++;
    }

    console.log();
    success(`Boilerplate scaffolded! (${created} created, ${skipped} skipped)`);
    console.log();
    info('Next steps:');
    console.log(
      `  1. Edit your boilerplate files in ${targets.map((t) => `${t}/`).join(', ')}`,
    );
    console.log('  2. Push to GitHub');
    console.log(
      `  3. Others can install with: npx updose add ${author}/${name}`,
    );
  } catch (err) {
    error(
      err instanceof Error
        ? err.message
        : 'An unexpected error occurred during init.',
    );
    process.exitCode = 1;
  }
}
