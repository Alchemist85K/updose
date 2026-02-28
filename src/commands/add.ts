import { recordDownload } from '../api/client.js';
import type { TreeEntry } from '../core/github.js';
import {
  fetchFile,
  fetchManifest,
  fetchRepoTree,
  fetchSkillsJson,
} from '../core/github.js';
import { fileExists, installFile, resolveConflict } from '../core/installer.js';
import type { Manifest } from '../core/manifest.js';
import type { SkillsManifest } from '../core/skills.js';
import {
  formatSkillLabel,
  parseSkills,
  runSkillInstall,
} from '../core/skills.js';
import type { Target } from '../core/targets.js';
import {
  getAgentName,
  getSourceDir,
  isMainDoc,
  mapToLocalPath,
  shouldSkipFile,
} from '../core/targets.js';
import { ensureWithinDir, toPosix } from '../utils/path.js';
import { selectTargets } from '../utils/prompts.js';
import {
  createMultiSpinner,
  createSpinner,
  error,
  info,
  success,
  warn,
} from '../utils/ui.js';

const SKILL_CONCURRENCY = 5;

async function settledPool<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (next < tasks.length) {
      const i = next++;
      try {
        results[i] = { status: 'fulfilled', value: await tasks[i]!() };
      } catch (reason) {
        results[i] = { status: 'rejected', reason };
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, worker),
  );
  return results;
}

interface AddOptions {
  yes?: boolean | undefined;
  dryRun?: boolean | undefined;
}

