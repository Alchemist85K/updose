# updose

Search, install, and share boilerplates for AI coding tools.

Manage configurations for [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [Codex](https://github.com/openai/codex), and [Gemini CLI](https://github.com/google-gemini/gemini-cli) through GitHub repositories.

> Requires Node.js 18 or later.

```bash
npx updose <command>
```

## Table of Contents

- [Quick Start](#quick-start)
- [Commands](#commands)
  - [add](#updose-add-repo)
  - [search](#updose-search-query)
  - [init](#updose-init)
  - [publish](#updose-publish)
  - [login / logout](#updose-login--updose-logout)
- [Supported Targets](#supported-targets)
  - [Where Files Get Installed](#where-files-get-installed)
  - [File Conflict Resolution](#file-conflict-resolution)
- [Creating a Boilerplate](#creating-a-boilerplate)
  - [Boilerplate Directory Structure](#boilerplate-directory-structure)
  - [updose.json Reference](#updosejson-reference)
  - [skills.json Reference](#skillsjson-reference)
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
npx updose add owner/repo-name -y         # Skip all prompts (auto-select target, auto-resolve conflicts)
npx updose add owner/repo-name --dry-run  # Preview what would be installed without writing any files
```

**What happens when you run `add`:**

1. Fetches the boilerplate's `updose.json` manifest from the GitHub repository
2. If the boilerplate supports multiple targets (e.g., both Claude and Gemini), prompts you to choose one
3. Downloads and installs the target-specific files into your project
4. If a file already exists in your project, prompts you to **Append**, **Overwrite**, or **Skip**
5. Installs any skills defined in `skills.json`

| Option | Description |
|--------|-------------|
| `-y, --yes` | Skip all interactive prompts. Auto-selects the first target, appends to main docs, and overwrites other files. |
| `--dry-run` | Lists all files and skills that would be installed, without actually writing anything. |

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

### `updose search <query>`

Search the marketplace for boilerplates.

```bash
npx updose search react
npx updose search "web framework"
npx updose search --target claude       # Only show boilerplates that support Claude
npx updose search --tag typescript      # Filter by tag
```

Results display the boilerplate name, version, author, description, rating, download count, supported targets, and tags.

| Option | Description |
|--------|-------------|
| `--target <target>` | Filter results by target: `claude`, `codex`, or `gemini`. |
| `--tag <tag>` | Filter results by tag (e.g., `react`, `typescript`, `web`). |

### `updose init`

Scaffold a new boilerplate repository with the correct directory structure.

```bash
mkdir my-boilerplate && cd my-boilerplate
npx updose init
```

The interactive wizard prompts you for:

- **Name** — the boilerplate name
- **Description** — a short description
- **Author** — auto-detected from your GitHub username (`git config github.user` or `gh api user`)
- **Targets** — which AI tools to support (Claude, Codex, Gemini)

Based on your target selection, `init` generates the following files:

| Target | Generated Files |
|--------|----------------|
| Claude | `claude/CLAUDE.md`, `claude/rules/`, `claude/agents/`, `claude/skills/` |
| Codex | `codex/AGENTS.md` |
| Gemini | `gemini/GEMINI.md`, `gemini/skills/` |

Every scaffold also includes `updose.json`, `skills.json`, and a `README.md`.

### `updose publish`

Publish your boilerplate to the marketplace so others can find and install it.

```bash
npx updose publish
```

This command:

1. Reads and validates your local `updose.json`
2. Detects the GitHub repository from `git remote origin`
3. Authenticates via GitHub (runs `login` if needed)
4. Shows a summary of what will be published and asks for confirmation
5. Registers the boilerplate in the marketplace

### `updose login` / `updose logout`

Manage GitHub authentication.

```bash
npx updose login   # Authenticate via GitHub Device Flow
npx updose logout  # Remove stored credentials
```

`login` uses [GitHub Device Flow](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow) — it displays a code for you to enter at github.com. Credentials are stored locally at `~/.updose/auth.json`. If a valid token already exists, it is reused automatically.

## Supported Targets

updose supports three AI coding tool targets:

| Target | Main Doc | Config Directory | Skills Directory |
|--------|----------|-----------------|-----------------|
| **Claude** (Claude Code) | `CLAUDE.md` | `.claude/` | `.claude/skills/` |
| **Codex** (OpenAI Codex) | `AGENTS.md` | Project root | `.agents/skills/` |
| **Gemini** (Gemini CLI) | `GEMINI.md` | `.gemini/` | `.gemini/skills/` |

### Where Files Get Installed

When you run `updose add`, files from the boilerplate's target directory are mapped to your project:

| Target | Source (in boilerplate repo) | Installed to (in your project) |
|--------|------------------------------|-------------------------------|
| Claude | `claude/CLAUDE.md` | `CLAUDE.md` (project root) |
| Claude | `claude/rules/code-style.md` | `.claude/rules/code-style.md` |
| Claude | `claude/commands/review.md` | `.claude/commands/review.md` |
| Codex | `codex/AGENTS.md` | `AGENTS.md` (project root) |
| Codex | `codex/.agents/skills/...` | `.agents/skills/...` |
| Gemini | `gemini/GEMINI.md` | `GEMINI.md` (project root) |
| Gemini | `gemini/commands/review.toml` | `.gemini/commands/review.toml` |

Main docs (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`) are always placed at the project root. All other files go into the target's config directory.

### File Conflict Resolution

When a file already exists in your project, updose asks how to handle it:

| File Type | Interactive Mode | With `--yes` |
|-----------|-----------------|-------------|
| Main docs (`CLAUDE.md`, etc.) | Append / Overwrite / Skip | Append |
| Other files | Overwrite / Skip | Overwrite |

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

### updose.json Reference

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

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | The boilerplate name. |
| `author` | Yes | Author name (typically your GitHub username). |
| `version` | Yes | Version string following [semver](https://semver.org/) (e.g., `1.0.0`). |
| `targets` | Yes | Array of supported targets: `"claude"`, `"codex"`, and/or `"gemini"`. |
| `description` | No | A short description shown in search results. |
| `tags` | No | Array of tags for search discovery (e.g., `["react", "typescript"]`). |

### skills.json Reference

An optional file that declares external skill dependencies. When a user installs your boilerplate, these skills are automatically installed via `npx skills add`.

```json
{
  "skills": [
    {
      "repo": "https://github.com/intellectronica/agent-skills",
      "skill": "context7"
    },
    {
      "repo": "https://github.com/microsoft/playwright-cli",
      "skill": "playwright-cli"
    }
  ]
}
```

| Field | Description |
|-------|-------------|
| `skills` | Array of skill entries. |
| `skills[].repo` | GitHub repository URL that hosts the skill. |
| `skills[].skill` | Name of the skill to install from that repository. |

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

When a user installs a multi-target boilerplate, they are prompted to choose which target to install. With `-y`, the first target in the list is selected automatically.

## Publishing

To share your boilerplate with others through the marketplace:

```bash
# 1. Create and configure your boilerplate
mkdir my-boilerplate && cd my-boilerplate
npx updose init

# 2. Add your content (rules, commands, agents, skills, etc.)

# 3. Push to a GitHub repository
git init && git add . && git commit -m "Initial commit"
gh repo create my-boilerplate --public --source=. --push

# 4. Authenticate and publish
npx updose login
npx updose publish
```

After publishing, anyone can install your boilerplate with:

```bash
npx updose add your-username/my-boilerplate
```

## License

MIT
