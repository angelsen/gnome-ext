import { execa } from 'execa';
import fs from 'fs-extra';
import chalk from 'chalk';
import path from 'path';
import { glob } from 'glob';

export async function installCommand() {
  try {
    // Check if package.json exists in current directory
    if (!fs.existsSync('package.json')) {
      console.error(chalk.red('Error: package.json not found. Are you in an extension directory?'));
      return;
    }
    
    // Check if install script exists
    if (fs.existsSync('scripts/install.sh')) {
      // Execute install script
      await execa('bash', ['scripts/install.sh'], { stdio: 'inherit' });
    } else {
      // Fallback to direct gnome-extensions install
      console.log(chalk.blue('Installing extension...'));
      
      // Check if dist directory exists
      if (!fs.existsSync('dist')) {
        console.error(chalk.red('Error: dist directory not found. Run build and pack commands first.'));
        return;
      }
      
      // Find zip file in dist directory
      const zipFiles = await glob('*.zip', { cwd: 'dist' });
      
      if (zipFiles.length === 0) {
        console.error(chalk.red('Error: No zip file found in dist/. Run pack command first.'));
        return;
      }
      
      // Install extension
      await execa('gnome-extensions', ['install', '--force', path.join('dist', zipFiles[0])], 
        { stdio: 'inherit' });
      
      console.log(chalk.green('Extension installed!'));
    }
  } catch (error) {
    console.error(chalk.red('Installation failed:'), error);
  }
}