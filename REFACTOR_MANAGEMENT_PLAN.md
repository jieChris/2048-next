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
  - `application/play/capped/replay` now use shared `startGame` path with local fallback

Acceptance:
- No behavior difference on game flow and mode selection.
- Smoke suite remains green.

Rollback:
- Feature flag or commit rollback to previous entry scripts.

### M3 - Pure Core Extraction
Goal:
- Move deterministic game rules out of `js/game_manager.js` into `src/core`.

Deliverables:
- Core modules for move/merge/spawn/outcome logic.
- Unit tests for pow2 and fibonacci paths.

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
2. Push `feature/core-shell` and verify GitHub smoke workflow.
3. Start M2 by extracting shared bootstrap module from `application/play/capped/replay`.
