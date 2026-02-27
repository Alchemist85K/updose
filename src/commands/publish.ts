import { execSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import chalk from 'chalk';
import { registerBoilerplate } from '../api/client.js';
import { login } from '../auth/github-oauth.js';
import { MANIFEST_FILENAME } from '../constants.js';
import type { Manifest } from '../core/manifest.js';
import { parseManifest } from '../core/manifest.js';
import { confirm } from '../utils/prompts.js';
import { createSpinner, info, error as logError } from '../utils/ui.js';

export async function publishCommand(): Promise<void> {
  const cwd = process.cwd();

  // Step 1: Read and parse updose.json
  let raw: unknown;
  try {
    const content = await readFile(join(cwd, MANIFEST_FILENAME), 'utf-8');
    raw = JSON.parse(content);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      logError(
        `No ${MANIFEST_FILENAME} found in current directory. Run \`updose init\` first.`,
      );
    } else {
      logError(
        `Failed to read ${MANIFEST_FILENAME}: ${(err as Error).message}`,
      );
    }
    process.exitCode = 1;
    return;
  }

  let manifest: Manifest;
  try {
    manifest = parseManifest(raw);
  } catch (err) {
    logError((err as Error).message);
    process.exitCode = 1;
    return;
  }

  // Step 2: Detect GitHub repo from git remote
  const repo = detectRepo(cwd);
  if (!repo) {
    logError(
      'Could not detect GitHub repository. Make sure this is a git repo with a GitHub remote.',
    );
    process.exitCode = 1;
    return;
  }

  // Step 3: Authenticate with GitHub
  info('Authentication required to publish.');
  let token: string;
  try {
    token = await login();
  } catch (err) {
    logError((err as Error).message);
    process.exitCode = 1;
    return;
  }

  // Step 4: Show what we're about to publish
  console.log();
  console.log(chalk.bold('Publishing:'));
  console.log(`  Name:        ${manifest.name}`);
  console.log(`  Version:     ${manifest.version}`);
  console.log(`  Repository:  ${repo}`);
  console.log(`  Targets:     ${manifest.targets.join(', ')}`);
  if (manifest.tags?.length) {
    console.log(`  Tags:        ${manifest.tags.join(', ')}`);
  }
  const confirmed = await confirm('Publish to registry?');
  if (!confirmed) {
    info('Publish cancelled.');
    return;
  }

  // Step 5: Register with the API
  const spinner = createSpinner('Publishing to registry...').start();
  try {
    await registerBoilerplate(
      repo,
      {
        name: manifest.name,
        author: manifest.author,
        version: manifest.version,
        description: manifest.description,
        targets: manifest.targets,
        tags: manifest.tags,
      },
      token,
    );
    spinner.success('Published successfully!');
    console.log();
    info(`Users can now install with: ${chalk.cyan(`npx updose add ${repo}`)}`);
  } catch (err) {
    spinner.fail('Publication failed');
    logError((err as Error).message);
    process.exitCode = 1;
  }
}

function detectRepo(cwd: string): string | null {
  try {
    const remoteUrl = execSync('git remote get-url origin', {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    // https://github.com/owner/repo.git or https://github.com/owner/repo
    const httpsMatch = remoteUrl.match(
      /github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/,
    );
    if (httpsMatch) {
      return `${httpsMatch[1]}/${httpsMatch[2]}`;
    }

    // git@github.com:owner/repo.git
    const sshMatch = remoteUrl.match(
      /github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/,
    );
    if (sshMatch) {
      return `${sshMatch[1]}/${sshMatch[2]}`;
    }

    return null;
  } catch {
    return null;
  }
}
