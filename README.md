# updose

Search, install, and share boilerplates for AI coding tools.

Manage configurations for [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [Codex](https://github.com/openai/codex), and [Gemini CLI](https://github.com/google-gemini/gemini-cli) through GitHub repositories.

> Requires Node.js 18 or later.

```bash
npx updose <command>
```

## Table of Contents

- [updose](#updose)
  - [Table of Contents](#table-of-contents)
  - [Quick Start](#quick-start)
  - [Commands](#commands)
    - [`updose add <repo>`](#updose-add-repo)
    - [`updose search [query]`](#updose-search-query)
    - [`updose init`](#updose-init)
    - [`updose publish`](#updose-publish)
    - [`updose login`](#updose-login)
    - [`updose logout`](#updose-logout)
  - [Supported Targets](#supported-targets)
    - [Where Files Get Installed](#where-files-get-installed)
    - [File Conflict Resolution](#file-conflict-resolution)
  - [Creating a Boilerplate](#creating-a-boilerplate)
    - [Boilerplate Directory Structure](#boilerplate-directory-structure)
    - [`updose.json` Reference](#updosejson-reference)
    - [`skills.json` Reference](#skillsjson-reference)
    - [Example: Single-Target Boilerplate (Claude)](#example-single-target-boilerplate-claude)
    - [Example: Multi-Target Boilerplate](#example-multi-target-boilerplate)
    - [Monorepo Support](#monorepo-support)
  - [Publishing](#publishing)
  - [License](#license)

## Quick Start

```bash
# Search for boilerplates in the marketplace
npx updose search react

# Install a boilerplate from a GitHub repository
npx updose add owner/repo-name

# Install from a subdirectory within a monorepo
npx updose add owner/repo-name/nextjs
```

## Commands

### `updose add <repo>`

Install a boilerplate from a GitHub repository into your project.

The `<repo>` argument accepts two formats:

- **`owner/repo`** — installs from the repository root (standard boilerplate)
- **`owner/repo/dir`** — installs from a subdirectory within the repository (monorepo boilerplate). The `dir` can be nested (e.g., `owner/repo/templates/v2`).

```bash
npx updose add owner/repo-name                  # Install from repository root
npx updose add owner/repo-name/nextjs            # Install from "nextjs" subdirectory
npx updose add owner/repo-name/templates/v2      # Install from nested subdirectory
npx updose add owner/repo-name -y                # Skip all prompts
npx updose add owner/repo-name/nextjs --dry-run  # Preview monorepo install
```

**What happens when you run `add`:**

1. Parses the `<repo>` argument to determine the repository (`owner/repo`) and optional subdirectory
2. Fetches the boilerplate's `updose.json` manifest from the repository root or the specified subdirectory
3. If the boilerplate supports multiple targets (e.g., both Claude and Gemini), prompts you to choose which targets to install. With `-y`, all targets are installed automatically.
4. Downloads the file tree from the repository and filters files for the selected target(s). When a subdirectory is specified, only files under that subdirectory are considered.
5. Installs each file into your project. If a file already exists, the prompt depends on the file type:
   - **Main docs** (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`): **Append** / **Overwrite** / **Skip**
   - **Other files** (rules, commands, agents, etc.): **Overwrite** / **Skip**
6. If a `skills.json` file exists in the boilerplate (or its subdirectory), installs each declared skill via [skills.sh](https://skills.sh/). Skills are installed for the selected targets (`-a`), copied into the project (`--copy`), and auto-confirmed (`-y`)

| Option      | Description                                                                                           |
|--------     |-------------                                                                                          |
| `-y, --yes` | Skip all interactive prompts. Installs all targets, appends to main docs, and overwrites other files. |
| `--dry-run` | Lists all files and skills that would be installed, without actually writing anything.                |

**Example — after installing a Claude boilerplate:**

```
my-project/
├── CLAUDE.md                          ← main instructions (project root)
├── .claude/
│   ├── rules/
│   │   ├── code-style.md
│   │   └── testing.md
│   ├── commands/
│   │   ├── review.md
│   │   └── test.md
│   ├── agents/
│   │   └── reviewer.md
│   └── skills/
│       └── react-guide/
│           └── SKILL.md
```

See the full example in [`examples/after-install-claude/`](examples/after-install-claude/).
Also available: [`examples/after-install-codex/`](examples/after-install-codex/) and [`examples/after-install-gemini/`](examples/after-install-gemini/).

### `updose search [query]`

Search the marketplace for boilerplates. The query is optional — you can search by keyword, filter by options, or combine both.

```bash
# Search by keyword
npx updose search react
npx updose search "web framework"

# Filter by target, tag, or author
npx updose search --target claude       # Only show boilerplates that support Claude
npx updose search --tag typescript      # Filter by tag
npx updose search --author james        # Filter by author

# Combine keyword with filters
npx updose search react --target claude              # React boilerplates for Claude
npx updose search react --author james               # React boilerplates by james
npx updose search react --target gemini --tag web    # React + Gemini + web tag

# Filter-only search (no keyword)
npx updose search --author james                      # All boilerplates by james
npx updose search --author james --target claude      # james's Claude boilerplates
npx updose search --tag typescript --target codex     # TypeScript boilerplates for Codex
```

Running `npx updose search` with no arguments returns popular boilerplates.

Results display the boilerplate name, version, author, description, download count, supported targets, and tags.

| Option              | Description                                                 |
|--------             |-------------                                                |
| `--target <target>` | Filter results by target: `claude`, `codex`, or `gemini`.   |
| `--tag <tag>`       | Filter results by tag (e.g., `react`, `typescript`, `web`). |
| `--author <author>` | Filter results by author (e.g., `example-user`).            |

### `updose init`

Scaffold a new boilerplate repository with the correct directory structure.

```bash
mkdir my-boilerplate && cd my-boilerplate
npx updose init
```

To scaffold inside a subdirectory (for monorepo setups), use the `--dir` option:

```bash
npx updose init --dir nextjs          # Creates boilerplate in the "nextjs" subdirectory
npx updose init --dir templates/v2    # Nested subdirectory is also supported
```

| Option         | Description                                                                                                                |
|--------        |-------------                                                                                                               |
| `--dir <dir>`  | Create the boilerplate inside the specified subdirectory instead of the repository root. The directory is created if it doesn't exist. |

**What happens when you run `init`:**

1. Prompts you for boilerplate configuration (see below)
2. Generates `updose.json`, `skills.json`, `README.md`, and target directories
3. If a file already exists, asks whether to **Overwrite** or **Skip**
4. Shows next steps for publishing

When `--dir` is used, all generated files are placed inside the specified subdirectory instead of the repository root.

**Interactive prompts:**

| Prompt          | Description                             | Default                                                                                                       |
|--------         |-------------                            |---------                                                                                                      |
| **Name**        | Boilerplate name                        | Without `--dir`: current directory name (e.g., `my-boilerplate`). With `--dir`: `<repo>/<dir>` (e.g., `my-boilerplate/nextjs`) |
| **Description** | Short description (optional)            | —                                                                                                             |
| **Author**      | GitHub username                         | Auto-detected from `git config github.user` or `gh api user`. If neither is available, you enter it manually. |
| **Targets**     | Which AI tools to support (multiselect) | All selected (`claude`, `codex`, `gemini`)                                                                    |

**Generated files:**

Every scaffold includes these common files:

| File          | Description                                                                                   |
|------         |-------------                                                                                  |
| `updose.json` | Manifest with name, author, version, and targets                                              |
| `skills.json` | Empty skills array (see [skills.json Reference](#skillsjson-reference) for how to add skills) |
| `README.md`   | Project description, target list, and installation instructions                               |

Plus target-specific directories based on your selection:

| Target  | Generated Files                                                         |
|-------- |----------------                                                         |
| Claude  | `claude/CLAUDE.md`, `claude/rules/`, `claude/agents/`, `claude/skills/` |
| Codex   | `codex/AGENTS.md`                                                       |
| Gemini  | `gemini/GEMINI.md`, `gemini/skills/`                                    |

**Example — scaffolding with all targets selected (no `--dir`):**

```
my-boilerplate/
├── updose.json
├── skills.json
├── README.md
├── claude/
│   ├── CLAUDE.md
│   ├── rules/
│   ├── agents/
│   └── skills/
├── codex/
│   └── AGENTS.md
└── gemini/
    ├── GEMINI.md
    └── skills/
```

**Example — scaffolding with `--dir nextjs`:**

```
my-monorepo/
├── nextjs/                  ← created by --dir
│   ├── updose.json
│   ├── skills.json
│   ├── README.md
│   ├── claude/
│   │   ├── CLAUDE.md
│   │   ├── rules/
│   │   ├── agents/
│   │   └── skills/
│   ├── codex/
│   │   └── AGENTS.md
│   └── gemini/
│       ├── GEMINI.md
│       └── skills/
├── remix/                   ← another boilerplate in the same repo
│   └── ...
└── README.md                ← repo-level README (not managed by updose)
```

After scaffolding, follow the next steps printed by the command:

1. Edit your boilerplate files in each target directory
2. Push to GitHub
3. Publish with `npx updose publish` (or `npx updose publish --dir nextjs` for monorepo)
4. Others can install with `npx updose add <author>/<name>` (or `npx updose add <author>/<repo>/nextjs` for monorepo)

### `updose publish`

Publish your boilerplate to the marketplace so others can find and install it.

```bash
npx updose publish                   # Publish from repository root
npx updose publish --dir nextjs      # Publish from a subdirectory (monorepo)
```

| Option         | Description                                                                                                           |
|--------        |-------------                                                                                                          |
| `--dir <dir>`  | Read `updose.json` from the specified subdirectory instead of the repository root. Use this when publishing a monorepo boilerplate. |

**What happens when you run `publish`:**

1. Reads and parses `updose.json` from the current directory (or the subdirectory specified by `--dir`). If the file is missing, shows an error and suggests running `updose init` first.
2. Validates the manifest structure (name, author, version, targets are required)
3. Detects the GitHub repository by running `git remote get-url origin`. Supports both HTTPS (`https://github.com/owner/repo.git`) and SSH (`git@github.com:owner/repo.git`) formats.
4. Validates that `author` and `name` in `updose.json` match the expected name:
   - Without `--dir`: `name` must match the repository name (e.g., `react-starter`)
   - With `--dir`: `name` must match `<repo>/<dir>` (e.g., `my-monorepo/nextjs`)
5. Authenticates via GitHub — if no valid token exists, automatically runs the `login` flow (see below)
6. Verifies the repository actually exists on GitHub. If the repo has not been pushed yet, shows an error and exits.
7. Displays a publication summary for review:

```
Publishing:
  Name:        react-starter
  Version:     1.0.0
  Repository:  example-user/react-starter
  Targets:     claude, gemini
  Tags:        react, typescript, web
```

When `--dir` is used, the summary also includes a `Directory` field:

```
Publishing:
  Name:        my-monorepo/nextjs
  Version:     1.0.0
  Repository:  example-user/my-monorepo
  Directory:   nextjs
  Targets:     claude
  Tags:        react, nextjs
```

8. Asks for confirmation: **"Publish to registry?"** (defaults to yes). If declined, displays "Publish cancelled." and exits.
9. Registers the boilerplate in the marketplace registry
10. On success, displays the install command:
    - Without `--dir`: `Users can now install with: npx updose add owner/repo`
    - With `--dir`: `Users can now install with: npx updose add owner/repo/dir`

**Prerequisites:**

- A valid `updose.json` in the current directory or specified subdirectory (run `updose init` to create one)
- A GitHub remote (`origin`) configured and pushed to GitHub
- GitHub authentication (handled automatically if not already logged in)

### `updose login`

Authenticate with GitHub using the [Device Flow](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow).

```bash
npx updose login
```

**What happens when you run `login`:**

1. Checks for an existing token stored at `~/.updose/auth.json`
2. If a token is found, verifies it by calling the GitHub API
   - If valid, displays **"Already logged in as {username}"** and exits immediately
   - If invalid/expired, proceeds to re-authenticate
3. Initiates the GitHub Device Flow and displays instructions:

```
To authenticate with GitHub:

  1. Open https://github.com/login/device
  2. Enter code: ABCD-1234
```

4. Polls GitHub for authorization until you enter the code on the website
5. On success, fetches your GitHub username and stores the credentials at `~/.updose/auth.json` (file permissions: owner read/write only)

**Stored credentials (`~/.updose/auth.json`):**

```json
{
  "github_token": "gho_xxxxxxxxxxxx",
  "github_username": "your-username"
}
```

The token is requested with `public_repo` scope, which grants read/write access to public repositories only.

### `updose logout`

Remove stored GitHub credentials.

```bash
npx updose logout
```

**What happens when you run `logout`:**

1. Reads the stored auth data from `~/.updose/auth.json`
2. If no auth file is found, displays **"Not currently logged in."** and exits
3. If auth exists, deletes `~/.updose/auth.json` and displays **"Logged out from {username}."**

## Supported Targets

updose supports three AI coding tool targets:

| Target                    | Main Doc    | Config Directory  | Skills Directory  |
|--------                   |----------   |-----------------  |-----------------  |
| **Claude** (Claude Code)  | `CLAUDE.md` | `.claude/`        | `.claude/skills/` |
| **Codex** (OpenAI Codex)  | `AGENTS.md` | Project root      | `.agents/skills/` |
| **Gemini** (Gemini CLI)   | `GEMINI.md` | `.gemini/`        | `.gemini/skills/` |

### Where Files Get Installed

When you run `updose add`, files from the boilerplate's target directory are mapped to your project:

| Target  | Source (in boilerplate repo)          | Installed to (in your project)        |
|-------- |------------------------------         |-------------------------------        |
| Claude  | `claude/CLAUDE.md`                    | `CLAUDE.md` (project root)            |
| Claude  | `claude/rules/code-style.md`          | `.claude/rules/code-style.md`         |
| Claude  | `claude/skills/react-guide/SKILL.md`  | `.claude/skills/react-guide/SKILL.md` |
| Codex   | `codex/AGENTS.md`                     | `AGENTS.md` (project root)            |
| Codex   | `codex/.agents/skills/...`            | `.agents/skills/...`                  |
| Gemini  | `gemini/GEMINI.md`                    | `GEMINI.md` (project root)            |
| Gemini  | `gemini/commands/review.toml`         | `.gemini/commands/review.toml`        |

Main docs (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`) are always placed at the project root. All other files go into the target's config directory.

### File Conflict Resolution

When a file already exists in your project, updose asks how to handle it:

| File Type                     | Interactive Mode          | With `--yes` |
|-----------                    |-----------------          |------------- |
| Main docs (`CLAUDE.md`, etc.) | Append / Overwrite / Skip | Append       |
| Other files                   | Overwrite / Skip          | Overwrite    |

- **Append** — adds the new content to the end of the existing file, separated by `---`
- **Overwrite** — replaces the file entirely
- **Skip** — leaves the existing file untouched

## Creating a Boilerplate

### Boilerplate Directory Structure

A boilerplate repository contains a `updose.json` manifest, an optional `skills.json`, and one directory per supported target.

```
my-boilerplate/
├── updose.json              ← required manifest
├── skills.json              ← optional skill dependencies
├── README.md
├── claude/                  ← Claude target files
│   ├── CLAUDE.md
│   ├── rules/
│   │   ├── code-style.md
│   │   └── testing.md
│   ├── commands/
│   │   ├── review.md
│   │   └── test.md
│   ├── agents/
│   │   └── reviewer.md
│   └── skills/
│       └── react-guide/
│           └── SKILL.md
├── codex/                   ← Codex target files
│   ├── AGENTS.md
│   └── .agents/
│       └── skills/
│           └── react-guide/
│               └── SKILL.md
└── gemini/                  ← Gemini target files
    ├── GEMINI.md
    ├── commands/
    │   ├── review.toml
    │   └── test.toml
    └── skills/
        └── react-guide/
            └── SKILL.md
```

See complete examples in:
- [`examples/boilerplate-claude/`](examples/boilerplate-claude/) — single-target (Claude)
- [`examples/boilerplate-codex/`](examples/boilerplate-codex/) — single-target (Codex)
- [`examples/boilerplate-gemini/`](examples/boilerplate-gemini/) — single-target (Gemini)
- [`examples/boilerplate-multi-target/`](examples/boilerplate-multi-target/) — multi-target (all three)

### `updose.json` Reference

The manifest file that describes your boilerplate.

```json
{
  "name": "react-starter",
  "author": "example-user",
  "version": "1.0.0",
  "description": "React + TypeScript boilerplate for AI coding tools",
  "targets": ["claude", "gemini"],
  "tags": ["react", "typescript", "web"]
}
```

| Field         | Required  | Description                                                             |
|-------        |---------- |-------------                                                            |
| `name`        | Yes       | The boilerplate name. Must match the GitHub repository name (e.g., `react-starter`). For monorepo boilerplates, must be `<repo>/<dir>` (e.g., `my-starters/nextjs`). |
| `author`      | Yes       | Author name. Must match the GitHub repository owner.                    |
| `version`     | Yes       | Version string following [semver](https://semver.org/) (e.g., `1.0.0`). |
| `targets`     | Yes       | Array of supported targets: `"claude"`, `"codex"`, and/or `"gemini"`.   |
| `description` | No        | A short description shown in search results.                            |
| `tags`        | No        | Array of tags for search discovery (e.g., `["react", "typescript"]`).   |

### `skills.json` Reference

An optional file that declares external skill dependencies. When a user installs your boilerplate, these skills are automatically installed via [skills.sh](https://skills.sh/).

Each entry in the `skills` array is a command string (e.g., `npx skills add <repo> --skill <name>`). During installation, updose automatically appends the following flags:

- `-a <agents>` — installs for the selected targets (e.g., `-a claude-code codex gemini-cli`)
- `--copy` — copies skill files into the project instead of symlinking
- `-y` — skips confirmation prompts

```json
{
  "skills": [
    "npx skills add https://github.com/intellectronica/agent-skills --skill context7",
    "npx skills add https://github.com/microsoft/playwright-cli --skill playwright-cli"
  ]
}
```

For example, if a user selects Claude and Gemini as targets, the first command above becomes:

```bash
npx skills add https://github.com/intellectronica/agent-skills --skill context7 -a claude-code gemini-cli --copy -y
```

| Field      | Description                                                                    |
|-------     |-------------                                                                   |
| `skills`   | Array of command strings. Do not include `-a`, `--copy`, or `-y` flags — they are added automatically. |

Skills are installed into the target's skills directory (e.g., `.claude/skills/`, `.gemini/skills/`).

### Example: Single-Target Boilerplate (Claude)

From [`examples/boilerplate-claude/`](examples/boilerplate-claude/):

**updose.json**
```json
{
  "name": "react-starter",
  "author": "example-user",
  "version": "1.0.0",
  "description": "React + TypeScript boilerplate for Claude Code",
  "targets": ["claude"],
  "tags": ["react", "typescript", "web"]
}
```

**Directory structure:**
```
boilerplate-claude/
├── updose.json
├── skills.json
└── claude/
    ├── CLAUDE.md              ← main instructions (stack, conventions, etc.)
    ├── rules/
    │   ├── code-style.md      ← coding style rules
    │   └── testing.md         ← testing conventions
    ├── commands/
    │   ├── review.md          ← /review slash command
    │   └── test.md            ← /test slash command
    ├── agents/
    │   └── reviewer.md        ← automated reviewer agent
    └── skills/
        └── react-guide/
            └── SKILL.md       ← React best practices skill
```

When a user runs `npx updose add example-user/react-starter`, the result looks like [`examples/after-install-claude/`](examples/after-install-claude/).

### Example: Multi-Target Boilerplate

From [`examples/boilerplate-multi-target/`](examples/boilerplate-multi-target/):

A boilerplate can support multiple targets at once. Each target has its own directory with target-specific configurations.

**updose.json**
```json
{
  "name": "multi-target-starter",
  "author": "example-user",
  "version": "1.0.0",
  "description": "Starter boilerplate for Claude, Codex, and Gemini",
  "targets": ["claude", "codex", "gemini"],
  "tags": ["starter", "multi-target"]
}
```

**Directory structure:**
```
boilerplate-multi-target/
├── updose.json
├── skills.json
├── claude/
│   └── CLAUDE.md
├── codex/
│   └── AGENTS.md
└── gemini/
    └── GEMINI.md
```

When a user installs a multi-target boilerplate, they are prompted to choose which targets to install. With `-y`, all targets are installed automatically.

### Monorepo Support

A single GitHub repository can contain multiple boilerplates, each in its own subdirectory. This is useful when you want to publish several related boilerplates (e.g., framework-specific starters) from one repo.

**How it works:**

- Each subdirectory is an independent boilerplate with its own `updose.json`, `skills.json`, and target directories
- The `name` field in `updose.json` must be `<repo>/<dir>` (e.g., `my-starters/nextjs`)
- Users install with `npx updose add owner/repo/dir` instead of `npx updose add owner/repo`

**Monorepo directory structure:**

```
my-starters/                         ← GitHub repository root
├── README.md                        ← repo-level README (not managed by updose)
├── nextjs/                          ← boilerplate for Next.js
│   ├── updose.json                  ← name: "my-starters/nextjs"
│   ├── skills.json
│   ├── claude/
│   │   ├── CLAUDE.md
│   │   └── rules/
│   │       └── nextjs-conventions.md
│   └── gemini/
│       └── GEMINI.md
├── remix/                           ← boilerplate for Remix
│   ├── updose.json                  ← name: "my-starters/remix"
│   ├── skills.json
│   └── claude/
│       ├── CLAUDE.md
│       └── rules/
│           └── remix-conventions.md
└── sveltekit/                       ← boilerplate for SvelteKit
    ├── updose.json                  ← name: "my-starters/sveltekit"
    ├── skills.json
    └── claude/
        └── CLAUDE.md
```

**`updose.json` for a monorepo boilerplate (`nextjs/updose.json`):**

```json
{
  "name": "my-starters/nextjs",
  "author": "example-user",
  "version": "1.0.0",
  "description": "Next.js boilerplate for Claude and Gemini",
  "targets": ["claude", "gemini"],
  "tags": ["nextjs", "react", "web"]
}
```

> Note: The `name` field uses the format `<repo>/<dir>` (e.g., `my-starters/nextjs`), not just the directory name.

**Workflow for creating a monorepo boilerplate:**

```bash
# 1. Scaffold each boilerplate in its own subdirectory
npx updose init --dir nextjs
npx updose init --dir remix
npx updose init --dir sveltekit

# 2. Edit each boilerplate's files
# (edit nextjs/claude/CLAUDE.md, remix/claude/CLAUDE.md, etc.)

# 3. Push to GitHub
git add . && git commit -m "Add boilerplates" && git push

# 4. Publish each boilerplate separately
npx updose publish --dir nextjs
npx updose publish --dir remix
npx updose publish --dir sveltekit
```

**Users install each boilerplate independently:**

```bash
npx updose add example-user/my-starters/nextjs
npx updose add example-user/my-starters/remix
```

## Publishing

To share your boilerplate with others through the marketplace:

1. Scaffold with `npx updose init` (or `npx updose init --dir <dir>` for monorepo)
2. Add your content (rules, commands, agents, skills, etc.)
3. Push to a GitHub repository
4. Run `npx updose publish` (or `npx updose publish --dir <dir>` for monorepo)

After publishing, anyone can install your boilerplate:

```bash
# Standard boilerplate
npx updose add your-username/my-boilerplate

# Monorepo boilerplate
npx updose add your-username/my-monorepo/nextjs
```

## License

MIT
