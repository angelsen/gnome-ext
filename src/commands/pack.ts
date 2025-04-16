import { execa } from 'execa';
import fs from 'fs-extra';
import chalk from 'chalk';
import path from 'path';
import { glob } from 'glob';

export async function packCommand() {
  try {
    // Check if package.json exists in current directory
    if (!fs.existsSync('package.json')) {
      console.error(chalk.red('Error: package.json not found. Are you in an extension directory?'));
      return;
    }
    
    // Check if pack script exists
    if (fs.existsSync('scripts/pack.sh')) {
      // Execute pack script
      await execa('bash', ['scripts/pack.sh'], { stdio: 'inherit' });
    } else {
      // Fallback to direct gnome-extensions pack
      console.log(chalk.blue('Packaging extension...'));
      
      // Check if dist directory exists
      if (!fs.existsSync('dist')) {
        console.error(chalk.red('Error: dist directory not found. Run build command first.'));
        return;
      }
      
      // Run gnome-extensions pack command
      process.chdir('dist');
      
      // Check if lib directory exists for --extra-source
      const extraSourceArgs = [];
      if (fs.existsSync(path.join('dist', 'lib'))) {
        extraSourceArgs.push('--extra-source=lib');
      }
      
      await execa('gnome-extensions', ['pack', '--force', ...extraSourceArgs], 
        { stdio: 'inherit' });
      
      console.log(chalk.green('Package created in dist/'));
    }
  } catch (error) {
    console.error(chalk.red('Packaging failed:'), error);
  }
}