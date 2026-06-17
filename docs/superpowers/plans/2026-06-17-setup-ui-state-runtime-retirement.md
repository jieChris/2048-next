# Setup UI State Runtime Retirement

## Scope

- Move setup UI/stat finalization from `core_game_manager_restart_setup_helpers_runtime.js` into a tested TypeScript boundary.
- Keep the legacy restart/setup runtime as a compatibility shell that delegates to `CoreSetupUiStateRuntime`.
- Preserve spawn-rate refresh, undo UI sync, timer module view application, restored timer refresh, item/timed HUD updates, stats panel updates, and NO X overlay sync.

## Evidence

- Added `src/core/setup-ui-state.ts` with setup UI/stat finalization and runtime installation.
- Added `tests/unit/core-setup-ui-state.spec.ts` covering runtime installation, normal setup stats reset, saved-state restore timer handling, and setup UI synchronization.
- `home-family-bootstrap` installs `CoreSetupUiStateRuntime` before legacy startup scripts load.
- `core_game_manager_restart_setup_helpers_runtime.js` now delegates `finalizeSetupUiAndStatsState` to the TypeScript runtime.
- `refactor-closure-audit` hotspot count dropped from 58 to 57, removing the previous 37-line setup UI/stat finalization hotspot.

## Verification

- `npx vitest run tests/unit/core-setup-ui-state.spec.ts`
- `npx vitest run tests/unit/core-setup-ui-state.spec.ts tests/unit/home-family-bootstrap-ranked-session.spec.ts`
- `npm run build`
- `node scripts/refactor-closure-audit.mjs`
