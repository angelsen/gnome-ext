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
  className: string;
  settingsSchema: string;
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
    
    // Generate className (CamelCase)
    // Split by spaces and any non-alphanumeric characters (like hyphens)
    const className = name
      .split(/[\s\-_]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('') + 'Extension';
    
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
    
    // Template source directory - look in package root templates directory
    // Resolve from project root rather than relative to dist
    const projectRoot = path.resolve(__dirname, '..', '..');
    const templateDir = path.join(projectRoot, 'templates', answers.template);
    
    // Check if template exists
    if (!fs.existsSync(templateDir)) {
      console.error(chalk.red(`Template '${answers.template}' not found at ${templateDir}`));
      return;
    }
    
    // Generate settings schema string from uuid
    const settingsSchema = answers.uuid.replace(/[^a-zA-Z0-9.]/g, '.').toLowerCase();
    
    // Template data for file content
    const templateData: ExtensionConfig = {
      name,
      dirName,
      uuid: answers.uuid,
      description: answers.description,
      className,
      settingsSchema
    };
    
    // Process template files
    const processTemplate = async (templateFile: string, targetPath: string) => {
      const templateContent = await fs.readFile(path.join(templateDir, templateFile), 'utf-8');
      const processedContent = ejs.render(templateContent, templateData);
      await fs.writeFile(targetPath, processedContent);
    };
    
    // Check for and process template files
    if (fs.existsSync(path.join(templateDir, 'package.json.ejs'))) {
      await processTemplate('package.json.ejs', path.join(projectDir, 'package.json'));
    } else {
      // Fallback to hardcoded template
      createPackageJson(projectDir, templateData);
    }
    
    if (fs.existsSync(path.join(templateDir, 'tsconfig.json.ejs'))) {
      await processTemplate('tsconfig.json.ejs', path.join(projectDir, 'tsconfig.json'));
    } else {
      createTsConfig(projectDir, templateData);
    }
    
    if (fs.existsSync(path.join(templateDir, 'esbuild.js.ejs'))) {
      await processTemplate('esbuild.js.ejs', path.join(projectDir, 'esbuild.js'));
    } else {
      createEsbuildConfig(projectDir, templateData);
    }
    
    if (fs.existsSync(path.join(templateDir, 'extension.ts.ejs'))) {
      await processTemplate('extension.ts.ejs', path.join(projectDir, 'src/extension.ts'));
    } else {
      createExtensionTs(projectDir, templateData, answers.template);
    }
    
    if (fs.existsSync(path.join(templateDir, 'metadata.json.ejs'))) {
      await processTemplate('metadata.json.ejs', path.join(projectDir, 'src/metadata.json'));
    } else {
      createMetadataJson(projectDir, templateData);
    }
    
    // Process src directory with nested templates
    const processSrcDirectory = async () => {
      const srcTemplateDir = path.join(templateDir, 'src');
      if (fs.existsSync(srcTemplateDir)) {
        // Process all subdirectories recursively
        const processDirectory = async (sourceDir: string, targetDir: string) => {
          // Ensure target directory exists
          fs.mkdirSync(targetDir, { recursive: true });
          
          // Read all files in the source directory
          const entries = await fs.readdir(sourceDir, { withFileTypes: true });
          
          for (const entry of entries) {
            const sourcePath = path.join(sourceDir, entry.name);
            const targetPath = path.join(targetDir, entry.name.replace('.ejs', ''));
            
            if (entry.isDirectory()) {
              // Recursively process subdirectory
              await processDirectory(sourcePath, targetPath);
            } else if (entry.isFile()) {
              if (entry.name.endsWith('.ejs')) {
                // Process EJS template
                const templateContent = await fs.readFile(sourcePath, 'utf-8');
                const processedContent = ejs.render(templateContent, templateData);
                await fs.writeFile(targetPath, processedContent);
              } else {
                // Copy file as-is
                await fs.copyFile(sourcePath, targetPath);
              }
            }
          }
        };
        
        // Start processing from the src directory
        await processDirectory(srcTemplateDir, path.join(projectDir, 'src'));
      }
    };
    
    // Process src directory with all nested templates
    await processSrcDirectory();
    
    // Create scripts
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

// Helper functions for creating template files (fallback)
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
    "@girs/gobject-2.0": "^2.84.0-4.0.0-beta.23",
    "adm-zip": "^0.5.16",
    "esbuild": "^0.25.1",
    "fs-extra": "^11.3.0",
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
    "sourceMap": true,
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
  "settings-schema": "${data.settingsSchema}",
  "url": ""
}`;
  fs.writeFileSync(path.join(projectDir, 'src/metadata.json'), content);
}

function createExtensionTs(projectDir: string, data: ExtensionConfig, template: string) {
  let content = '';
  
  if (template === 'basic') {
    content = `import '@girs/gjs'; // For global types like 'log()'
