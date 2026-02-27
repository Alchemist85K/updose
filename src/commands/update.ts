import type { TreeEntry } from '../core/github.js';
import {
  fetchFile,
  fetchManifest,
  fetchRepoTree,
  fetchSkillsJson,
} from '../core/github.js';
import { fileExists, installFile, resolveConflict } from '../core/installer.js';
import type {
  Lockfile,
  LockfileEntry,
  SkillLockEntry,
} from '../core/lockfile.js';
import { readLockfile, writeLockfile } from '../core/lockfile.js';
import type { Manifest } from '../core/manifest.js';
import type { SkillsManifest } from '../core/skills.js';
import { parseSkills, runSkillInstall } from '../core/skills.js';
import {
  getSourceDir,
  isMainDoc,
  mapToLocalPath,
  shouldSkipFile,
} from '../core/targets.js';
import { ensureWithinDir, toPosix } from '../utils/path.js';
import { createSpinner, error, info, success, warn } from '../utils/ui.js';

interface UpdateOptions {
  yes?: boolean | undefined;
  dryRun?: boolean | undefined;
}

export async function updateCommand(
  repo: string | undefined,
  options: UpdateOptions,
): Promise<void> {
  try {
    const cwd = process.cwd();
    const skipPrompts = options.yes ?? false;
    const dryRun = options.dryRun ?? false;
    const lockfile = await readLockfile(cwd);
    const repos = Object.keys(lockfile.packages);

    if (repos.length === 0) {
      info(
        'No boilerplates installed. Run `updose add <repo>` to install one.',
      );
      return;
    }

    // Filter to specific repo if provided
    const toUpdate = repo ? repos.filter((r) => r === repo) : repos;

    if (toUpdate.length === 0) {
      error(`Package "${repo}" is not installed. Check updose-lock.json.`);
      process.exitCode = 1;
      return;
    }

    let totalInstalled = 0;
    let totalSkipped = 0;
    let packagesUpdated = 0;
    let _packagesUpToDate = 0;

    for (const repoName of toUpdate) {
      const entry = lockfile.packages[repoName]!;
      const result = await updatePackage(
        repoName,
        entry,
        lockfile,
        cwd,
        skipPrompts,
        dryRun,
      );

      if (result === null) {
        // Error fetching, already reported
        continue;
      }

      if (!result.updated) {
        _packagesUpToDate++;
        continue;
      }

      packagesUpdated++;
      totalInstalled += result.installed;
      totalSkipped += result.skipped;
    }

    // Write lockfile if any changes were made (and not dry-run)
    if (packagesUpdated > 0 && !dryRun) {
      await writeLockfile(cwd, lockfile);
    }

    // Summary
    console.log();
    if (dryRun) {
      info('Dry run complete. No files were written.');
    } else if (packagesUpdated > 0) {
      success(
        `Updated ${packagesUpdated} package(s). ${totalInstalled} file(s) installed, ${totalSkipped} skipped.`,
      );
    } else {
      success('All packages are up to date.');
    }
  } catch (err) {
    error(
      err instanceof Error
        ? err.message
        : 'An unexpected error occurred during update.',
    );
    process.exitCode = 1;
  }
}

interface UpdateResult {
  updated: boolean;
  installed: number;
  skipped: number;
}

