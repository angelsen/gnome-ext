import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import ejs from 'ejs';
import { execa } from 'execa';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface CreateOptions {
  template: string;
  git: boolean;
}

interface ExtensionConfig {
  name: string;
  dirName: string;
  uuid: string;
  description: string;
}

export async function createCommand(name: string | undefined, options: CreateOptions) {
  try {
    // If name not provided, prompt for it
    if (!name) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'What is the name of your extension?',
          validate: (input) => input.trim() !== '' || 'Name is required'
        }
      ]);
      name = answers.name;
    }

    // At this point name should be defined
    if (!name) {
      throw new Error('Extension name is required');
    }

    // Normalize name for directory
    const dirName = name.toLowerCase().replace(/\s+/g, '-');
    
    // Generate UUID (domain.user.name)
    let uuid = `gnome-shell-extension-${dirName}`;
    
    // Ask for extension details
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'uuid',
        message: 'Extension UUID (e.g., domain.user.name):',
        default: uuid
      },
      {
        type: 'input',
        name: 'description',
        message: 'Description:',
        default: `${name} GNOME Shell extension`
      },
      {
        type: 'list',
        name: 'template',
        message: 'Template:',
        choices: ['basic', 'indicator'],
        default: options.template || 'basic'
      }
    ]);
    
    // Create project directory
    const projectDir = path.resolve(process.cwd(), dirName);
    
    console.log(chalk.blue(`\nCreating extension in ${projectDir}`));
    
    // Ensure directory doesn't exist
    if (fs.existsSync(projectDir)) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: `Directory ${dirName} already exists. Overwrite?`,
          default: false
        }
      ]);
      
      if (!overwrite) {
        console.log(chalk.yellow('Extension creation cancelled.'));
        return;
      }
      
      fs.removeSync(projectDir);
    }
    
    // Create directory structure
    fs.mkdirSync(projectDir, { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'src', 'lib'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'assets'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'src', 'types'), { recursive: true });
    
    // Template source directory
    const templateDir = path.join(__dirname, '..', '..', 'src', 'templates', answers.template);
    
    // Check if template exists
    if (!fs.existsSync(templateDir)) {
      console.error(chalk.red(`Template '${answers.template}' not found.`));
      return;
    }
    
    // Template data for file content
    const templateData: ExtensionConfig = {
      name,
      dirName,
      uuid: answers.uuid,
      description: answers.description
    };
    
    // Copy template files
    // For now we'll create them directly here since we haven't created the templates yet
    createPackageJson(projectDir, templateData);
    createTsConfig(projectDir, templateData);
    createMetadataJson(projectDir, templateData);
    createExtensionTs(projectDir, templateData, answers.template);
    createEsbuildConfig(projectDir, templateData);
    createScripts(projectDir, templateData);
    
    // Initialize git repository if not disabled
    if (options.git !== false) {
      try {
        await execa('git', ['init'], { cwd: projectDir });
        fs.writeFileSync(path.join(projectDir, '.gitignore'), 'node_modules/\ndist/\n*.zip\n');
        console.log(chalk.green('✓ Initialized git repository'));
      } catch (error) {
        console.log(chalk.yellow('⚠ Failed to initialize git repository'));
      }
    }
    
    // Install dependencies
    console.log(chalk.blue('\nInstalling dependencies...'));
    try {
      await execa('npm', ['install'], { cwd: projectDir, stdio: 'inherit' });
      console.log(chalk.green('✓ Dependencies installed'));
    } catch (error) {
      console.log(chalk.yellow('⚠ Failed to install dependencies'));
    }
    
    // Success message
    console.log(chalk.green('\n✓ Extension created successfully!'));
    console.log(chalk.blue('\nNext steps:'));
    console.log(chalk.white(`  1. cd ${dirName}`));
    console.log(chalk.white('  2. npm run build'));
    console.log(chalk.white('  3. npm run install-extension'));
    console.log(chalk.white('  4. npm run dev'));
    
  } catch (error) {
    console.error(chalk.red('\nError creating extension:'), error);
  }
}

