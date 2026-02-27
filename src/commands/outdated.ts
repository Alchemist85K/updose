import chalk from 'chalk';
import { fetchManifest } from '../core/github.js';
import { readLockfile } from '../core/lockfile.js';
import { createSpinner, error, info, success, warn } from '../utils/ui.js';

export async function outdatedCommand(): Promise<void> {
  try {
    const cwd = process.cwd();
    const lockfile = await readLockfile(cwd);
    const repos = Object.keys(lockfile.packages);

    if (repos.length === 0) {
      info(
        'No boilerplates installed. Run `updose add <repo>` to install one.',
      );
      return;
    }

    const spinner = createSpinner('Checking for updates...').start();

    interface CheckResult {
      repo: string;
      current: string;
      latest: string;
      outdated: boolean;
      error?: string | undefined;
    }

    const settled = await Promise.allSettled(
      repos.map(async (repo): Promise<CheckResult> => {
        const entry = lockfile.packages[repo]!;
        const manifest = await fetchManifest(repo);
        return {
          repo,
          current: entry.version,
          latest: manifest.version,
          outdated: entry.version !== manifest.version,
        };
      }),
    );

    const results: CheckResult[] = settled.map((result, i) => {
      if (result.status === 'fulfilled') return result.value;
      const repo = repos[i]!;
      const entry = lockfile.packages[repo]!;
      const err = result.reason;
      return {
        repo,
        current: entry.version,
        latest: '?',
        outdated: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    });

    spinner.stop();

    // Display results
    const outdatedCount = results.filter((r) => r.outdated).length;
    const errorCount = results.filter((r) => r.error !== undefined).length;

    console.log();

    // Header
    const colRepo = 'Package';
    const colCurrent = 'Current';
    const colLatest = 'Latest';

    // Calculate column widths
    const repoWidth = Math.max(
      colRepo.length,
      ...results.map((r) => r.repo.length),
    );
    const currentWidth = Math.max(
      colCurrent.length,
      ...results.map((r) => r.current.length),
    );
    const latestWidth = Math.max(
      colLatest.length,
      ...results.map((r) => r.latest.length),
    );

    console.log(
      `  ${chalk.bold(colRepo.padEnd(repoWidth))}  ${chalk.bold(colCurrent.padEnd(currentWidth))}  ${chalk.bold(colLatest.padEnd(latestWidth))}`,
    );
    console.log(
      `  ${'─'.repeat(repoWidth)}  ${'─'.repeat(currentWidth)}  ${'─'.repeat(latestWidth)}  ${'─'.repeat(14)}`,
    );

    for (const result of results) {
      const repo = result.repo.padEnd(repoWidth);
      const current = result.current.padEnd(currentWidth);
      const latest = result.latest.padEnd(latestWidth);

      if (result.error !== undefined) {
        console.log(
          `  ${repo}  ${current}  ${chalk.red(latest)}  ${chalk.red('fetch error')}`,
        );
      } else if (result.outdated) {
        console.log(
          `  ${chalk.yellow(repo)}  ${current}  ${chalk.green(latest)}  ${chalk.yellow('update available')}`,
        );
      } else {
        console.log(
          `  ${repo}  ${current}  ${latest}  ${chalk.green('\u2713 up to date')}`,
        );
      }
    }

    console.log();

    if (outdatedCount > 0) {
      warn(
        `${outdatedCount} package(s) can be updated. Run \`updose update\` to update.`,
      );
    } else if (errorCount === 0) {
      success('All packages are up to date.');
    }

    if (errorCount > 0) {
      warn(
        `${errorCount} package(s) could not be checked. Check your network or GITHUB_TOKEN.`,
      );
    }
  } catch (err) {
    error(
      err instanceof Error
        ? err.message
        : 'An unexpected error occurred while checking for updates.',
    );
    process.exitCode = 1;
  }
}
