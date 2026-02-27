# Boilerplate Example: Multi-Target

A boilerplate that supports **Claude Code**, **Codex**, and **Gemini CLI** simultaneously.

## Structure

```
boilerplate-multi-target/
├── updose.json        # Package manifest (all 3 targets)
├── skills.json        # External skill dependencies
├── claude/
│   └── CLAUDE.md      # Claude Code instructions
├── codex/
│   └── AGENTS.md      # Codex agent instructions
└── gemini/
    └── GEMINI.md      # Gemini CLI instructions
```

## What This Shows

- One boilerplate repo serving multiple AI coding tools
- Target-specific directories side by side (`claude/`, `codex/`, `gemini/`)
- How `updose.json` declares multiple targets (`"targets": ["claude", "codex", "gemini"]`)
- Users select which target to install at `updose add` time

## Install

```bash
updose add example-user/react-starter
# Prompts: Which target? > claude / codex / gemini
```
