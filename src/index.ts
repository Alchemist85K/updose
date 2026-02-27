import { Command } from 'commander';
import { addCommand } from './commands/add.js';
import { initCommand } from './commands/init.js';
import { loginCommand } from './commands/login.js';
import { logoutCommand } from './commands/logout.js';
import { outdatedCommand } from './commands/outdated.js';
import { publishCommand } from './commands/publish.js';
import { searchCommand } from './commands/search.js';
import { updateCommand } from './commands/update.js';

const program = new Command();

program
  .name('updose')
  .description('AI coding tool boilerplate marketplace')
  .version(__VERSION__);

program
  .command('add <repo>')
  .description('Install a boilerplate')
  .option('-y, --yes', 'Skip all prompts and use defaults')
  .option('--dry-run', 'Preview install without writing files')
  .action(addCommand);

program
  .command('search <query>')
  .description('Search for boilerplates')
  .option('--target <target>', 'Filter by target (claude, codex, gemini)')
  .option('--tag <tag>', 'Filter by tag')
  .action(searchCommand);

program
  .command('outdated')
  .description('Check for outdated boilerplates')
  .action(outdatedCommand);

program
  .command('update [repo]')
  .description('Update installed boilerplates')
  .option('-y, --yes', 'Skip all prompts and use defaults')
  .option('--dry-run', 'Preview update without writing files')
  .action(updateCommand);

program
  .command('init')
  .description('Scaffold a new boilerplate repository')
  .action(initCommand);

program
  .command('publish')
  .description('Publish your boilerplate to the registry')
  .action(publishCommand);

program.command('login').description('Log in to GitHub').action(loginCommand);

program
  .command('logout')
  .description('Log out from GitHub')
  .action(logoutCommand);

program.parse();
