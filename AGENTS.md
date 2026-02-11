# AGENTS.md

Guidance for AI coding agents working in this repository.

## Scope

This file applies to the entire repository rooted here.

## Project overview

`dot-printer-studio` is a Vite + React + TypeScript project with two web entry points:
- `index.html`: Dot Printer Studio (editor + in-app player mode)
- `player-demo.html`: standalone player demo and API playground

Core goals:
- Author and edit dot-matrix animations visually
- Import/export animation data (`.json` and `.dotp`)
- Play animations via a shared runtime (`DotPlayer`, `DotPlayerReact`)

## Stack

- React 18
- TypeScript
- Vite 5
- Zustand (state store)
- Canvas2D renderer

## Quick start

```bash
npm install
npm run dev
```

Useful scripts:
- `npm run dev`: local dev server
- `npm run typecheck`: TypeScript checks
- `npm run build`: production build
- `npm run ci`: typecheck + build (preferred verification command)
- `npm run preview`: preview built output
- `npm run build:pages`: build with GitHub Pages base path

## Repository map

- `src/components/`: UI components (editor, panels, player UI)
- `src/hooks/`: domain hooks (selection, canvas interaction, file IO, timing, transforms)
- `src/store/studioStore.ts`: Zustand app state + command/history wiring
- `src/lib/project.ts`: core project types, normalization, color optimization
- `src/lib/commands/`: command pattern and undo/redo history manager
- `src/lib/shapes/`, `src/lib/transforms/`, `src/lib/selection/`, `src/lib/groups/`: editing logic
- `src/player/`: runtime player (`DotPlayer`, `DotPlayerReact`, renderer, animation controller)
- `src/player-demo/`: standalone player demo app
- `samples/`: sample animation assets
- `.github/workflows/`: CI and GitHub Pages deploy

## Data model and format rules

The editor and player share a single animation model (`Project` / `DotPlayerData`).

When changing the format, update all relevant areas together:
- `src/lib/project.ts` (editor-side types + `normalizeProject`)
- `src/player/types.ts` and `src/player/utils.ts` (runtime types + validation)
- import/export paths in `src/hooks/useFileIO.ts` and `src/components/editorUtils.ts`
- docs (`README.md`) and sample assets if behavior changes

`.dotp` format:
- Header: `DOTP1`
- Payload: UTF-8 JSON for the project object

Do not introduce breaking format changes silently.

## Editing guidelines

- Prefer minimal, targeted edits.
- Keep TypeScript strictness intact; avoid `any` unless unavoidable.
- Preserve command-based undo/redo semantics for editor mutations.
- For new mutating editor actions, prefer implementing a command in `src/lib/commands/`.
- Keep editor/player compatibility: avoid model changes that only one side understands.
- Reuse existing utilities and hooks before adding new abstractions.
- Keep UI consistent with existing component patterns and `src/styles.css` conventions.

## Verification expectations

Before finishing significant changes, run:

```bash
npm run ci
```

For player/runtime or rendering changes, also manually verify in browser:
- `index.html` editor interactions
- `player-demo.html` playback controls and file loading

## Deployment notes

GitHub Pages deployment is handled by workflow files in `.github/workflows/`.

If you change build/base-path behavior, verify:
- `vite.config.ts` base handling
- Pages workflow environment variable (`VITE_BASE_PATH`)
- both entry points still load correctly after build

## SEO/documentation notes

If editing metadata:
- Keep `index.html` and `player-demo.html` metadata coherent
- Ensure title/description still match actual capabilities
- Prefer factual claims over marketing-only text

## Boundaries

- Do not commit secrets or credentials.
- Do not edit generated output in `dist/` manually.
- Do not remove existing user changes unrelated to your task.

## Definition of done

A change is done when:
- it solves the requested task,
- `npm run ci` passes,
- impacted flows are manually sanity-checked,
- and docs are updated when behavior or format changes.
