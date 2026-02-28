# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-02-27

### Added

- Concurrent skill installation with multi-spinner UI
- Auto-append `--agent`, `--copy`, `--confirm` flags to skill install commands

### Fixed

- Add type assertion for `repo.split` return in publish command
- Replace `execFileSync` with `execSync` to resolve DEP0190 warning

## [0.1.0] - 2026-02-27

### Added

- CLI with all commands: `add`, `search`, `init`, `publish`, `login`, `logout`
- Multi-target installs (Claude, Codex, Gemini)
- Author search filter
- Publish repo verification
- Validate manifest `author/name` against GitHub repo in publish command
- Skills installation via npx `skills.sh` with command string format
- File conflict resolution (append/overwrite/skip)
- Interactive and non-interactive modes (`-y` flag)
- Dry-run preview mode
- Include empty `tags` array in generated `updose.json`
- Unit tests for core modules
- Platform-independent path handling
- MIT license

[0.2.0]: https://github.com/Alchemist85K/updose/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Alchemist85K/updose/releases/tag/v0.1.0
