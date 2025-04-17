# Phase 1 Implementation Plan

## Progress Tracking
- [x] Build System Modernization
  - [x] Migrate to esbuild
  - [x] Configure tree-shaking
  - [x] Implement automatic packaging
  - [x] Add source map support
- [x] Enhanced TypeScript Integration
  - [x] Update template dependencies
  - [x] Optimize tsconfig.json
  - [x] Create type definitions
- [x] Improve Basic Templates
  - [x] Convert templates to file-based system
  - [x] Update extension patterns
  - [x] Update metadata.json schema
- [x] Bug Fixes and Refinements
  - [x] Fix template directory processing
  - [x] Fix class name generation for special characters
  - [x] Fix logger type casting
  - [x] Implement proper GSettings schema support
- [ ] Integration and Testing
  - [ ] Create testing framework
  - [x] Manual testing of basic template
  - [ ] Manual testing of indicator template
  - [ ] Documentation
  - [ ] Release preparation

## 1. Build System Modernization

### 1.1 Migrate to esbuild (1 week)
- Create a robust esbuild configuration template based on the gjsify/gnome-shell example
- Update template to include:
  - Proper sourcemap generation for debugging
  - Asset copying functionality with error handling
  - Correct external module handling for GJS compatibility
  - Structured console output for better UX

### 1.2 Configure Tree-shaking (3 days)
- Implement proper tree-shaking configuration preserving lifecycle methods
- Add comments documenting why disabling tree-shaking is necessary for extension methods
- Test across different extension templates to ensure compatibility

### 1.3 Implement Automatic Packaging (2 days)
- Refactor the current packaging implementation to use AdmZip directly in the CLI
- Add validation for extension package structure before packaging
- Implement proper error handling and meaningful error messages

### 1.4 Add Source Map Support (2 days)
- Enable source map generation in esbuild configuration
- Configure TypeScript settings to optimize debugging experience
- Test debugging with nested GNOME Shell

## 2. Enhanced TypeScript Integration

### 2.1 Update Template Dependencies (2 days)
- Add @girs/gnome-shell dependency to project templates
- Update package.json templates with latest version requirements
- Create proper dependency graphs to ensure compatibility

### 2.2 Optimize tsconfig.json (2 days)
- Implement strictest TypeScript settings for better type safety
- Configure proper module resolution for ES modules
- Add documentation comments explaining configuration choices

### 2.3 Create Type Definitions (3 days)
- Add basic type definitions for extension class
- Implement typed console logging following gjsify example
- Create utility type definitions for common GNOME Shell patterns

## 3. Improve Basic Templates

### 3.1 Convert Templates to File-Based System (1 week)
- Refactor hardcoded templates in create.ts to actual template files
- Implement EJS templating for proper variable substitution
- Create organized template directory structure

### 3.2 Update Extension Patterns (4 days)
- Convert templates to class-based extension pattern
- Add proper resource cleanup in disable method
- Implement typed console logging using ConsoleLike interface
- Add proper error handling and state management

### 3.3 Update metadata.json Schema (1 day)
- Update metadata.json schema for latest GNOME Shell
- Add fields for settings-schema and other important properties
- Ensure compatibility with GNOME Extensions website requirements

## 4. Integration and Testing

### 4.1 Create Testing Framework (3 days)
- Implement basic unit tests for CLI commands
- Create integration tests for template generation
- Add smoke tests for build process

### 4.2 Documentation (2 days)
- Create comprehensive README with usage examples
- Document template architecture and customization options
- Add troubleshooting information

### 4.3 Release Preparation (1 day)
- Prepare package.json for npm publication
- Create CHANGELOG entries
- Finalize version 0.2.0

## Implementation Details

### Key Focus Areas:

1. **Template System Overhaul**
   - Move away from hardcoded templates in create.ts
   - Create actual template files in the templates directory
   - Use EJS for proper templating and variable substitution

2. **Build System Enhancement**
   - Standardize on esbuild for all builds
   - Create optimized build configuration
   - Add sourcemap support for debugging

3. **TypeScript Configuration**
   - Update to latest TypeScript configuration with strictest settings
   - Add proper GNOME Shell type definitions
   - Implement typed logging using ConsoleLike interface

4. **Code Quality Improvements**
   - Add error handling throughout the codebase
   - Implement proper validation for user inputs
   - Create comprehensive testing framework

## Next Steps

1. Begin by refactoring template system to use actual template files
2. Update build system to standardize on esbuild with proper configuration
3. Enhance TypeScript configuration with latest type definitions
4. Implement testing framework for ongoing quality assurance

This plan addresses all requirements in Phase 1 of the roadmap while building a solid foundation for later phases.