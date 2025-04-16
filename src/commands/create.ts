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
    console.log(chalk.white('  3. npm run pack'));
    console.log(chalk.white('  4. npm run install-extension'));
    console.log(chalk.white('  5. npm run dev'));
    
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
    "build": "bash scripts/build.sh",
    "pack": "bash scripts/pack.sh",
    "install-extension": "bash scripts/install.sh",
    "dev": "bash scripts/dev.sh",
    "dev:watch": "nodemon --watch src -e ts,json --exec npm run dev"
  },
  "devDependencies": {
    "@girs/gnome-shell": "^48.0.0",
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
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "outDir": "dist",
    "baseUrl": ".",
    "paths": {
      "resource:///org/gnome/shell/*": ["node_modules/@girs/gnome-shell/resources/*"],
      "gi://*": ["node_modules/@girs/*"]
    }
  },
  "include": ["src/**/*"]
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
    content = `import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";

export default class MyExtension extends Extension {
  enable() {
    log(\`\${this.metadata.name} enabled\`);
  }

  disable() {
    log(\`\${this.metadata.name} disabled\`);
  }
}`;
  } else if (template === 'indicator') {
    content = `import St from "gi://St";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";

export default class MyExtension extends Extension {
  #indicator: PanelMenu.Button | undefined;

  enable() {
    // Create a panel button
    this.#indicator = new PanelMenu.Button(0.0, this.metadata.name, false);

    // Add an icon
    const icon = new St.Icon({
      icon_name: 'dialog-information-symbolic',
      style_class: 'system-status-icon',
    });
    this.#indicator.add_child(icon);

    // Add the indicator to the panel
    Main.panel.addToStatusArea(this.uuid, this.#indicator);
  }

  disable() {
    if (this.#indicator) {
      this.#indicator.destroy();
      this.#indicator = undefined;
    }
  }
}`;
  }
  
  fs.writeFileSync(path.join(projectDir, 'src/extension.ts'), content);
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
if [ ! -d "dist" ]; then
  echo "Building extension first..."
  npm run build
  npm run pack
fi

cd dist || { echo "Error: dist directory does not exist. Run 'npm run build' first."; exit 1; }
file=\$(find *.zip 2>/dev/null)

if [ -z "$file" ]; then
  echo "No zip file found. Packaging extension first..."
  cd ..
  npm run pack
  cd dist || exit 1
  file=\$(find *.zip)
fi

gnome-extensions install "$file" \\
  --force

echo "Extension installed!"`;
  fs.writeFileSync(path.join(projectDir, 'scripts/install.sh'), installSh, { mode: 0o755 });

  // dev.sh
  const devSh = `#!/bin/bash

RESOLUTION=\${1:-"1920x1080"}
EXTENSION_UUID=\$(grep -o '"uuid": *"[^"]*"' dist/metadata.json | cut -d'"' -f4)

echo "Starting nested GNOME Shell with resolution: \$RESOLUTION"
echo "Extension UUID: \$EXTENSION_UUID"

# Build and install the extension
npm run build
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