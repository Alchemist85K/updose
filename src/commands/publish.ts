import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import chalk from 'chalk';
import { registerBoilerplate } from '../api/client.js';
import { login } from '../auth/github-oauth.js';
import { GITHUB_API_URL, MANIFEST_FILENAME, USER_AGENT } from '../constants.js';
import type { Manifest } from '../core/manifest.js';
import { parseManifest } from '../core/manifest.js';
import { confirm } from '../utils/prompts.js';
import { createSpinner, info, error as logError } from '../utils/ui.js';

const FETCH_TIMEOUT_MS = 10_000;

export async function publishCommand(options: { dir?: string }): Promise<void> {
  const cwd = process.cwd();
  const dir = options.dir;
  const manifestDir = dir ? join(cwd, dir) : cwd;

  // Step 0: Validate dir exists
  if (dir && !existsSync(manifestDir)) {
    logError(`Directory "${dir}" does not exist.`);
    process.exitCode = 1;
    return;
  }

  // Step 1: Read and parse updose.json
  let raw: unknown;
  try {
    const content = await readFile(
      join(manifestDir, MANIFEST_FILENAME),
      'utf-8',
    );
    raw = JSON.parse(content);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      const location = dir ? `"${dir}"` : 'current directory';
      logError(
        `No ${MANIFEST_FILENAME} found in ${location}. Run \`updose init\` first.`,
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

  // Step 3: Validate manifest author/name against repo
  const [repoOwner, repoName] = repo.split('/') as [string, string];
  if (manifest.author.toLowerCase() !== repoOwner.toLowerCase()) {
    logError(
      `Manifest author "${manifest.author}" does not match repository owner "${repoOwner}".`,
    );
    process.exitCode = 1;
    return;
  }
  const expectedName = dir ? `${repoName}/${dir}` : repoName;
  if (manifest.name.toLowerCase() !== expectedName.toLowerCase()) {
    logError(
      `Manifest name "${manifest.name}" does not match expected name "${expectedName}".`,
    );
    process.exitCode = 1;
    return;
  }

  // Step 4: Authenticate with GitHub
  info('Authentication required to publish.');
  let token: string;
  try {
    token = await login();
  } catch (err) {
    logError((err as Error).message);
    process.exitCode = 1;
    return;
  }

  // Step 5: Verify repo exists on GitHub
  let repoRes: Response;
  try {
    repoRes = await fetch(`${GITHUB_API_URL}/repos/${repo}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': USER_AGENT,
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    logError(
      'Failed to verify repository on GitHub. Check your network connection.',
    );
    process.exitCode = 1;
    return;
  }

  if (repoRes.status === 404) {
    logError(
      `Repository not found on GitHub: ${repo}\nMake sure you have pushed your code to GitHub.`,
    );
    process.exitCode = 1;
    return;
  }
  if (!repoRes.ok) {
    logError(
      `Failed to verify repository: ${repoRes.status} ${repoRes.statusText}`,
    );
    process.exitCode = 1;
    return;
  }

  // Step 6: Show what we're about to publish
  console.log();
  console.log(chalk.bold('Publishing:'));
  console.log(`  Name:        ${manifest.name}`);
  console.log(`  Version:     ${manifest.version}`);
  console.log(`  Repository:  ${repo}`);
  if (dir) {
    console.log(`  Directory:   ${dir}`);
  }
  console.log(`  Targets:     ${manifest.targets.join(', ')}`);
  if (manifest.tags?.length) {
    console.log(`  Tags:        ${manifest.tags.join(', ')}`);
  }
  const confirmed = await confirm('Publish to registry?');
  if (!confirmed) {
    info('Publish cancelled.');
    return;
  }

  // Step 7: Register with the API
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
      dir,
    );
    spinner.success('Published successfully!');
    console.log();
    const installPath = dir ? `${repo}/${dir}` : repo;
    info(
      `Users can now install with: ${chalk.cyan(`npx updose add ${installPath}`)}`,
    );
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
