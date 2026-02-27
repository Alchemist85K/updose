# Boilerplate Example: Gemini CLI

A single-target boilerplate for **Gemini CLI**.

## Structure

```
boilerplate-gemini/
├── updose.json            # Package manifest
├── skills.json            # External skill dependencies
└── gemini/
    ├── GEMINI.md          # Main instructions
    ├── commands/
    │   ├── review.toml    # /review slash command
    │   └── test.toml      # /test slash command
    └── skills/
        └── react-guide/
            └── SKILL.md
```

## What This Shows

- Full Gemini CLI directory layout (`commands/`, `skills/`)
- TOML-based command definitions (Gemini's format)
- External skill dependencies via `skills.json`
- How `updose.json` declares a single target (`"targets": ["gemini"]`)

## Install

```bash
updose add example-user/react-starter
```
