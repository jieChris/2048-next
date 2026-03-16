# Complexity & Resource Baseline Report

Generated: 2026-03-16

Data source commands:
- `npm run build`
- `npm run report:baseline`
- `npm run audit:resource-budget`

## 1. File Size Distribution

### Legacy Runtime (js/) - Top 10
| File | Lines |
|------|-------|
| core_game_manager_replay_helpers_runtime.js | 2675 |
| core_game_manager_move_input_helpers_runtime.js | 1325 |
| core_game_manager_saved_state_helpers_runtime.js | 1242 |
| core_game_manager_mode_rules_helpers_runtime.js | 1081 |
| core_game_manager_undo_stats_helpers_runtime.js | 1019 |
| core_game_manager_base_helpers_runtime.js | 687 |
| core_game_manager_panel_timer_helpers_runtime.js | 671 |
| core_game_manager_restart_setup_helpers_runtime.js | 363 |
| core_game_manager_static_runtime.js | 324 |
| core_game_manager_setup_timer_ui_helpers_runtime.js | 314 |

### Core TypeScript (src/core/) - Top 10
| File | Lines |
|------|-------|
| game-settings-storage.ts | 598 |
| mode.ts | 568 |
| rules.ts | 219 |
| replay-execution.ts | 194 |
| special-rules.ts | 139 |
| replay-codec.ts | 124 |
| timer-interval.ts | 99 |
| direction-lock.ts | 97 |
| undo-stack-entry.ts | 95 |
| move-path.ts | 84 |

## 3. Build Output - Resource Budget

### Fonts
| Resource | Size | Budget | Status |
|----------|------|--------|--------|
| ClearSans WOFF (3x) | 80.65 KB | 100 KB | OK |
| ClearSans SVG (3x) | 252.10 KB | 300 KB | OK |
| ClearSans EOT (3x) | 71.17 KB | 100 KB | OK |

### Images
| Resource | Size | Budget | Status |
|----------|------|--------|--------|
| favicon.svg | 64.70 KB | 80 KB | OK |
| logo.svg | 64.69 KB | 80 KB | OK |

### Total Build
| Metric | Value | Budget | Status |
|--------|-------|--------|--------|
| dist/ total | 2.4 MB | 3 MB | OK |

## 4. Architectural Debt Score

| Dimension | Score (1-5) | Notes |
|-----------|-------------|-------|
| Dual-stack complexity | 4/5 | 175 legacy JS + 144 TS files coexist |
| Engine abstraction | 5/5 | Engine class is 26-line placeholder |
| Entry duplication | 4/5 | Massive script arrays duplicated across entries |
| Storage efficiency | 3/5 | Full localStorage serialize/parse |
| Test coverage | 2/5 | Good (668+ unit tests) |
| Resource optimization | 2/5 | 资源预算已达标，后续关注重复资源与长期压缩策略 |

## 5. Audit Gate Status
- game-manager-audit: PASS
- refactor-closure-audit: PASS
- Function hotspot limit (19 lines): PASS
- game_manager.js shell (≤80 lines): PASS (10 lines)
