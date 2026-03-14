# Complexity & Resource Baseline Report

Generated: 2026-03-15

## 1. File Size Distribution

### Legacy Runtime (js/) - Top 10
| File | Lines |
|------|-------|
| core_game_manager_replay_helpers_runtime.js | 2645 |
| core_game_manager_move_input_helpers_runtime.js | 1311 |
| core_game_manager_saved_state_helpers_runtime.js | 1239 |
| core_game_manager_mode_rules_helpers_runtime.js | 1080 |
| core_game_manager_undo_stats_helpers_runtime.js | 776 |
| core_game_manager_base_helpers_runtime.js | 686 |
| core_game_manager_panel_timer_helpers_runtime.js | 670 |
| core_game_manager_restart_setup_helpers_runtime.js | 361 |
| core_game_manager_static_runtime.js | 323 |
| core_game_manager_setup_timer_ui_helpers_runtime.js | 313 |

### Core TypeScript (src/core/) - Top 10
| File | Lines |
|------|-------|
| game-settings-storage.ts | 597 |
| mode.ts | 567 |
| rules.ts | 218 |
| replay-execution.ts | 193 |
| special-rules.ts | 138 |
| replay-codec.ts | 123 |
| timer-interval.ts | 98 |
| direction-lock.ts | 96 |
| undo-stack-entry.ts | 94 |
| replay-timer.ts | 83 |

## 2. Function Density (Runtime Helpers)
| File | Functions | Lines/Function |
|------|-----------|----------------|
| replay_helpers | 249 | 10.6 |
| move_input_helpers | 124 | 10.6 |
| mode_rules_helpers | 119 | 9.1 |
| saved_state_helpers | 108 | 11.5 |

## 3. Build Output - Resource Budget

### Fonts
| Resource | Size | Budget | Status |
|----------|------|--------|--------|
| 雷鬼One.ttf | 4.05 MB | 200 KB | OVER BUDGET |
| ClearSans WOFF (3x) | 81 KB | 100 KB | OK |
| ClearSans SVG (3x) | 258 KB | 0 (remove) | OVER BUDGET |
| ClearSans EOT (3x) | 73 KB | 0 (remove) | OVER BUDGET |

### Images
| Resource | Size | Budget | Status |
|----------|------|--------|--------|
| favicon.svg | 844 KB | 50 KB | OVER BUDGET |
| logo.svg | 844 KB | 50 KB | OVER BUDGET |

### Total Build
| Metric | Value | Budget | Status |
|--------|-------|--------|--------|
| dist/ total | 8.4 MB | 3 MB | OVER BUDGET |

## 4. Architectural Debt Score

| Dimension | Score (1-5) | Notes |
|-----------|-------------|-------|
| Dual-stack complexity | 4/5 | 172 legacy JS + 139 TS files coexist |
| Engine abstraction | 5/5 | Engine class is 26-line placeholder |
| Entry duplication | 4/5 | Massive script arrays duplicated across entries |
| Storage efficiency | 3/5 | Full localStorage serialize/parse |
| Test coverage | 2/5 | Good (668 unit tests) |
| Resource optimization | 4/5 | 4MB+ font, 844KB SVGs |

## 5. Audit Gate Status
- game-manager-audit: PASS
- refactor-closure-audit: PASS
- Function hotspot limit (19 lines): PASS
- game_manager.js shell (≤80 lines): PASS (10 lines)
