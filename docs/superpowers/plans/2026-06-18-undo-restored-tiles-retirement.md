# Undo Restored Tiles Retirement

## Scope

- Move undo restored tile application out of `core_game_manager_undo_stats_helpers_runtime.js`.
- Keep the legacy undo-stats runtime as the compatibility shell that delegates to `CoreGameManagerUndoRestoredTilesRuntime`.
- Preserve grid rebuild, score restoration, restored tile normalization, bounds checks, stone flag restoration, previous-position restoration, and runtime grid writes.

## Evidence

- Added `src/core/game-manager-undo-restored-tiles.ts` with a tested runtime boundary for undo restored tile application.
- Added `tests/unit/core-game-manager-undo-restored-tiles.spec.ts` covering grid rebuild, score restore, valid tile writes, invalid tile skipping, stone flags, previous positions, and runtime installation.
- Added `tests/unit/core-game-manager-undo-stats-runtime.spec.ts` to assert JS delegation through `CoreGameManagerUndoRestoredTilesRuntime`.
- Updated `home-family-bootstrap` to install `CoreGameManagerUndoRestoredTilesRuntime` before legacy game scripts load.
- Updated `tests/unit/home-family-bootstrap-ranked-session.spec.ts` to cover the new bootstrap installation.

## Verification

- `npx vitest run tests/unit/core-game-manager-undo-restored-tiles.spec.ts tests/unit/core-game-manager-undo-stats-runtime.spec.ts tests/unit/home-family-bootstrap-ranked-session.spec.ts`
- `npm run build`
- `node scripts/refactor-closure-audit.mjs`
- `npm run verify:prepush`
