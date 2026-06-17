# Setup State Initialization Retirement

## Scope

- Move setup state initialization orchestration out of `core_game_manager_restart_setup_helpers_runtime.js`.
- Keep legacy helpers as side-effect operations for seed setup, runtime reset, challenge/token resolution, replay/timer/stats setup, restore/initial-board setup, replay V1 sync, and UI finalization.
- Preserve operation order, setup option normalization, challenge/token assignment, restore-state propagation into UI finalization, and ranked checkpoint scheduling with swallowed scheduling errors.

## Evidence

- Added `src/core/setup-state-initialization.ts` with a tested runtime boundary for setup orchestration.
- Added `tests/unit/core-setup-state-initialization.spec.ts` covering legacy operation order, invalid setup options normalization, checkpoint scheduling, scheduling error swallowing, and runtime installation.
- Updated `tests/unit/core-game-manager-restart-seed.spec.ts` to inject `CoreSetupStateInitializationRuntime` into the legacy VM harness and assert JS delegation.
- `home-family-bootstrap` installs `CoreSetupStateInitializationRuntime` before legacy startup scripts load.
- `core_game_manager_restart_setup_helpers_runtime.js` now delegates `runSetupStateInitialization` to the TypeScript runtime through explicit operations.
- `refactor-closure-audit` hotspot count dropped from 53 to 52, removing the previous 32-line setup state initialization hotspot.

## Verification

- `npx vitest run tests/unit/core-setup-state-initialization.spec.ts`
- `npx vitest run tests/unit/core-setup-state-initialization.spec.ts tests/unit/core-game-manager-restart-seed.spec.ts tests/unit/home-family-bootstrap-ranked-session.spec.ts`
- `npm run build`
- `node scripts/refactor-closure-audit.mjs`
