# Actuate Persistence Runtime Retirement

## Goal

Retire `finalizeActuatePersistence` from the legacy stats display runtime hotspot list by moving actuate persistence finalization into a tested TypeScript runtime boundary.

## Scope

- Add `src/core/game-manager-actuate-persistence.ts`.
- Expose `CoreGameManagerActuatePersistenceRuntime`.
- Install the runtime from `home-family-bootstrap`.
- Delegate the legacy stats display helper to the TypeScript runtime when available.
- Keep a compact standalone legacy fallback.

## TDD Evidence

- Added TypeScript runtime tests for active save persistence, terminal saved-state clearing and auto-submit, skip-once behavior, and runtime installation.
- Added legacy VM delegation coverage for `finalizeActuatePersistence` with injected operation functions.
- Red run failed with missing `game-manager-actuate-persistence` module and legacy not invoking the runtime mock.
- Green run: `npx vitest run tests/unit/core-game-manager-actuate-persistence.spec.ts tests/unit/core-game-manager-stats-display-runtime.spec.ts`.

## Audit Evidence

- `node scripts/refactor-closure-audit.mjs` remains expected-nonzero while long-term hotspots remain.
- Runtime hotspot count decreased from 9 to 8.
- `finalizeActuatePersistence` is no longer listed as a hotspot.
