# Setup Game Runtime Retirement

## Goal

Retire `setupGame` from the legacy restart/setup runtime hotspot list by moving setup orchestration into a tested TypeScript runtime boundary.

## Scope

- Add `src/core/setup-game.ts`.
- Expose `CoreSetupGameRuntime`.
- Install the runtime from `home-family-bootstrap`.
- Delegate the legacy restart/setup helper to the TypeScript runtime when available.
- Keep a compact standalone legacy fallback.

## TDD Evidence

- Added TypeScript runtime tests for fresh setup orchestration, duplicate single-page lock early return, and runtime installation.
- Added legacy VM delegation coverage for `setupGame` with injected mode config, lock, grid, and setup state initialization operations.
- Red run failed with missing `setup-game` module and legacy invoking the old direct setup path.
- Green run: `npx vitest run tests/unit/core-setup-game.spec.ts tests/unit/core-game-manager-restart-seed.spec.ts`.

## Audit Evidence

- `node scripts/refactor-closure-audit.mjs` now passes.
- Runtime hotspot count decreased from 1 to 0.
- `setupGame` is no longer listed as a hotspot.
