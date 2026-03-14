# Architecture

Last updated: 2026-03-15

## Overview

2048-next is a multi-mode 2048 game with replay, undo, history, online leaderboard, and practice features. It is built as a Multi-Page Application (MPA) using Vite.

## Layer Architecture

```
HTML Pages (12) → Entry Scripts (src/entries/) → Legacy Loader
                                                      ↓
                                             Legacy Runtime (js/)
                                                      ↓
                                           Bootstrap Layer (src/bootstrap/)
                                                      ↓
                                             Core Engine (src/core/)
                                                      ↓
                                           Contracts (src/contracts/)
                                                      ↓
                                        Storage (src/storage/) + External API
```

### Core Engine (`src/core/`)
Pure TypeScript modules with ZERO DOM dependencies. Contains:
- **Engine class**: unified API for move, undo, replay, state import/export
- **Rules**: spawn tables, merge logic, mode configuration
- **Replay**: codec (v4 binary), import/export, step execution, flow control
- **Move**: path computation, tile interaction planning, scan
- **Undo**: snapshot creation, state restoration
- **Scoring**: post-move score with combo system

### Contracts (`src/contracts/`)
Single source of truth for all data structures:
- `ReplayRecord`, `HistoryRecord`, `SessionSnapshot`, `SubmitPayload`
- Schema versioning and migration support

### Bootstrap (`src/bootstrap/`)
DOM-wiring layer. Each file connects one core function to the browser.

### Runtime (`js/`)
Legacy JavaScript loaded via sequential `<script>` injection. The `game_manager.js` is a 10-line shell; all logic lives in `core_*_runtime.js` helper files compiled from `src/bootstrap/`.

### Entries (`src/entries/`)
Vite entry points. Uses `runtime-manifest.ts` for declarative dependency management.

## Key Data Flows

1. **Game Move**: Input → GameManager → runtime helpers → Core move-apply → scoring → actuator render
2. **Replay**: Import string → replay-codec decode → step-by-step execution via core replay functions
3. **History**: Game end → HistoryRecord → IndexedDB storage (with localStorage migration)
4. **Leaderboard**: Score submit → SubmitPayload → external API (taihe.fun)

## Build

- Tool: Vite 7 + TypeScript 5.9
- Output: `dist/` (MPA, 12 HTML entry points)
- Zero production dependencies

## Testing

- **Unit**: Vitest (668 tests across 125 files) — covers all `src/core/` and `src/bootstrap/`
- **Smoke**: Playwright (6 spec files) — covers page loading and interaction
- **Gates**: `game-manager-audit.mjs`, `refactor-closure-audit.mjs`, `quality-audit.mjs`
- **Tiers**: tier-1 (PR quick), tier-2 (merge gate), tier-3 (release full)

## Migration Status

The project is transitioning from monolithic legacy JS to typed TypeScript core. Current state:
- `game_manager.js`: 10 lines (shell only) ✅
- Core engine: active, unified API ✅
- Legacy loader: still in use, retirement planned per `MIGRATION_CHECKLIST.md`
