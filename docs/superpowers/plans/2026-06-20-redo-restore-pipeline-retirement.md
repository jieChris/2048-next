# Redo Restore Pipeline Runtime Retirement

## Goal

Retire `executeRedoRestorePipeline` from the legacy undo/stats runtime hotspot list by moving redo restore orchestration into a tested TypeScript runtime boundary.

## Scope

- Add `src/core/game-manager-redo-restore-pipeline.ts`.
- Expose `CoreGameManagerRedoRestorePipelineRuntime`.
- Install the runtime from `home-family-bootstrap`.
- Delegate the legacy undo/stats helper to the TypeScript runtime when available.
- Keep a compact standalone legacy fallback.

## TDD Evidence

- Added TypeScript runtime tests for redo stack pop/normalization, undo snapshot creation, restore application, and null-normalization early return.
- Added runtime installation coverage.
- Added legacy VM delegation coverage for `executeRedoRestorePipeline` with injected operation functions.
- Red run failed with missing `game-manager-redo-restore-pipeline` module and legacy returning the local fallback instead of the runtime mock.
- Green run: `npx vitest run tests/unit/core-game-manager-redo-restore-pipeline.spec.ts tests/unit/core-game-manager-undo-stats-runtime.spec.ts`.

## Audit Evidence

- `node scripts/refactor-closure-audit.mjs` remains expected-nonzero while long-term hotspots remain.
- Runtime hotspot count decreased from 8 to 7.
- `executeRedoRestorePipeline` is no longer listed as a hotspot.
