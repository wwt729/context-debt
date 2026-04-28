# Changelog

All notable changes to `context-debt` are documented in this file.

The format follows Keep a Changelog and the project uses Semantic Versioning.

## [Unreleased]

### Added

- GitHub Actions CI for lint, test, build, and macOS/Linux package smoke coverage.
- Packaged CLI smoke test that validates the packed tarball contents and command behavior.
- A monorepo-style regression fixture to keep missing-reference false positives under control.
- Release documentation covering changelog updates, version bumps, packaging, and publish checks.

### Changed

- npm package metadata now exposes typed library exports and runs a publish gate through `prepublishOnly`.
- Build output now includes `.d.ts` declarations.
- CLI/version metadata now reads from `package.json` instead of a hard-coded version string.
- README now includes stronger examples for text output, JSON output, configuration, rules, CI, and MCP scanning.

## [0.1.0]

### Added

- Initial `scan`, `init`, `doctor`, and `fix` commands.
- Static rules for stale, conflicting, missing, duplicated, risky, and wasteful AI coding context.
- Text and JSON reports with CI-friendly exit codes.
- Conservative fixers for missing references, duplicate instruction removal, and compact context generation.
