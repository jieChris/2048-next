# Restart Game Retirement

## Scope

- Move restart-game orchestration out of `core_game_manager_restart_setup_helpers_runtime.js`.
- Keep the legacy restart/setup runtime as a compatibility shell that delegates to `CoreRestartGameRuntime`.
- Preserve confirmation gating, transient undo/redo clearing, saved-state clearing, normal setup restart, practice restart-board restore, practice board clearing before the first move, and `isTestMode` updates.

## Evidence

- Added `src/core/restart-game.ts` with restart orchestration and runtime installation.
- Added `tests/unit/core-restart-game.spec.ts` covering denied confirmation, normal restart, practice restart-board clearing, practice restart-board restore, and runtime installation.
- Updated `tests/unit/core-game-manager-restart-seed.spec.ts` to inject `CoreRestartGameRuntime` into the legacy VM harness and assert JS delegation.
- `home-family-bootstrap` installs `CoreRestartGameRuntime` before legacy startup scripts load.
- `core_game_manager_restart_setup_helpers_runtime.js` now delegates `restartGame` to the TypeScript runtime through explicit operations.
- `refactor-closure-audit` hotspot count dropped from 51 to 50, removing the previous restart-game hotspot.

## Verification

- `npx vitest run tests/unit/core-restart-game.spec.ts`
- `npx vitest run tests/unit/core-restart-game.spec.ts tests/unit/core-game-manager-restart-seed.spec.ts tests/unit/home-family-bootstrap-ranked-session.spec.ts`
- `npm run build`
- `node scripts/refactor-closure-audit.mjs`
- `npm run verify:prepush`