export async function addCommand(
  repo: string,
  options: AddOptions,
): Promise<void> {
  try {
    const cwd = process.cwd();
    const skipPrompts = options.yes ?? false;
    const dryRun = options.dryRun ?? false;

    // 1. Fetch and validate manifest
    const manifestSpinner = createSpinner('Fetching updose.json...').start();
    let manifest: Manifest;
    try {
      manifest = await fetchManifest(repo);
      manifestSpinner.success(
        `Found ${manifest.name} by ${manifest.author} (v${manifest.version})`,
      );
    } catch (err) {
      manifestSpinner.fail('Failed to fetch manifest');
      throw err;
    }

    // 2. Select targets
    let selectedTargets: Target[];
    if (skipPrompts) {
      selectedTargets = [...manifest.targets];
      if (manifest.targets.length > 1) {
        info(`Auto-selected targets: ${selectedTargets.join(', ')}`);
      }
    } else {
      selectedTargets = await selectTargets(manifest.targets);
    }

    if (selectedTargets.length === 0) {
      info('Installation cancelled.');
      return;
    }

    // 3. Fetch repo tree
    const treeSpinner = createSpinner('Fetching file list...').start();
    let tree: TreeEntry[];
    try {
      tree = await fetchRepoTree(repo);
      treeSpinner.success('File list fetched');
    } catch (err) {
      treeSpinner.fail('Failed to fetch file list');
      throw err;
    }

    // 4. Filter files for selected targets
    const filesByTarget = new Map<
      Target,
      { entry: TreeEntry; prefix: string }[]
    >();
    for (const target of selectedTargets) {
      const sourceDir = getSourceDir(target);
      const prefix = `${sourceDir}/`;
      const files = tree.filter((entry) => {
        if (!entry.path.startsWith(prefix)) return false;
        const relativePath = entry.path.slice(prefix.length);
        if (!relativePath) return false;
        if (shouldSkipFile(relativePath)) return false;
        return true;
      });
      if (files.length > 0) {
        filesByTarget.set(
          target,
          files.map((entry) => ({ entry, prefix })),
        );
      }
    }

    if (filesByTarget.size === 0) {
      warn(`No files found for selected targets in ${repo}`);
      return;
    }

    // 5. Dry run — just list files
    if (dryRun) {
      console.log();
      info('Dry run — the following files would be installed:\n');

      let dryRunCount = 0;

      for (const [target, files] of filesByTarget) {
        console.log(`  [${target}]`);
        for (const { entry, prefix } of files) {
          const relativePath = entry.path.slice(prefix.length);
          const localRelPath = mapToLocalPath(target, relativePath);
          ensureWithinDir(cwd, localRelPath);
          console.log(`    ${entry.path} → ${toPosix(localRelPath)}`);
          dryRunCount++;
        }
      }

      // Check skills
      const skillsContent = await fetchSkillsJson(repo);
      if (skillsContent !== null) {
        try {
          const skillsManifest = parseSkills(
            JSON.parse(skillsContent) as unknown,
          );
          if (skillsManifest.skills.length > 0) {
            console.log();
            info('Skills that would be installed:\n');
            for (const skill of skillsManifest.skills) {
              console.log(`  ${skill}`);
            }
          }
        } catch {
          warn('Invalid skills.json — skills would be skipped');
        }
      }

      console.log();
      info(`Dry run complete. ${dryRunCount} file(s) would be installed.`);
      return;
    }

    // 6. Install files
    console.log();

    let installed = 0;
    let skipped = 0;

    for (const [target, files] of filesByTarget) {
      if (filesByTarget.size > 1) {
        info(`Installing ${target} files...\n`);
      }

      for (const { entry, prefix } of files) {
        const relativePath = entry.path.slice(prefix.length);
        const localRelPath = mapToLocalPath(target, relativePath);
        const destPath = ensureWithinDir(cwd, localRelPath);

        // Determine conflict strategy
        let strategy: 'overwrite' | 'append' | 'skip' = 'overwrite';
        const exists = await fileExists(destPath);
        if (exists) {
          strategy = await resolveConflict(
            localRelPath,
            isMainDoc(target, relativePath),
            skipPrompts,
          );
        }

        if (strategy === 'skip') {
          warn(`Skipped ${localRelPath}`);
          skipped++;
          continue;
        }

        // Fetch file content
        const content = await fetchFile(repo, entry.path);
        if (content === null) {
          warn(`Could not fetch ${entry.path} — skipped`);
          skipped++;
          continue;
        }

        await installFile(content, destPath, strategy);
        success(`Installed ${localRelPath}`);
        installed++;
      }
    }

    // 7. Install skills
    let skillsInstalled = 0;

    const skillsContent = await fetchSkillsJson(repo);

    if (skillsContent === null) {
      info('No skills.json found — skipping skills installation.');
    } else {
      let skillsManifest: SkillsManifest | undefined;
      try {
        skillsManifest = parseSkills(JSON.parse(skillsContent) as unknown);
      } catch {
        warn('Invalid skills.json — skills installation skipped');
      }

      if (skillsManifest && skillsManifest.skills.length > 0) {
        console.log();
        info('Installing skills...\n');

        const agents = selectedTargets.map(getAgentName);
        const labels = skillsManifest.skills.map(formatSkillLabel);
        const spinner = createMultiSpinner(labels).start();

        const results = await settledPool(
          skillsManifest.skills.map(
            (skill, i) => () =>
              runSkillInstall(skill, cwd, agents).then(
                () => spinner.markSuccess(i),
                (err) => {
                  spinner.markFail(i);
                  throw err;
                },
              ),
          ),
          SKILL_CONCURRENCY,
        );

        spinner.stop();

        for (const result of results) {
          if (result.status === 'fulfilled') {
            skillsInstalled++;
          }
        }

        for (let i = 0; i < results.length; i++) {
          const r = results[i]!;
          if (r.status === 'rejected') {
            warn(
              `Failed to install skill "${skillsManifest.skills[i]}": ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`,
            );
          }
        }
      }
    }

    // Summary
    console.log();
    const summary =
      skillsInstalled > 0
        ? `${installed} file(s) + ${skillsInstalled} skill(s)`
        : `${installed} file(s)`;
    success(`Done! ${summary} installed, ${skipped} skipped.`);
    // Telemetry (best-effort, silent failures)
    if (installed + skillsInstalled > 0) {
      await recordDownload(repo).catch(() => {});
    }
  } catch (err) {
    error(
      err instanceof Error
        ? err.message
        : 'An unexpected error occurred during installation.',
    );
    process.exitCode = 1;
  }
}
