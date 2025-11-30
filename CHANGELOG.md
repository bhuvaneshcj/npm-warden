# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2024-11-30

### Fixed

- Fixed empty repository URL in package.json
- Added homepage and bugs URLs
- Excluded test files from npm package (reduced package size from 18.5 kB to 17.1 kB)
- Updated Node.js requirement from 18+ to 24+
- Added proper exports field for better ESM support
- Added LICENSE file
- Added CHANGELOG.md
- Added .nvmrc file for Node version management
- Updated GitHub Actions workflow to use Node.js 24

### Improved

- Optimized TypeScript build configuration
- Better .npmignore to exclude unnecessary files
- Reduced package file count from 38 to 28 files

## [1.0.1] - 2024-11-30

### Fixed

- Fixed empty repository URL in package.json
- Added homepage and bugs URLs
- Excluded test files from npm package (reduced package size from 18.5 kB to 17.1 kB)
- Updated Node.js requirement from 18+ to 24+
- Added proper exports field for better ESM support
- Added LICENSE file
- Added CHANGELOG.md
- Added .nvmrc file for Node version management
- Updated GitHub Actions workflow to use Node.js 24

### Improved

- Optimized TypeScript build configuration
- Better .npmignore to exclude unnecessary files
- Reduced package file count from 38 to 28 files

## [1.0.0] - 2024-11-30

### Fixed

- Fixed empty repository URL in package.json
- Added homepage and bugs URLs
- Excluded test files from npm package (reduced package size from 18.5 kB to 17.1 kB)
- Updated Node.js requirement from 18+ to 24+
- Added proper exports field for better ESM support
- Added LICENSE file
- Added CHANGELOG.md
- Added .nvmrc file for Node version management
- Updated GitHub Actions workflow to use Node.js 24

### Improved

- Optimized TypeScript build configuration
- Better .npmignore to exclude unnecessary files
- Reduced package file count from 38 to 28 files

## [1.0.0] - 2024-11-30

### Added

- Initial release of npm-warden
- CLI tool to audit npm dependencies for maintenance and security risks
- Comprehensive dependency analysis with package.json and lock file parsing
- Registry metadata fetching from npm registry API
- Risk detection for:
  - Stale packages (configurable threshold)
  - Low usage packages (configurable download threshold)
  - Security vulnerabilities (via npm audit integration)
- Flexible reporting with text and JSON output formats
- Configurable thresholds via command-line flags
- CI/CD integration support with exit codes
- Rate limiting for npm registry API requests

### Technical Details

- TypeScript-first with strict mode
- ESM-only modules
- Node.js 24+ support
- Built with Commander.js for CLI interface
- Full type safety with TypeScript

