import chalk from 'chalk';
import type { BoilerplateRow, SearchFilters } from '../api/client.js';
import { searchBoilerplates } from '../api/client.js';
import { error, info } from '../utils/ui.js';

interface SearchOptions {
  target?: string | undefined;
  tag?: string | undefined;
  author?: string | undefined;
}

export async function searchCommand(
  query: string | undefined,
  options: SearchOptions,
): Promise<void> {
  try {
    const filters: SearchFilters = {};
    if (options.target) filters.target = options.target;
    if (options.tag) filters.tag = options.tag;
    if (options.author) filters.author = options.author;

    const hasParams = !!(
      query ||
      filters.target ||
      filters.tag ||
      filters.author
    );
    const label = query
      ? `"${query}"`
      : hasParams
        ? 'the given filters'
        : 'popular boilerplates';

    const response = await searchBoilerplates(query, filters);

    if (response.data.length === 0) {
      info(`No boilerplates found for ${label}`);
      return;
    }

    console.log();
    info(`Found ${response.total} result(s) for ${label}:\n`);

    for (const bp of response.data) {
      formatResult(bp);
    }

    console.log(
      `  Browse more results and details at ${chalk.hex('#d4a574').underline('https://updose.dev')}`,
    );
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

  // Stats: downloads, targets
  const downloads = `${chalk.green('\u2193')} ${bp.downloads.toLocaleString()}`;
  const targets = chalk.cyan(bp.targets.join(', '));
  console.log(`    ${downloads}  ${targets}`);

  // Tags
  if (bp.tags.length > 0) {
    console.log(`    ${bp.tags.map((t) => chalk.dim(`#${t}`)).join(' ')}`);
  }

  // Repo
  const repoPath = bp.dir ? `${bp.repo}/${bp.dir}` : bp.repo;
  console.log(`    ${chalk.dim(repoPath)}`);
  console.log();
}