async function updatePackage(
  repo: string,
  entry: LockfileEntry,
  lockfile: Lockfile,
  cwd: string,
  skipPrompts: boolean,
  dryRun: boolean,
): Promise<UpdateResult | null> {
  // 1. Fetch latest manifest
  const checkSpinner = createSpinner(`Checking ${repo}...`).start();
  let manifest: Manifest;
  try {
    manifest = await fetchManifest(repo);
  } catch (err) {
    checkSpinner.fail(`Failed to check ${repo}`);
    warn(err instanceof Error ? err.message : 'Unknown error');
    return null;
  }

  // 2. Compare versions
  if (entry.version === manifest.version) {
    checkSpinner.success(`${repo} is up to date (v${entry.version})`);
    return { updated: false, installed: 0, skipped: 0 };
  }

  checkSpinner.success(`${repo}: v${entry.version} → v${manifest.version}`);

  // 3. Fetch repo tree
  const treeSpinner = createSpinner(`Fetching files for ${repo}...`).start();
  let tree: TreeEntry[];
  try {
    tree = await fetchRepoTree(repo);
    treeSpinner.success('File list fetched');
  } catch (err) {
    treeSpinner.fail('Failed to fetch file list');
    warn(err instanceof Error ? err.message : 'Unknown error');
    return null;
  }

  let totalInstalled = 0;
  let totalSkipped = 0;
  const updatedFiles: Record<string, string[]> = { ...entry.files };

  for (const target of entry.targets) {
    // 4. Filter files for target
    const sourceDir = getSourceDir(target);
    const prefix = `${sourceDir}/`;
    const targetFiles = tree.filter((e) => {
      if (!e.path.startsWith(prefix)) return false;
      const relativePath = e.path.slice(prefix.length);
      if (!relativePath) return false;
      if (shouldSkipFile(relativePath)) return false;
      return true;
    });

    if (targetFiles.length === 0) {
      warn(`No files found for target "${target}" in ${repo}`);
      continue;
    }

    // 5. Dry run
    if (dryRun) {
      console.log();
      info(`Files that would be updated for ${repo} [${target}]:\n`);

      let dryRunCount = 0;
      for (const file of targetFiles) {
        const relativePath = file.path.slice(prefix.length);
        const localRelPath = mapToLocalPath(target, relativePath);
        ensureWithinDir(cwd, localRelPath);
        console.log(`  ${file.path} → ${toPosix(localRelPath)}`);
        dryRunCount++;
      }

      console.log();
      info(`${dryRunCount} file(s) would be updated for [${target}].`);
      totalInstalled += dryRunCount;
      continue;
    }

    // 6. Install files
    console.log();
    const installedFiles: string[] = [];
    let installed = 0;
    let skipped = 0;

    for (const file of targetFiles) {
      const relativePath = file.path.slice(prefix.length);
      const localRelPath = mapToLocalPath(target, relativePath);
      const destPath = ensureWithinDir(cwd, localRelPath);

      let strategy: 'overwrite' | 'append' | 'skip' = 'overwrite';
      const mainDoc = isMainDoc(target, relativePath);
      const exists = await fileExists(destPath);

      if (exists && mainDoc) {
        strategy = await resolveConflict(localRelPath, true, skipPrompts);
      }

      if (strategy === 'skip') {
        warn(`Skipped ${localRelPath}`);
        skipped++;
        continue;
      }

      const content = await fetchFile(repo, file.path);
      if (content === null) {
        warn(`Could not fetch ${file.path} — skipped`);
        skipped++;
        continue;
      }

      await installFile(content, destPath, strategy);
      success(`Updated ${localRelPath}`);
      installedFiles.push(localRelPath);
      installed++;
    }

    // Track installed files per target
    if (installedFiles.length > 0) {
      const existingFiles = updatedFiles[target] ?? [];
      const posixFiles = installedFiles.map(toPosix);
      updatedFiles[target] = [...new Set([...existingFiles, ...posixFiles])];
    }

    totalInstalled += installed;
    totalSkipped += skipped;
  }

  // 7. Reinstall skills (outside per-target loop — target-independent)
  let totalSkillsInstalled = 0;
  const updatedSkills: SkillLockEntry[] = [...entry.skills];

  if (!dryRun) {
    const skillsContent = await fetchSkillsJson(repo);

    if (skillsContent !== null) {
      let skillsManifest: SkillsManifest | undefined;
      try {
        skillsManifest = parseSkills(JSON.parse(skillsContent) as unknown);
      } catch {
        warn('Invalid skills.json — skills update skipped');
      }

      if (skillsManifest && skillsManifest.skills.length > 0) {
        console.log();
        info('Updating skills...\n');

        for (const skill of skillsManifest.skills) {
          try {
            runSkillInstall(skill.repo, skill.skill, cwd);
            success(`Updated skill: ${skill.skill} (from ${skill.repo})`);
            updatedSkills.push({ repo: skill.repo, skill: skill.skill });
            totalSkillsInstalled++;
          } catch (err) {
            warn(
              `Failed to update skill "${skill.skill}": ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }
      }
    }
  } else {
    // Dry run for skills
    const skillsContent = await fetchSkillsJson(repo);
    if (skillsContent !== null) {
      try {
        const skillsManifest = parseSkills(
          JSON.parse(skillsContent) as unknown,
        );
        if (skillsManifest.skills.length > 0) {
          console.log();
          info('Skills that would be updated:\n');
          for (const skill of skillsManifest.skills) {
            console.log(`  ${skill.skill} (from ${skill.repo})`);
            totalSkillsInstalled++;
          }
        }
      } catch {
        warn('Invalid skills.json — skills would be skipped');
      }
    }
  }

  // 8. Update lockfile entry
  if ((totalInstalled > 0 || totalSkillsInstalled > 0) && !dryRun) {
    // Deduplicate skills by repo+skill
    const seen = new Set<string>();
    const mergedSkills: SkillLockEntry[] = [];
    for (const s of updatedSkills) {
      const key = `${s.repo}+${s.skill}`;
      if (!seen.has(key)) {
        seen.add(key);
        mergedSkills.push(s);
      }
    }

    lockfile.packages[repo] = {
      version: manifest.version,
      targets: entry.targets,
      installedAt: new Date().toISOString(),
      files: updatedFiles,
      skills: mergedSkills,
    };
  }

  const total = totalInstalled + totalSkillsInstalled;
  info(`${repo}: ${total} file(s) updated, ${totalSkipped} skipped.`);

  return { updated: true, installed: total, skipped: totalSkipped };
}
