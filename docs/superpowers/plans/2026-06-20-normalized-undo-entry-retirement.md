# Normalized Undo Entry Runtime Retirement

## Goal

Retire `createNormalizedUndoStackEntry` from the legacy undo/stats runtime hotspot list by moving undo entry field normalization into a tested TypeScript runtime boundary.

## Scope

- Add `src/core/game-manager-normalized-undo-entry.ts`.
- Expose `CoreGameManagerNormalizedUndoEntryRuntime`.
- Install the runtime from `home-family-bootstrap`.
- Delegate the legacy undo/stats helper to the TypeScript runtime when available.
- Keep a compact standalone legacy fallback.

## TDD Evidence

- Added TypeScript runtime tests for score/counter fallback normalization, motion map filtering, missing fallback preservation, and runtime installation.
- Added legacy VM delegation coverage for `createNormalizedUndoStackEntry`.
- Red run failed with missing `game-manager-normalized-undo-entry` module and legacy returning the local fallback instead of the runtime mock.
- Green run: `npx vitest run tests/unit/core-game-manager-normalized-undo-entry.spec.ts tests/unit/core-game-manager-undo-stats-runtime.spec.ts`.

## Audit Evidence

- `node scripts/refactor-closure-audit.mjs` remains expected-nonzero while long-term hotspots remain.
- Runtime hotspot count decreased from 10 to 9.
- `createNormalizedUndoStackEntry` is no longer listed as a hotspot.
