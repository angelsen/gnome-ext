import { execa } from 'execa';
import fs from 'fs-extra';
import chalk from 'chalk';
import path from 'path';
import AdmZip from 'adm-zip';

export async function packCommand() {
  try {
    // Check if package.json exists in current directory
    if (!fs.existsSync('package.json')) {
      console.error(chalk.red('Error: package.json not found. Are you in an extension directory?'));
      return;
    }
    
    console.log(chalk.blue('Packaging extension...'));
    
    // Check if esbuild.js exists - it already handles packaging
    if (fs.existsSync('esbuild.js')) {
      // Use esbuild directly which handles packaging
      try {
        await execa('node', ['esbuild.js'], { stdio: 'inherit' });
        // No need to do anything else as esbuild.js creates the zip file
      } catch (error) {
        console.error(chalk.red('Error running esbuild:'), error);
        return;
      }
    } else if (fs.existsSync('scripts/pack.sh')) {
      // Execute pack script
      await execa('bash', ['scripts/pack.sh'], { stdio: 'inherit' });
    } else {
      // Fallback to direct packaging with AdmZip
      
      // Check if dist directory exists
      if (!fs.existsSync('dist')) {
        console.error(chalk.red('Error: dist directory not found. Run build command first.'));
        return;
      }
      
      // Check if metadata.json exists in dist
      if (!fs.existsSync(path.join('dist', 'metadata.json'))) {
        console.error(chalk.red('Error: metadata.json not found in dist directory.'));
        return;
      }
      
      // Read metadata to get UUID
      const metadata = JSON.parse(fs.readFileSync(path.join('dist', 'metadata.json'), 'utf8'));
      if (!metadata.uuid) {
        console.error(chalk.red('Error: No UUID found in metadata.json'));
        return;
      }
      
      // Create zip file
      const zipFilename = `${metadata.uuid}.zip`;
      const zip = new AdmZip();
      
      console.log(chalk.blue(`Creating zip package: ${zipFilename}`));
      
      // Add all files from dist directory
      zip.addLocalFolder(path.resolve('dist'));
      
      // Write zip file
      zip.writeZip(zipFilename);
      
      console.log(chalk.green(`Package created: ${zipFilename}`));
      console.log(chalk.blue(`\nYou can install it with:`));
      console.log(`  gnome-extensions install ${zipFilename}`);
      console.log(chalk.blue(`Enable it with:`));
      console.log(`  gnome-extensions enable ${metadata.uuid}`);
    }
  } catch (error) {
    console.error(chalk.red('Packaging failed:'), error);
  }
}