import { recordDownload } from '../api/client.js';
import type { TreeEntry } from '../core/github.js';
import {
  fetchFile,
  fetchManifest,
  fetchRepoTree,
  fetchSkillsJson,
} from '../core/github.js';
import { fileExists, installFile, resolveConflict } from '../core/installer.js';
import type { SkillLockEntry } from '../core/lockfile.js';
import { readLockfile, writeLockfile } from '../core/lockfile.js';
import type { Manifest } from '../core/manifest.js';
import type { SkillsManifest } from '../core/skills.js';
import { parseSkills, runSkillInstall } from '../core/skills.js';
import type { Target } from '../core/targets.js';
import {
  getSourceDir,
  isMainDoc,
  mapToLocalPath,
  shouldSkipFile,
} from '../core/targets.js';
import { ensureWithinDir, toPosix } from '../utils/path.js';
import { selectTarget } from '../utils/prompts.js';
import { createSpinner, error, info, success, warn } from '../utils/ui.js';

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

    // 2. Select target
    let target: Target | null;
    if (skipPrompts) {
      target = manifest.targets[0]!;
      if (manifest.targets.length > 1) {
        info(`Auto-selected target: ${target}`);
      }
    } else {
      target = await selectTarget(manifest.targets);
    }

    if (!target) {
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

    // 4. Filter files for selected target
    const sourceDir = getSourceDir(target);
    const prefix = `${sourceDir}/`;
    const targetFiles = tree.filter((entry) => {
      if (!entry.path.startsWith(prefix)) return false;
      const relativePath = entry.path.slice(prefix.length);
      if (!relativePath) return false;
      if (shouldSkipFile(relativePath)) return false;
      return true;
    });

    if (targetFiles.length === 0) {
      warn(`No files found for target "${target}" in ${repo}`);
      return;
    }

    // 5. Dry run — just list files
    if (dryRun) {
      console.log();
      info('Dry run — the following files would be installed:\n');

      const dryRunFiles: string[] = [];

      for (const entry of targetFiles) {
        const relativePath = entry.path.slice(prefix.length);
        const localRelPath = mapToLocalPath(target, relativePath);
        ensureWithinDir(cwd, localRelPath);
        console.log(`  ${entry.path} → ${toPosix(localRelPath)}`);
        dryRunFiles.push(localRelPath);
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
              console.log(`  ${skill.skill} (from ${skill.repo})`);
            }
          }
        } catch {
          warn('Invalid skills.json — skills would be skipped');
        }
      }

      console.log();
      info(
        `Dry run complete. ${dryRunFiles.length} file(s) would be installed.`,
      );
      return;
    }

    // 6. Install files
    console.log();

    const installedFiles: string[] = [];
    let installed = 0;
    let skipped = 0;

    for (const entry of targetFiles) {
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
      installedFiles.push(localRelPath);
      installed++;
    }

    // 7. Install skills
    let skillsInstalled = 0;
    const installedSkillEntries: SkillLockEntry[] = [];

    const skillsContent = await fetchSkillsJson(repo);

    if (skillsContent !== null) {
      let skillsManifest: SkillsManifest | undefined;
      try {
        skillsManifest = parseSkills(JSON.parse(skillsContent) as unknown);
      } catch {
        warn('Invalid skills.json — skills installation skipped');
      }

      if (skillsManifest && skillsManifest.skills.length > 0) {
        console.log();
        info('Installing skills...\n');

        for (const skill of skillsManifest.skills) {
          try {
            runSkillInstall(skill.repo, skill.skill, cwd);
            success(`Installed skill: ${skill.skill} (from ${skill.repo})`);
            installedSkillEntries.push({
              repo: skill.repo,
              skill: skill.skill,
            });
            skillsInstalled++;
          } catch (err) {
            warn(
              `Failed to install skill "${skill.skill}": ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }
      }
    }

    // 8. Update lockfile
    if (installedFiles.length > 0 || installedSkillEntries.length > 0) {
      const lockfile = await readLockfile(cwd);
      const existing = lockfile.packages[repo];
      const existingTargets = existing?.targets ?? [];
      const existingFiles = existing?.files ?? {};
      const existingSkills = existing?.skills ?? [];
      const mergedTargets = [...new Set([...existingTargets, target])];
      const mergedFiles = {
        ...existingFiles,
        [target]: installedFiles.map(toPosix),
      };
      // Deduplicate skills by repo+skill
      const allSkills = [...existingSkills, ...installedSkillEntries];
      const seen = new Set<string>();
      const mergedSkills: SkillLockEntry[] = [];
      for (const s of allSkills) {
        const key = `${s.repo}+${s.skill}`;
        if (!seen.has(key)) {
          seen.add(key);
          mergedSkills.push(s);
        }
      }
      lockfile.packages[repo] = {
        version: manifest.version,
        targets: mergedTargets,
        installedAt: new Date().toISOString(),
        files: mergedFiles,
        skills: mergedSkills,
      };
      await writeLockfile(cwd, lockfile);
    }

    // Summary
    console.log();
    const total = installed + skillsInstalled;
    success(`Done! ${total} file(s) installed, ${skipped} skipped.`);
    if (total > 0) {
      info(`Lockfile updated for ${repo}`);
    }

    // Telemetry (best-effort, silent failures)
    if (total > 0) {
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
