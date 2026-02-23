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
  - Wired non-invasive game-manager adapter hook to publish move-result metadata on successful move/undo paths and sync adapter snapshot metadata via bridge IO contracts
  - Smoke suite now validates adapter IO contract end-to-end (bridge methods + move-result event dispatch + snapshot sync)
  - Added typed shadow parity projection helpers in `src/bridge/adapter-shadow.ts` and runtime mirror `js/core_adapter_shadow_runtime.js`
  - `LegacyAdapterRuntime` now attaches move-result shadow listener in `core-adapter` mode and exposes parity-state reads on bridge payload
  - Smoke suite now includes a `core-adapter` toggle scenario to verify shadow parity counters advance on published move-result events
  - Added session-level parity report projection (`score/undo/win/over` counters + score alignment) via `buildAdapterSessionParityReport` in `src/bridge/adapter-shadow.ts` and runtime mirror
  - Bridge payload now exposes `readAdapterParityReport` and keeps `adapterParityReport` synchronized after move-result publish and shadow updates
  - Smoke suite now validates parity-report contract in both default adapter contract checks and `core-adapter` toggle path
  - Session submit payload now carries `adapter_parity_report_v1` diagnostics for cutover auditing without changing scoring/submission behavior
  - Added A/B parity diff summary projection (`legacy-bridge` vs `core-adapter`) via `buildAdapterParityABDiffSummary` in `src/bridge/adapter-shadow.ts` and runtime mirror
  - Bridge payload now exposes `readAdapterParityABDiff`, persists per-mode parity reports to storage, and keeps `adapterParityABDiff` synchronized during runtime updates
  - Session submit payload now carries `adapter_parity_ab_diff_v1` diagnostics, and smoke validates A/B diff contract in `core-adapter` scenarios
  - `LocalHistoryStore.normalizeRecord` now preserves `adapter_parity_report_v1` and `adapter_parity_ab_diff_v1` diagnostics in persisted local history records
  - `history.html` now renders adapter diagnostics summary lines (session parity + A/B diff deltas) per history item for QA visibility
  - Smoke suite now validates history-page diagnostics rendering from persisted local records
  - Unified `local_history_store.js` cache-busting version across all gameplay/history/replay pages to avoid stale diagnostics serialization in browser cache
  - History page now exposes triage aids: A/B status badge (`一致/不一致/样本不足`), quick diagnosis filter, and one-click mismatch export flow for QA escalation
  - `LocalHistoryStore.listRecords` now supports `adapter_parity_filter` and shared `getAdapterParityStatus` classification for stable filtering/export behavior
  - Adapter resolver now supports controlled default cutover (`engine_adapter_default`) with explicit rollback switch (`engine_adapter_force_legacy`) across query/storage/global policy inputs
  - Smoke suite now validates default-core cutover and forced-legacy rollback behavior end-to-end on gameplay pages
  - Added history burn-in panel with rolling window stats (`50/100/200/500/all`) and gating projection (`可比较样本` + `不一致率`) for cutover readiness
  - `LocalHistoryStore` now exposes `getAdapterParityBurnInSummary` so QA can consistently read mismatch-rate gates from persisted local sessions
  - Burn-in panel now provides one-click “仅看不一致” shortcut to jump from gate view to actionable mismatch records
  - Added canary policy control panel on `history.html` with one-click actions for “默认 core canary / 强制 legacy 回滚 / 解除回滚 / 重置基线” and visible policy-source diagnostics
  - `LegacyAdapterRuntime` now exposes `resolveAdapterModePolicy` plus storage policy mutators (`setStoredAdapterDefaultMode` / `setStoredForceLegacy`), enabling reproducible cutover operations without touching gameplay code
  - Smoke suite now validates canary policy panel behavior end-to-end (policy writes, effective-mode source transitions, and storage-key reset)

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
3. Execute M5 burn-in checklist in canary flow: set `engine_adapter_default_mode=core-adapter`, monitor history burn-in gate for sustained pass window, and keep `engine_adapter_force_legacy=1` as emergency rollback switch.
