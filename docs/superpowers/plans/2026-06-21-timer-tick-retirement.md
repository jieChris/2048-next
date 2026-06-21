# Timer Tick Runtime Retirement

## Goal

Retire `executeTimerTick` from the legacy panel/timer runtime hotspot list by moving timer tick orchestration into a tested TypeScript runtime boundary.

## Scope

- Add `src/core/game-manager-timer-tick.ts`.
- Expose `CoreGameManagerTimerTickRuntime`.
- Install the runtime from `home-family-bootstrap`.
- Delegate the legacy panel/timer helper to the TypeScript runtime when available.
- Keep a compact standalone legacy fallback.

## TDD Evidence

- Added TypeScript runtime tests for timer text updates, IPS refresh, stats-panel throttling integration, move-timeout early return, and runtime installation.
- Added legacy VM delegation coverage for `executeTimerTick` with injected operation functions and deterministic `nowMs`.
- Red run failed with missing `game-manager-timer-tick` module and legacy not invoking the runtime mock.
- Green run: `npx vitest run tests/unit/core-game-manager-timer-tick.spec.ts tests/unit/core-game-manager-panel-timer-runtime.spec.ts`.

## Audit Evidence

- `node scripts/refactor-closure-audit.mjs` remains expected-nonzero while long-term hotspots remain.
- Runtime hotspot count decreased from 5 to 4.
- `executeTimerTick` is no longer listed as a hotspot.
