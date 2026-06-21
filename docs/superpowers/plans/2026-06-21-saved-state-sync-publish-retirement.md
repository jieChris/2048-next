# Saved State Sync Publish Runtime Retirement

## Goal

Retire `publishSavedStateSyncSnapshot` from the legacy panel/timer runtime hotspot list by moving saved-state sync publish orchestration into a tested TypeScript runtime boundary.

## Scope

- Add `src/core/saved-state-sync-publish.ts`.
- Expose `CoreSavedStateSyncPublishRuntime`.
- Install the runtime from `home-family-bootstrap`.
- Delegate the legacy panel/timer helper to the TypeScript runtime when available.
- Keep a compact standalone legacy fallback.

## TDD Evidence

- Added TypeScript runtime tests for successful publish, replay-mode early return, failed-write metadata handling, and runtime installation.
- Added legacy VM delegation coverage for `publishSavedStateSyncSnapshot` with injected storage, throttle, payload, write, and known-savedAt operations.
- Red run failed with missing `saved-state-sync-publish` module and legacy not invoking the runtime mock.
- Green run: `npx vitest run tests/unit/core-saved-state-sync-publish.spec.ts tests/unit/core-game-manager-panel-timer-runtime.spec.ts`.

## Audit Evidence

- `node scripts/refactor-closure-audit.mjs` remains expected-nonzero while `setupGame` remains.
- Runtime hotspot count decreased from 2 to 1.
- `publishSavedStateSyncSnapshot` is no longer listed as a hotspot.
