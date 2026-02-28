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
  - [Publishing](#publishing)
  - [License](#license)

## Quick Start

```bash
# Search for boilerplates in the marketplace
npx updose search react

# Install a boilerplate from a GitHub repository
npx updose add owner/repo-name

```

## Commands

### `updose add <repo>`

Install a boilerplate from a GitHub repository into your project.

```bash
npx updose add owner/repo-name
npx updose add owner/repo-name -y         # Skip all prompts (install all targets, append main docs, overwrite others)
npx updose add owner/repo-name --dry-run  # Preview what would be installed without writing any files
```

**What happens when you run `add`:**

1. Fetches the boilerplate's `updose.json` manifest from the GitHub repository
2. If the boilerplate supports multiple targets (e.g., both Claude and Gemini), prompts you to choose which targets to install. With `-y`, all targets are installed automatically.
3. Downloads the file tree from the repository and filters files for the selected target(s)
4. Installs each file into your project. If a file already exists, the prompt depends on the file type:
   - **Main docs** (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`): **Append** / **Overwrite** / **Skip**
   - **Other files** (rules, commands, agents, etc.): **Overwrite** / **Skip**
5. If a `skills.json` file exists in the boilerplate, installs each declared skill by running [`npx skills add`](https://skills.sh/) under the hood

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

At least one of the query or filter options must be provided. Running `npx updose search` with no arguments will show an error.

Results display the boilerplate name, version, author, description, rating, download count, supported targets, and tags.

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

**What happens when you run `init`:**

1. Prompts you for boilerplate configuration (see below)
2. Generates `updose.json`, `skills.json`, `README.md`, and target directories
3. If a file already exists, asks whether to **Overwrite** or **Skip**
4. Shows next steps for publishing

**Interactive prompts:**

| Prompt          | Description                             | Default                                                                                                       |
|--------         |-------------                            |---------                                                                                                      |
| **Name**        | Boilerplate name                        | Current directory name                                                                                        |
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

**Example — scaffolding with all targets selected:**

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

After scaffolding, follow the next steps printed by the command:

1. Edit your boilerplate files in each target directory
2. Push to GitHub
3. Publish with `npx updose publish`
4. Others can install with `npx updose add <author>/<name>`

### `updose publish`

Publish your boilerplate to the marketplace so others can find and install it.

```bash
npx updose publish
```

**What happens when you run `publish`:**

1. Reads and parses `updose.json` from the current directory. If the file is missing, shows an error and suggests running `updose init` first.
2. Validates the manifest structure (name, author, version, targets are required)
3. Detects the GitHub repository by running `git remote get-url origin`. Supports both HTTPS (`https://github.com/owner/repo.git`) and SSH (`git@github.com:owner/repo.git`) formats.
4. Authenticates via GitHub — if no valid token exists, automatically runs the `login` flow (see below)
5. Verifies the repository actually exists on GitHub. If the repo has not been pushed yet, shows an error and exits.
6. Displays a publication summary for review:

```
Publishing:
  Name:        react-starter
  Version:     1.0.0
  Repository:  example-user/react-starter
  Targets:     claude, gemini
  Tags:        react, typescript, web
```

7. Asks for confirmation: **"Publish to registry?"** (defaults to yes). If declined, displays "Publish cancelled." and exits.
8. Registers the boilerplate in the marketplace registry
9. On success, displays: `Users can now install with: npx updose add owner/repo`

**Prerequisites:**

- A valid `updose.json` in the current directory (run `updose init` to create one)
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
| `name`        | Yes       | The boilerplate name.                                                   |
| `author`      | Yes       | Author name (typically your GitHub username).                           |
| `version`     | Yes       | Version string following [semver](https://semver.org/) (e.g., `1.0.0`). |
| `targets`     | Yes       | Array of supported targets: `"claude"`, `"codex"`, and/or `"gemini"`.   |
| `description` | No        | A short description shown in search results.                            |
| `tags`        | No        | Array of tags for search discovery (e.g., `["react", "typescript"]`).   |

### `skills.json` Reference

An optional file that declares external skill dependencies. When a user installs your boilerplate, these skills are automatically installed via [skills.sh](https://skills.sh/).

Each entry in the `skills` array is a command string that is executed directly (e.g., `npx skills add <repo> --skill <name>`).

```json
{
  "skills": [
    "npx skills add https://github.com/intellectronica/agent-skills --skill context7",
    "npx skills add https://github.com/microsoft/playwright-cli --skill playwright-cli"
  ]
}
```

| Field      | Description                                                                    |
|-------     |-------------                                                                   |
| `skills`   | Array of command strings. Each command is split on whitespace and executed directly (no shell). |

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

## Publishing

To share your boilerplate with others through the marketplace:

1. Scaffold with `npx updose init`
2. Add your content (rules, commands, agents, skills, etc.)
3. Push to a GitHub repository
4. Run `npx updose publish`

After publishing, anyone can install your boilerplate with `npx updose add your-username/my-boilerplate`.

## License

MIT
