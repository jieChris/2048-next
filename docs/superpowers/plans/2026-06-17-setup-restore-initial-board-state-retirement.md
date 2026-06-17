# Setup Restore Initial Board State Retirement

## Scope

- Move setup restore and initial board state orchestration out of `core_game_manager_restart_setup_helpers_runtime.js`.
- Keep legacy restart/setup helpers as side-effect providers for saved-state restore, ranked mirror reads, stone placement, and initial tile seeding.
- Preserve restored saved-state handling, ranked local mirror fallback, ranked checkpoint pending flags, `skipStartTiles`, `disableStateRestore`, and initial board generation order.

## Evidence

- Added `src/core/setup-restore-initial-board-state.ts` with a tested runtime boundary for restore/initial-board decisions.
- Added `tests/unit/core-setup-restore-initial-board-state.spec.ts` covering saved-state restore, ranked local mirror restore with auth, no-restore initial board generation, skip-start behavior, and runtime installation.
- Updated `tests/unit/core-game-manager-restart-seed.spec.ts` to inject `CoreSetupRestoreInitialBoardStateRuntime` into the legacy VM harness and assert JS delegation.
- `home-family-bootstrap` installs `CoreSetupRestoreInitialBoardStateRuntime` before legacy startup scripts load.
- `core_game_manager_restart_setup_helpers_runtime.js` now delegates `resolveSetupRestoreAndInitialBoardState` to the TypeScript runtime while passing legacy side-effect operations explicitly.
- `refactor-closure-audit` hotspot count dropped from 54 to 53, removing the previous 33-line setup restore/initial board hotspot.

## Verification

- `npx vitest run tests/unit/core-setup-restore-initial-board-state.spec.ts`
- `npx vitest run tests/unit/core-setup-restore-initial-board-state.spec.ts tests/unit/core-game-manager-restart-seed.spec.ts tests/unit/home-family-bootstrap-ranked-session.spec.ts`
- `npm run build`
- `node scripts/refactor-closure-audit.mjs`