// Helper functions for creating template files
function createPackageJson(projectDir: string, data: ExtensionConfig) {
  const content = `{
  "name": "${data.dirName}",
  "version": "1.0.0",
  "description": "${data.description}",
  "type": "module",
  "scripts": {
    "clear": "rm -rf dist",
    "build": "node esbuild.js",
    "rebuild": "npm run clear && npm run build",
    "install-extension": "bash scripts/install.sh",
    "dev": "bash scripts/dev.sh",
    "dev:watch": "nodemon --watch src -e ts,json --exec npm run dev",
    "validate": "tsc --noEmit"
  },
  "devDependencies": {
    "@girs/gnome-shell": "^48.0.0",
    "@girs/gjs": "^4.0.0-beta.23",
    "@girs/st-16": "^16.0.0-4.0.0-beta.23",
    "adm-zip": "^0.5.16",
    "esbuild": "^0.25.1",
    "typescript": "^5.3.0",
    "nodemon": "^3.0.1"
  }
}`;
  fs.writeFileSync(path.join(projectDir, 'package.json'), content);
}

function createTsConfig(projectDir: string, data: ExtensionConfig) {
  const content = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ESNext"],
    "strict": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "strictNullChecks": true,
    "strictPropertyInitialization": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "outDir": "dist",
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "files": ["src/extension.ts"]
}`;
  fs.writeFileSync(path.join(projectDir, 'tsconfig.json'), content);
}

function createMetadataJson(projectDir: string, data: ExtensionConfig) {
  const content = `{
  "name": "${data.name}",
  "description": "${data.description}",
  "uuid": "${data.uuid}",
  "shell-version": ["45", "46", "47", "48"],
  "url": ""
}`;
  fs.writeFileSync(path.join(projectDir, 'src/metadata.json'), content);
}

function createExtensionTs(projectDir: string, data: ExtensionConfig, template: string) {
  let content = '';
  
  if (template === 'basic') {
    content = `import '@girs/gjs'; // For global types like 'log()'
import '@girs/gnome-shell/extensions/global'; // For global shell types
import { Extension } from '@girs/gnome-shell/extensions/extension';

