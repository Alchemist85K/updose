# Boilerplate Example: Claude Code

A single-target boilerplate for **Claude Code**.

## Structure

```
boilerplate-claude/
├── updose.json              # Package manifest
├── skills.json              # External skill dependencies
└── claude/
    ├── CLAUDE.md            # Main instructions
    ├── rules/
    │   ├── code-style.md    # Code style rules
    │   └── testing.md       # Testing rules
    ├── commands/
    │   ├── review.md        # /review slash command
    │   └── test.md          # /test slash command
    ├── agents/
    │   └── reviewer.md      # Code reviewer agent
    └── skills/
        └── react-guide/
            └── SKILL.md
```

## What This Shows

- Full Claude Code directory layout (`rules/`, `commands/`, `agents/`, `skills/`)
- External skill dependencies via `skills.json`
- How `updose.json` declares a single target (`"targets": ["claude"]`)

## Install

```bash
updose add example-user/react-starter
```
