#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';

// Import commands
import { createCommand } from './commands/create.js';
import { buildCommand } from './commands/build.js';
import { packCommand } from './commands/pack.js';
import { installCommand } from './commands/install.js';
import { devCommand } from './commands/dev.js';

const program = new Command();

program
  .name('gnome-ext')
  .description('GNOME Shell extension scaffolding and build tool')
  .version('0.1.0');

program
  .command('create')
  .description('Create a new GNOME Shell extension')
  .argument('[name]', 'Name of the extension')
  .option('-t, --template <template>', 'Template to use (basic or indicator)', 'basic')
  .option('--no-git', 'Skip git initialization')
  .action(createCommand);

program
  .command('build')
  .description('Build the extension')
  .option('-w, --watch', 'Watch for changes and rebuild')
  .action(buildCommand);

program
  .command('pack')
  .description('Package the extension as a zip file')
  .action(packCommand);

program
  .command('install')
  .description('Install the extension locally')
  .action(installCommand);

program
  .command('dev')
  .description('Start a development session with a nested GNOME Shell')
  .option('-r, --resolution <resolution>', 'Set display resolution', '1920x1080')
  .option('-w, --watch', 'Watch for changes and rebuild')
  .option('-m, --monitors <number>', 'Set number of monitors', '1')
  .action(devCommand);

program.parse(process.argv);

// Display help if no arguments provided
if (!process.argv.slice(2).length) {
  console.log(chalk.bold.blue('\nGNOME Extension Creator Tool\n'));
  program.help();
}