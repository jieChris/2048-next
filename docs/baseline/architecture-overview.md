# 2048-next Architecture Overview

Generated: 2026-03-15 (Baseline Snapshot)

## Layer Diagram

```
┌─────────────────────────────────────────────────────────┐
│  HTML Entry Points (12 pages)                           │
│  index / play / undo / capped / practice / PKU2048      │
│  replay / modes / history / account / palette / test    │
└─────────────────┬───────────────────────────────────────┘
                  │ <script type="module">
┌─────────────────▼───────────────────────────────────────┐
│  src/entries/*.ts  (Vite entry points)                   │
│  - legacy-loader.ts: sequential <script> injection       │
│  - home-family-shared.ts: URL arrays for home pages     │
│  - play.ts / index.ts / ...: per-page entry scripts     │
└─────────────────┬───────────────────────────────────────┘
                  │ loadLegacyScriptsSequentially()
┌─────────────────▼───────────────────────────────────────┐
│  js/ Legacy Runtime (172 files)                          │
│  ┌───────────────────────────────────────────────┐      │
│  │ core_game_manager_*_runtime.js (18 files)     │      │
│  │ - Bridge: calls src/core via window globals   │      │
│  │ - 10654 lines total                           │      │
│  └───────────────────────────────────────────────┘      │
│  ┌───────────────────────────────────────────────┐      │
│  │ Non-core legacy (29 files)                    │      │
│  │ game_manager.js (10-line shell)               │      │
│  │ local_history_store.js (284 lines, localStorage) │   │
│  │ online_leaderboard_runtime.js (797 lines)     │      │
│  └───────────────────────────────────────────────┘      │
└─────────────────┬───────────────────────────────────────┘
                  │ window.* globals
┌─────────────────▼───────────────────────────────────────┐
│  src/bootstrap/*.ts (93 files)                           │
│  - DOM wiring layer, compiled to js/core_*_runtime.js   │
│  - Categories: play, mobile, home-guide, settings, etc  │
└─────────────────┬───────────────────────────────────────┘
                  │ imports
┌─────────────────▼───────────────────────────────────────┐
│  src/core/*.ts (32 files, 3231 lines)                    │
│  Pure TS game logic (NO DOM, NO side effects)            │
│  ┌─────────────────────────────────────────────┐        │
│  │ engine.ts      - minimal shell (26 lines)   │        │
│  │ mode.ts        - mode config (567 lines)    │        │
│  │ rules.ts       - spawn/merge (218 lines)    │        │
│  │ replay-*.ts    - codec/flow/control (7 files)│        │
│  │ move-*.ts      - path/scan/apply (3 files)  │        │
│  │ undo-*.ts      - snapshot/restore (6 files) │        │
│  │ scoring.ts     - score computation          │        │
│  │ game-settings-storage.ts (597 lines)        │        │
│  └─────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│  Storage & API                                           │
│  - localStorage (game state, history, settings)         │
│  - External API: https://taihe.fun (leaderboard)        │
└─────────────────────────────────────────────────────────┘

## Data Flow: Game Move

1. User key/swipe → keyboard_input_manager.js → GameManager.move(dir)
2. GameManager → core_game_manager_move_input_helpers_runtime.js
3. Runtime helper → window.CoreMoveApplyRuntime (from src/core/move-apply.ts)
4. Core computes: move path → merge effects → scoring → post-move lifecycle
5. Result → html_actuator.js renders tile animations
6. History/replay → local_history_store.js / replay-codec.ts

## Key Metrics

| Metric | Value |
|--------|-------|
| HTML entry points | 12 |
| src/ TS files | 139 |
| js/ legacy files | 172 |
| Unit test files | 125 (668 tests) |
| Smoke test files | 6 |
| Build output | 8.4 MB |
| Build time | ~1s |
| Unit test time | ~6s |

## Resource Hotspots

| Resource | Size | Issue |
|----------|------|-------|
| 雷鬼One.ttf | 4.05 MB | Full CJK font, not subsetted |
| favicon.svg | 844 KB | Unoptimized SVG |
| logo.svg | 844 KB | Unoptimized SVG (same content as favicon) |
| ClearSans SVGs | 80-96 KB each | SVG font format (legacy) |

## Complexity Hotspots

| File | Lines | Functions |
|------|-------|-----------|
| core_game_manager_replay_helpers_runtime.js | 2645 | 249 |
| core_game_manager_move_input_helpers_runtime.js | 1311 | 124 |
| core_game_manager_saved_state_helpers_runtime.js | 1239 | 108 |
| core_game_manager_mode_rules_helpers_runtime.js | 1080 | 119 |
| online_leaderboard_runtime.js | 797 | - |
| game-settings-storage.ts | 597 | - |
| mode.ts | 567 | - |
