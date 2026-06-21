# Start Timer Runtime Retirement

## Goal

Retire `startTimer` from the legacy panel/timer runtime hotspot list by moving timer start orchestration into a tested TypeScript runtime boundary.

## Scope

- Add `src/core/game-manager-timer-start.ts`.
- Expose `CoreGameManagerTimerStartRuntime`.
- Install the runtime from `home-family-bootstrap`.
- Delegate the legacy panel/timer helper to the TypeScript runtime when available.
- Keep a compact standalone legacy fallback.

## TDD Evidence

- Added TypeScript runtime tests for idle timer startup, active-timer early return, and runtime installation.
- Added legacy VM delegation coverage for `startTimer` with injected timer anchor, elapsed, visibility, interval, and move-timeout HUD operations.
- Red run failed with missing `game-manager-timer-start` module and legacy not invoking the runtime mock.
- Green run: `npx vitest run tests/unit/core-game-manager-timer-start.spec.ts tests/unit/core-game-manager-panel-timer-runtime.spec.ts`.

## Audit Evidence

- `node scripts/refactor-closure-audit.mjs` remains expected-nonzero while long-term hotspots remain.
- Runtime hotspot count decreased from 3 to 2.
- `startTimer` is no longer listed as a hotspot.
