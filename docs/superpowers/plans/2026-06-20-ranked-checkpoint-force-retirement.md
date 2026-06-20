# Ranked Checkpoint Force Restore Runtime Retirement

## Goal

Retire `shouldForceRankedCheckpointRestoreInSetup` from the legacy restart/setup runtime hotspot list by moving the ranked checkpoint force-query decision into the tested TypeScript setup restore boundary.

## Scope

- Add `shouldForceRankedCheckpointRestoreInSetup` to `src/core/setup-restore-initial-board-state.ts`.
- Expose it through `CoreSetupRestoreInitialBoardStateRuntime`.
- Delegate the legacy `js/core_game_manager_restart_setup_helpers_runtime.js` helper to the TypeScript runtime when available.
- Keep a compact legacy fallback for standalone execution.

## TDD Evidence

- Added TypeScript runtime tests for `force_ranked_checkpoint=1`, `restore_ranked_checkpoint=1`, non-ranked setup, null manager, and inaccessible location.
- Added legacy VM delegation coverage for `shouldForceRankedCheckpointRestoreInSetup`.
- Red run failed with `shouldForceRankedCheckpointRestoreInSetup is not a function` and legacy fallback returning `false`.
- Green run: `npx vitest run tests/unit/core-setup-restore-initial-board-state.spec.ts tests/unit/core-game-manager-restart-seed.spec.ts`.

## Audit Evidence

- `node scripts/refactor-closure-audit.mjs` remains expected-nonzero while long-term hotspots remain.
- Runtime hotspot count decreased from 14 to 13.
- `shouldForceRankedCheckpointRestoreInSetup` is no longer listed as a hotspot.
