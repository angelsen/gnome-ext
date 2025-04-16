import { execa } from 'execa';
import fs from 'fs-extra';
import chalk from 'chalk';
import path from 'path';

interface DevOptions {
  resolution?: string;
  watch?: boolean;
  monitors?: string;
}

export async function devCommand(options: DevOptions) {
  try {
    // Check if package.json exists in current directory
    if (!fs.existsSync('package.json')) {
      console.error(chalk.red('Error: package.json not found. Are you in an extension directory?'));
      return;
    }
    
    // Check if dev script exists
    if (fs.existsSync('scripts/dev.sh')) {
      // Execute dev script
      const args = ['scripts/dev.sh'];
      if (options.resolution) args.push(options.resolution);
      if (options.monitors) args.push(options.monitors);
      
      if (options.watch) {
        console.log(chalk.blue('Starting dev environment with file watching...'));
        await execa('npx', ['nodemon', '--watch', 'src', '-e', 'ts,json', '--exec', 'bash', ...args], 
          { stdio: 'inherit' });
      } else {
        console.log(chalk.blue('Starting dev environment...'));
        await execa('bash', args, { stdio: 'inherit' });
      }
    } else {
      // Create a dev script on the fly
      console.log(chalk.blue('Dev script not found, creating one...'));
      
      // Ensure scripts directory exists
      fs.mkdirSync('scripts', { recursive: true });
      
      // Create dev.sh script
      const devSh = `#!/bin/bash

RESOLUTION=\${1:-"1920x1080"}
EXTENSION_UUID=\$(grep -o '"uuid": *"[^"]*"' dist/metadata.json | cut -d'"' -f4)

echo "Starting nested GNOME Shell with resolution: \$RESOLUTION"
echo "Extension UUID: \$EXTENSION_UUID"

# Build and install the extension
npm run build
npm run install

# Start the nested shell
MUTTER_DEBUG_DUMMY_MODE_SPECS=\$RESOLUTION dbus-run-session -- gnome-shell --nested --wayland &
SHELL_PID=\$!

# Wait for shell to start
sleep 2

# Open a terminal in the nested shell to enable the extension
gnome-terminal --app-id=org.gnome.Terminal.GnomeShell -- bash -c "gnome-extensions enable \$EXTENSION_UUID; echo 'Extension enabled! Press Ctrl+D to exit.'; exec bash"

# Wait for shell to exit
wait \$SHELL_PID`;
      
      fs.writeFileSync(path.join('scripts', 'dev.sh'), devSh, { mode: 0o755 });
      console.log(chalk.green('Created dev.sh script'));
      
      // Now run it
      const args = ['scripts/dev.sh'];
      if (options.resolution) args.push(options.resolution);
      if (options.monitors) args.push(options.monitors);
      
      if (options.watch) {
        console.log(chalk.blue('Starting dev environment with file watching...'));
        await execa('npx', ['nodemon', '--watch', 'src', '-e', 'ts,json', '--exec', 'bash', ...args], 
          { stdio: 'inherit' });
      } else {
        console.log(chalk.blue('Starting dev environment...'));
        await execa('bash', args, { stdio: 'inherit' });
      }
    }
  } catch (error) {
    console.error(chalk.red('Development environment failed:'), error);
  }
}