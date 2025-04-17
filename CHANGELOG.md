# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup with TypeScript
- CLI structure using Commander.js
- `create` command with basic and indicator templates
- `build` command with TypeScript compilation
- `pack` command for packaging extensions
- `install` command for local installation
- `dev` command for development with nested GNOME Shell
- README.md with usage documentation
- LICENSE file with MIT license
- CHANGELOG.md for tracking changes
- Modern bundling with esbuild
- TypeScript typing with @girs packages
- ESM module support
- Enhanced templates with best practices:
  - Resource management utilities
  - Settings management
  - Component-based architecture
  - Observable pattern for state management
  - GSettings schema integration
  - Keybinding management
  - Proper error handling and cleanup
  - Class-based extension pattern

### Fixed
- Template directory processing for nested template files
- Class name generation for extension names with special characters
- Logger initialization to use standard getLogger() method
- Schema compilation and installation process
- Package structure for npm publication

### Todo
- Add tests for commands
- Create a project website
- Add more documentation
- Publish to npm

## [0.1.0] - 2025-04-16
- Initial development version

[Unreleased]: https://github.com/angelsen/gnome-ext/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/angelsen/gnome-ext/releases/tag/v0.1.0