import '@girs/gnome-shell/extensions/global'; // For global shell types
import { Extension, gettext as _, type ConsoleLike } from '@girs/gnome-shell/extensions/extension';

export default class ${data.className} extends Extension {
  private _console: ConsoleLike | null = null;

  override enable() {
    this._console = this.getLogger();
    this._console.log(\`\${this.metadata.name} enabled\`);
  }

  override disable() {
    this._console?.log(\`\${this.metadata.name} disabled\`);
    this._console = null;
  }
}`;
  } else if (template === 'indicator') {
    content = `import '@girs/gjs'; // For global types like 'log()'
import St from '@girs/st-16';

import '@girs/gnome-shell/extensions/global'; // For global shell types
import { Extension, gettext as _, type ConsoleLike } from '@girs/gnome-shell/extensions/extension';
import PanelMenu from '@girs/gnome-shell/ui/panelMenu';
import * as Main from '@girs/gnome-shell/ui/main';
import PopupMenu from '@girs/gnome-shell/ui/popupMenu';

export default class ${data.className} extends Extension {
  private _indicator: PanelMenu.Button | null = null;
  private _console: ConsoleLike | null = null;

  override enable() {
    this._console = this.getLogger();
    
    // Create a panel button
    this._indicator = new PanelMenu.Button(0.0, this.metadata.name, false);

    // Add an icon
    const icon = new St.Icon({
      icon_name: 'dialog-information-symbolic',
      style_class: 'system-status-icon',
    });
    this._indicator.add_child(icon);
    
    // Create a menu
    const menuItem = new PopupMenu.PopupMenuItem(_('Hello World'));
    menuItem.connect('activate', () => {
      this._console?.log('Menu item clicked');
    });
    this._indicator.menu.addMenuItem(menuItem);

    // Add the indicator to the panel
    Main.panel.addToStatusArea(this.uuid, this._indicator);
    
    this._console.log(\`\${this.metadata.name} enabled\`);
  }

  override disable() {
    if (this._indicator) {
      this._indicator.destroy();
      this._indicator = null;
    }
    
    this._console?.log(\`\${this.metadata.name} disabled\`);
    this._console = null;
  }
}`;
  }
  
  fs.writeFileSync(path.join(projectDir, 'src/extension.ts'), content);
}

function createEsbuildConfig(projectDir: string, data: ExtensionConfig) {
  const content = `import { build } from 'esbuild';
import { copyFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import AdmZip from 'adm-zip';

const __dirname = dirname(fileURLToPath(import.meta.url));
const metadata = JSON.parse(readFileSync('./src/metadata.json', 'utf8'));

console.debug(\`Building \${metadata.name} v\${metadata.version}...\`);

build({
    entryPoints: ['src/extension.ts'],
    outdir: 'dist',
    bundle: true,
    // Do not remove the functions \`enable()\`, \`disable()\`
    // This is critical for extensions to work properly
    treeShaking: false,
    // firefox78 support is sufficient for GNOME Shell 45+
    target: 'firefox78',
    platform: 'neutral',
    format: 'esm',
    // Generate source maps for better debugging
    sourcemap: true,
    // External modules that should not be bundled
    external: ['gi://*', 'resource://*', 'system', 'gettext', 'cairo'],
}).then(() => {
    const metaSrc = resolve(__dirname, 'src/metadata.json');
    const metaDist = resolve(__dirname, 'dist/metadata.json');
    const zipFilename = \`\${metadata.uuid}.zip\`;
    const zipDist = resolve(__dirname, zipFilename);
    copyFileSync(metaSrc, metaDist);
    
    // Copy any assets if they exist
    try {
      if (existsSync('src/assets')) {
        mkdirSync('dist/assets', { recursive: true });
        fs.copySync('src/assets', 'dist/assets');
      }
      // Copy stylesheet.css if it exists
      if (existsSync('src/stylesheet.css')) {
        copyFileSync('src/stylesheet.css', 'dist/stylesheet.css');
      }
    } catch (error) {
      console.log('Error copying assets:', error);
    }

    // Create zip package with AdmZip
    const zip = new AdmZip();
    zip.addLocalFolder(resolve(__dirname, 'dist'));
    zip.writeZip(zipDist);

    console.log(\`Build complete. Zip file: \${zipFilename}\\n\`);
    console.log(\`Install with: gnome-extensions install \${zipFilename}\`);
    console.log(\`Update with: gnome-extensions install --force \${zipFilename}\`);
    console.log(\`Enable with: gnome-extensions enable \${metadata.uuid}\`);
    console.log('\\nUse the dev command for testing in a nested GNOME Shell.');
});
`;
  fs.writeFileSync(path.join(projectDir, 'esbuild.js'), content);
}

function createScripts(projectDir: string, data: ExtensionConfig) {
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