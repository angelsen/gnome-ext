import { execa } from 'execa';
import fs from 'fs-extra';
import chalk from 'chalk';

interface BuildOptions {
  watch?: boolean;
}

export async function buildCommand(options: BuildOptions) {
  try {
    // Check if package.json exists in current directory
    if (!fs.existsSync('package.json')) {
      console.error(chalk.red('Error: package.json not found. Are you in an extension directory?'));
      return;
    }
    
    // Check if build script exists
    if (fs.existsSync('scripts/build.sh')) {
      // Execute build script
      await execa('bash', ['scripts/build.sh'], { stdio: 'inherit' });
    } else {
      // Fallback to direct TypeScript compilation
      console.log(chalk.blue('Building extension...'));
      
      // Ensure dist directory exists
      fs.mkdirSync('dist', { recursive: true });
      
      // Copy metadata.json
      if (fs.existsSync('src/metadata.json')) {
        fs.copySync('src/metadata.json', 'dist/metadata.json');
      }
      
      // Copy assets if they exist
      if (fs.existsSync('src/assets')) {
        fs.copySync('src/assets', 'dist/assets');
      }
      
      // Compile TypeScript
      await execa('npx', ['tsc'], { stdio: 'inherit' });
      
      console.log(chalk.green('Build complete!'));
    }
    
    // Start watching if requested
    if (options.watch) {
      console.log(chalk.blue('Watching for changes...'));
      await execa('npx', ['nodemon', '--watch', 'src', '-e', 'ts,json', '--exec', 'npm run build'], 
        { stdio: 'inherit' });
    }
  } catch (error) {
    console.error(chalk.red('Build failed:'), error);
  }
}