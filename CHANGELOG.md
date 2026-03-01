# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-02-28

### Changed

- Remove `avg_rating` and `rating_count` from `BoilerplateRow` interface
- Update `searchBoilerplates()` to return `SearchResponse` (`{ data, total }`) instead of raw array
- Remove rating display from search results (stats now show downloads and targets only)
- Allow parameterless `search` command to return popular boilerplates
- Send SHA256-hashed project path (`project_hash`) with download telemetry

### Added

- `SearchResponse` interface for paginated search results
- Website footer in search results linking to https://updose.dev/

## [0.3.0] - 2026-02-27

### Added

- Monorepo support: `--dir` option for `init` and `publish` commands
- `parseRepoInput()` to parse `owner/repo/dir` format in `add` command
- Subdirectory-aware manifest and skills.json fetching
- Display `dir` path in search results and publish summary
- Monorepo documentation and examples in README

### Fixed

- Literal `<repo>` in `init` next-steps output now shows actual repo name

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

[0.4.0]: https://github.com/Alchemist85K/updose/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/Alchemist85K/updose/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Alchemist85K/updose/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Alchemist85K/updose/releases/tag/v0.1.0
