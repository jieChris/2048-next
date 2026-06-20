# Setup Challenge Id Runtime Retirement

## Goal

Retire `resolveSetupChallengeId` from the legacy restart/setup runtime hotspot list by moving setup challenge id selection into the tested TypeScript setup initialization boundary.

## Scope

- Add `resolveSetupChallengeId` to `src/core/setup-state-initialization.ts`.
- Expose it through `CoreSetupStateInitializationRuntime`.
- Delegate the legacy helper in `js/core_game_manager_restart_setup_helpers_runtime.js` to the TypeScript runtime when available.
- Keep a compact standalone legacy fallback.

## TDD Evidence

- Added TypeScript runtime tests for options priority, ranked session context fallback, window challenge context fallback, null manager, and inaccessible window context.
- Added legacy VM delegation coverage for `resolveSetupChallengeId`.
- Red run failed with `resolveSetupChallengeId is not a function` and legacy returning `rch_options`.
- Green run: `npx vitest run tests/unit/core-setup-state-initialization.spec.ts tests/unit/core-game-manager-restart-seed.spec.ts`.

## Audit Evidence

- `node scripts/refactor-closure-audit.mjs` remains expected-nonzero while long-term hotspots remain.
- Runtime hotspot count decreased from 12 to 11.
- `resolveSetupChallengeId` is no longer listed as a hotspot.
