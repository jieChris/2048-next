# 2048-next Refactor Management Plan

## 1) Scope and Non-Goals
- Scope: keep legacy behavior stable while progressively extracting a typed, testable core engine.
- Non-goal: visual redesign or gameplay-rule change during refactor phases M1-M4.

## 2) Branch and Release Strategy
- Long-running branch: `feature/core-shell`
- Legacy maintenance: `legacy-maintenance` (hotfix-only)
- Merge policy: each milestone merges only after smoke acceptance passes.
- Release tags:
  - `baseline-legacy-import` (already exists)
  - milestone tags: `refactor-m1`, `refactor-m2`, ...

## 3) Milestones

### M1 - Baseline and Guardrails (current)
Goal:
- Establish automated smoke guardrails for all legacy entry pages.

Deliverables:
- Playwright smoke suite for 8 pages.
- CI workflow to run smoke tests on push/PR.
- Standard local scripts (`npm run test:smoke`).

Acceptance:
- All 8 pages load without runtime JS error.
- Expected boot contract is stable:
  - gameplay pages expose `window.game_manager`
  - gameplay pages expose `window.__legacyEngine`
- CI smoke job green.

Rollback:
- Revert only test/CI commits (no runtime impact).

### M2 - Bootstrap Consolidation (in progress)
Goal:
- Deduplicate startup logic across entry scripts.

Deliverables:
- `src/bootstrap/*` for mode parsing and startup wiring.
- Thin legacy entry files that call shared bootstrap.
- Current progress:
  - Added shared runtime bootstrap entry: `js/legacy_bootstrap_runtime.js`
  - `application/play/capped/replay` now use shared `LegacyBootstrapRuntime.startGame` as single startup path

Acceptance:
- No behavior difference on game flow and mode selection.
- Smoke suite remains green.

Rollback:
- Feature flag or commit rollback to previous entry scripts.

### M3 - Pure Core Extraction (in progress)
Goal:
- Move deterministic game rules out of `js/game_manager.js` into `src/core`.

Deliverables:
- Core modules for move/merge/spawn/outcome logic.
- Unit tests for pow2 and fibonacci paths.
- Current progress:
  - Extracted pure rules helpers to `src/core/rules.ts`
  - Added unit tests in `tests/unit/core-rules.spec.ts`
  - Added browser runtime adapter `js/core_rules_runtime.js` and wired `js/game_manager.js` to delegate spawn/merge/timer rules
  - Added `src/core/mode.ts` and `js/core_mode_runtime.js` to delegate mode-config normalization from `js/game_manager.js`
  - Added `src/core/special-rules.ts` and `js/core_special_rules_runtime.js` to delegate special-rule state projection
  - Added `src/core/direction-lock.ts` and `js/core_direction_lock_runtime.js` to delegate deterministic direction-lock state computation
  - Added `src/core/grid-scan.ts` and `js/core_grid_scan_runtime.js` to delegate available-cell scanning with blocked-cell awareness
  - Added `src/core/move-scan.ts` and `js/core_move_scan_runtime.js` to delegate tile-match scan and move-availability checks
  - Added `src/core/move-path.ts` and `js/core_move_path_runtime.js` to delegate traversal ordering and farthest-position scanning
  - Added `src/core/scoring.ts` and `js/core_scoring_runtime.js` to delegate post-move score/combo settlement
  - Added `src/core/merge-effects.ts` and `js/core_merge_effects_runtime.js` to delegate post-merge won/capped/32k effect decisions
  - Added `src/core/post-move.ts` and `js/core_post_move_runtime.js` to delegate post-move lifecycle transitions (`successfulMoveCount/over/endTime/startTimer` decisions)
  - Added `src/core/move-apply.ts` and `js/core_move_apply_runtime.js` to delegate per-tile merge-vs-move decision and target selection
  - Added `src/core/post-move-record.ts` and `js/core_post_move_record_runtime.js` to delegate post-move replay/history write decisions
  - Added `src/core/post-undo-record.ts` and `js/core_post_undo_record_runtime.js` to delegate undo replay/history write decisions
  - Added `src/core/undo-restore.ts` and `js/core_undo_restore_runtime.js` to delegate undo snapshot-restore normalization (combo/move counters, direction-lock state, timer resume decision)
  - Added `src/core/undo-snapshot.ts` and `js/core_undo_snapshot_runtime.js` to delegate undo snapshot creation/normalization at move start
  - Added `src/core/undo-tile-snapshot.ts` and `js/core_undo_tile_snapshot_runtime.js` to delegate undo tile serialization (`tile.save` equivalent) before move/merge apply
  - Added `src/core/undo-tile-restore.ts` and `js/core_undo_tile_restore_runtime.js` to delegate undo tile hydration payload mapping during snapshot restore
  - Added `src/core/undo-restore-payload.ts` and `js/core_undo_restore_payload_runtime.js` to delegate restore payload normalization (`score` + `tiles` list) before undo hydration
  - Added `src/core/undo-stack-entry.ts` and `js/core_undo_stack_entry_runtime.js` to delegate undo stack entry normalization on both push and pop paths
  - Added `src/core/replay-codec.ts` and `js/core_replay_codec_runtime.js` to delegate replay char/board codec (`encodeReplay128/decodeReplay128/encodeBoardV4/decodeBoardV4`)
  - Added `src/core/replay-v4-actions.ts` and `js/core_replay_v4_actions_runtime.js` to delegate `REPLAY_v4C` action-stream decode (move/undo/practice escapes)
  - Added `src/core/replay-legacy.ts` and `js/core_replay_legacy_runtime.js` to delegate legacy replay (`REPLAY_v1/v2/v2S`) parser/import decode path
  - Added `src/core/replay-import.ts` and `js/core_replay_import_runtime.js` to delegate replay import envelope parsing (`JSON v3`/`REPLAY_v4C`) and mode-code mapping
  - Added `src/core/replay-execution.ts` and `js/core_replay_execution_runtime.js` to delegate replay action kind-routing and execution payload projection (`move/undo/practice`)
  - Added `src/core/replay-dispatch.ts` and `js/core_replay_dispatch_runtime.js` to delegate replay execution dispatch planning (`move` / `insertCustomTile` side-effect contract) after action resolution
  - Added `src/core/replay-lifecycle.ts` and `js/core_replay_lifecycle_runtime.js` to delegate replay lifecycle helpers (`seek` target clamp and per-step forced-spawn injection planning)
  - Added `src/core/replay-timer.ts` and `js/core_replay_timer_runtime.js` to delegate replay timer state transitions (`pause/resume/setSpeed`) and tick-stop decision
  - Added `src/core/replay-flow.ts` and `js/core_replay_flow_runtime.js` to delegate replay flow helpers (tick-end state and seek rewind strategy)
  - Extended `src/core/replay-flow.ts` and `js/core_replay_flow_runtime.js` with seek-rewind restart planning (`board/seed/none` restart contract + replay-index apply contract) to reduce `seek` branch logic in `js/game_manager.js`
  - Added `src/core/replay-control.ts` and `js/core_replay_control_runtime.js` to delegate replay tick-boundary control planning (`shouldStopAtTick` + end-state application contract for pause/replayMode)
  - Added `src/core/replay-loop.ts` and `js/core_replay_loop_runtime.js` to delegate replay step-loop orchestration (current-action projection + forced-spawn injection decision + replay-index advance plan) shared by `resume` and `seek`

