# Boilerplate Example: Codex

A single-target boilerplate for **Codex**.

## Structure

```
boilerplate-codex/
├── updose.json       # Package manifest
├── skills.json       # External skill dependencies
└── codex/
    ├── AGENTS.md     # Agent instructions
    └── .agents/
        └── skills/
            └── react-guide/
                └── SKILL.md
```

## What This Shows

- Minimal Codex directory layout (`AGENTS.md` as the main instruction file)
- External skill dependencies via `skills.json`
- How `updose.json` declares a single target (`"targets": ["codex"]`)

## Install

```bash
updose add example-user/react-starter
```
