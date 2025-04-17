import { execa } from 'execa';
import fs from 'fs-extra';
import chalk from 'chalk';
import path from 'path';

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
    
    console.log(chalk.blue('Building extension...'));
    
    // Check if esbuild.js exists
    if (fs.existsSync('esbuild.js')) {
      // Use esbuild directly
      try {
        await execa('node', ['esbuild.js'], { stdio: 'inherit' });
        console.log(chalk.green('Build complete!'));
      } catch (error) {
        console.error(chalk.red('Error running esbuild:'), error);
        return;
      }
    } else if (fs.existsSync('scripts/build.sh')) {
      // Fall back to build script
      await execa('bash', ['scripts/build.sh'], { stdio: 'inherit' });
    } else {
      // Fallback to direct TypeScript compilation
      console.log(chalk.yellow('No esbuild.js found, falling back to TypeScript compiler.'));
      console.log(chalk.yellow('For better performance, consider adding an esbuild.js file.'));
      
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
      
      // Copy stylesheet.css if it exists
      if (fs.existsSync('src/stylesheet.css')) {
        fs.copySync('src/stylesheet.css', 'dist/stylesheet.css');
      }
      
      // Compile TypeScript
      await execa('npx', ['tsc'], { stdio: 'inherit' });
      
      console.log(chalk.green('Build complete!'));
    }
    
    // Start watching if requested
    if (options.watch) {
      console.log(chalk.blue('Watching for changes...'));
      if (fs.existsSync('esbuild.js')) {
        // Use nodemon to watch with esbuild
        await execa('npx', ['nodemon', '--watch', 'src', '-e', 'ts,json,css', '--exec', 'node esbuild.js'], 
          { stdio: 'inherit' });
      } else {
        // Fall back to TypeScript watch mode
        await execa('npx', ['nodemon', '--watch', 'src', '-e', 'ts,json,css', '--exec', 'npm run build'], 
          { stdio: 'inherit' });
      }
    }
  } catch (error) {
    console.error(chalk.red('Build failed:'), error);
  }
}