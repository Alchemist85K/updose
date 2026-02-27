import chalk from 'chalk';
import type { BoilerplateRow, SearchFilters } from '../api/client.js';
import { searchBoilerplates } from '../api/client.js';
import { error, info } from '../utils/ui.js';

interface SearchOptions {
  target?: string | undefined;
  tag?: string | undefined;
}

export async function searchCommand(
  query: string,
  options: SearchOptions,
): Promise<void> {
  try {
    const filters: SearchFilters = {};
    if (options.target) filters.target = options.target;
    if (options.tag) filters.tag = options.tag;

    const results = await searchBoilerplates(query, filters);

    if (results.length === 0) {
      info(`No boilerplates found for "${query}"`);
      return;
    }

    console.log();
    info(`Found ${results.length} result(s) for "${query}":\n`);

    for (const bp of results) {
      formatResult(bp);
    }
  } catch (err) {
    error(
      err instanceof Error
        ? err.message
        : 'An unexpected error occurred during search.',
    );
    process.exitCode = 1;
  }
}

function formatResult(bp: BoilerplateRow): void {
  // Name, version, author
  const header = `${chalk.bold(bp.name)} ${chalk.dim(`v${bp.version}`)} ${chalk.dim('by')} ${bp.author}`;
  console.log(`  ${header}`);

  // Description
  if (bp.description) {
    console.log(`    ${bp.description}`);
  }

  // Stats: rating, downloads, targets
  const rating =
    bp.avg_rating > 0
      ? `${chalk.yellow('\u2605')} ${bp.avg_rating}${bp.rating_count > 0 ? chalk.dim(` (${bp.rating_count})`) : ''}`
      : chalk.dim('\u2605 -');
  const downloads = `${chalk.green('\u2193')} ${bp.downloads.toLocaleString()}`;
  const targets = chalk.cyan(bp.targets.join(', '));
  console.log(`    ${rating}  ${downloads}  ${targets}`);

  // Tags
  if (bp.tags.length > 0) {
    console.log(`    ${bp.tags.map((t) => chalk.dim(`#${t}`)).join(' ')}`);
  }

  // Repo
  console.log(`    ${chalk.dim(bp.repo)}`);
  console.log();
}