export default class MyExtension extends Extension {
  override enable() {
    log(\`\${this.metadata.name} enabled\`);
  }

  override disable() {
    log(\`\${this.metadata.name} disabled\`);
  }
}`;
  } else if (template === 'indicator') {
    content = `import '@girs/gjs'; // For global types like 'log()'
import St from '@girs/st-16';

import '@girs/gnome-shell/extensions/global'; // For global shell types
import { Extension } from '@girs/gnome-shell/extensions/extension';
import PanelMenu from '@girs/gnome-shell/ui/panelMenu';
import * as Main from '@girs/gnome-shell/ui/main';

export default class MyExtension extends Extension {
  private _indicator: PanelMenu.Button | null = null;

  override enable() {
    // Create a panel button
    this._indicator = new PanelMenu.Button(0.0, this.metadata.name, false);

    // Add an icon
    const icon = new St.Icon({
      icon_name: 'dialog-information-symbolic',
      style_class: 'system-status-icon',
    });
    this._indicator.add_child(icon);

    // Add the indicator to the panel
    Main.panel.addToStatusArea(this.uuid, this._indicator);
    
    log(\`\${this.metadata.name} enabled\`);
  }

  override disable() {
    if (this._indicator) {
      this._indicator.destroy();
      this._indicator = null;
    }
  }
}`;
  }
  
  fs.writeFileSync(path.join(projectDir, 'src/extension.ts'), content);
}

function createEsbuildConfig(projectDir: string, data: ExtensionConfig) {
  const content = `import { build } from 'esbuild';
import { copyFileSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';

const __dirname = dirname(fileURLToPath(import.meta.url));
const metadata = JSON.parse(readFileSync('./src/metadata.json', 'utf8'));

console.debug(\`Building \${metadata.name} v\${metadata.version}...\`);

build({
    entryPoints: ['src/extension.ts'],
    outdir: 'dist',
    bundle: true,
    // Do not remove the functions \`enable()\`, \`disable()\`
    treeShaking: false,
    // firefox78 support is sufficient for GNOME Shell 45+
    target: 'firefox78',
    platform: 'neutral',
    format: 'esm',
    external: ['gi://*', 'resource://*', 'system', 'gettext', 'cairo'],
}).then(() => {
    const metaSrc = resolve(__dirname, 'src/metadata.json');
    const metaDist = resolve(__dirname, 'dist/metadata.json');
    const zipFilename = \`\${metadata.uuid}.zip\`;
    const zipDist = resolve(__dirname, zipFilename);
    copyFileSync(metaSrc, metaDist);
    
    // Copy any assets if they exist
    try {
      if (fs.existsSync('src/assets')) {
        fs.mkdirSync('dist/assets', { recursive: true });
        fs.copySync('src/assets', 'dist/assets');
      }
    } catch (error) {
      console.log('No assets to copy');
    }

    const zip = new AdmZip();
    zip.addLocalFolder(resolve(__dirname, 'dist'));
    zip.writeZip(zipDist);

    console.log(\`Build complete. Zip file: \${zipFilename}\\n\`);
    console.log(\`Install with: gnome-extensions install \${zipFilename}\`);
    console.log(\`Update with: gnome-extensions install --force \${zipFilename}\`);
    console.log(\`Enable with: gnome-extensions enable \${metadata.uuid}\`);
});
`;
  fs.writeFileSync(path.join(projectDir, 'esbuild.js'), content);
}

function createScripts(projectDir: string, data: ExtensionConfig) {
  // build.sh
  const buildSh = `#!/bin/bash

echo "Building extension..."
mkdir -p dist
cp -r src/metadata.json dist/
# Copy any assets if present
if [ -d "src/assets" ]; then
  mkdir -p dist/assets
  cp -r src/assets/* dist/assets/
fi

# Compile TypeScript
npx tsc

echo "Build complete!"`;
  fs.writeFileSync(path.join(projectDir, 'scripts/build.sh'), buildSh, { mode: 0o755 });

  // pack.sh
  const packSh = `#!/bin/bash

echo "Packaging extension..."
cd dist
gnome-extensions pack \\
  --force \\
  --extra-source=lib

echo "Done! Package created in dist/"`;
  fs.writeFileSync(path.join(projectDir, 'scripts/pack.sh'), packSh, { mode: 0o755 });

  // install.sh
  const installSh = `#!/bin/bash

echo "Installing extension..."
if [ ! -f "${data.uuid}.zip" ]; then
  echo "Building extension first..."
  npm run build
fi

# Install the extension
gnome-extensions install "${data.uuid}.zip" \\
  --force

# Print enable instructions
echo "Extension installed!"
echo "You can enable it with: gnome-extensions enable ${data.uuid}"`;
  fs.writeFileSync(path.join(projectDir, 'scripts/install.sh'), installSh, { mode: 0o755 });

  // dev.sh
  const devSh = `#!/bin/bash

RESOLUTION=\${1:-"1920x1080"}
EXTENSION_UUID="${data.uuid}"

echo "Starting nested GNOME Shell with resolution: \$RESOLUTION"
echo "Extension UUID: \$EXTENSION_UUID"

# Build and install the extension
npm run rebuild
npm run install-extension

# Start the nested shell
MUTTER_DEBUG_DUMMY_MODE_SPECS=\$RESOLUTION dbus-run-session -- gnome-shell --nested --wayland &
SHELL_PID=\$!

# Wait for shell to start
sleep 2

# Open a terminal in the nested shell to enable the extension
gnome-terminal --app-id=org.gnome.Terminal.GnomeShell -- bash -c "gnome-extensions enable \$EXTENSION_UUID; echo 'Extension enabled! Press Ctrl+D to exit.'; exec bash"

# Wait for shell to exit
wait \$SHELL_PID`;
  fs.writeFileSync(path.join(projectDir, 'scripts/dev.sh'), devSh, { mode: 0o755 });
}

