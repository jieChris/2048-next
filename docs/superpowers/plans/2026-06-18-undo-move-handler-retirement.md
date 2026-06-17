# Undo Move Handler Retirement

## Scope

- Move undo/redo move orchestration out of `core_game_manager_undo_stats_helpers_runtime.js`.
- Keep the legacy undo-stats runtime as the compatibility shell that delegates to `CoreGameManagerUndoMoveHandlerRuntime`.
- Preserve invalid direction handling, redo availability checks, undo availability checks, redo/undo restore pipeline ordering, pre-undo redo snapshot creation, actuator updates, and timer restart decisions.

## Evidence

- Added `src/core/game-manager-undo-move-handler.ts` with a tested runtime boundary for undo/redo move handling.
- Added `tests/unit/core-game-manager-undo-move-handler.spec.ts` covering redo orchestration, undo orchestration, timer restart, and runtime installation.
- Updated `tests/unit/core-game-manager-undo-stats-runtime.spec.ts` to assert JS delegation through `CoreGameManagerUndoMoveHandlerRuntime`.
- Updated `home-family-bootstrap` to install `CoreGameManagerUndoMoveHandlerRuntime` before legacy game scripts load.
- Updated `tests/unit/home-family-bootstrap-ranked-session.spec.ts` to cover the new bootstrap installation.

## Verification

- `npx vitest run tests/unit/core-game-manager-undo-move-handler.spec.ts tests/unit/core-game-manager-undo-stats-runtime.spec.ts tests/unit/home-family-bootstrap-ranked-session.spec.ts`
- `npm run build`
- `node scripts/refactor-closure-audit.mjs`
- `npm run verify:prepush`