Acceptance:
- Same board transition and score outputs for golden test vectors.
- Smoke suite green.

Rollback:
- Keep legacy path callable until parity proven.

### M4 - Adapter Replacement
Goal:
- Route runtime through typed core via adapter, keep legacy UI and storage.

Deliverables:
- Adapter mapping input, actuator, persistence to new engine.
- Runtime toggle for A/B validation.
- Current progress:
  - Added adapter mode resolver helpers in `src/bridge/adapter-mode.ts` and runtime mirror `js/legacy_adapter_runtime.js`
  - `js/legacy_bootstrap_runtime.js` now routes bridge attachment through `LegacyAdapterRuntime.attachLegacyBridgeWithAdapter` when available
  - Bridge payload now carries `adapterMode` metadata and preserves existing startup behavior (`legacy-bridge` default)
  - Fixed bootstrap bridge-attach argument order so `__legacyEngine.manager` correctly binds to `window.game_manager`
  - Added adapter IO boundary helpers in `src/bridge/adapter-io.ts` and runtime mirror `js/legacy_adapter_io_runtime.js` for snapshot read/write and move-result event emission contracts
  - Legacy adapter payload now exposes adapter IO methods (`syncAdapterSnapshot` / `emitMoveResult`) and reads initial adapter snapshot metadata

Acceptance:
- Session-level parity on key metrics (score, win/lose state, tile cap behavior).
- Smoke suite green.

Rollback:
- Toggle back to legacy execution path.

### M5 - Cutover and Cleanup
Goal:
- Default to new core and remove duplicated legacy bootstrap code.

Deliverables:
- Dead-code cleanup and docs update.
- Stable release tag after burn-in.

Acceptance:
- No P0 regressions during burn-in window.

Rollback:
- Re-enable legacy adapter path by release tag rollback.

## 4) Risk Register
- R1: behavior drift while splitting `game_manager`.
  - Mitigation: golden vectors + smoke baseline first.
- R2: JS/TS dual implementation drift.
  - Mitigation: keep runtime bridge thin and generated/verified from one source later.
- R3: multi-page startup divergence.
  - Mitigation: M2 consolidation and contract checks in smoke tests.

## 5) Quality Gates per PR
- Gate 1: smoke tests pass.
- Gate 2: no unplanned gameplay rule changes.
- Gate 3: rollback path is explicit in PR notes.

## 6) Immediate Next Steps
1. Run `npm run test:smoke` locally and fix any failing page contract.
2. Run `npm run test:unit` and keep the core extraction baseline stable (`rules/mode/special-rules/direction-lock/grid-scan/move-scan/move-path/scoring/merge-effects/post-move/move-apply/post-move-record/post-undo-record/undo-restore/undo-snapshot/undo-tile-snapshot/undo-tile-restore/undo-restore-payload/undo-stack-entry/replay-codec/replay-v4-actions/replay-legacy/replay-import/replay-execution/replay-dispatch/replay-lifecycle/replay-timer/replay-flow/replay-control/replay-loop`).
3. Continue M4 by wiring adapter IO contracts into a non-invasive game-manager side hook (publish move-result metadata without changing gameplay flow), then validate parity via smoke and unit baselines.
