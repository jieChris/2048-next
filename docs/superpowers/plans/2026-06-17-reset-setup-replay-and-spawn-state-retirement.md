# Reset Setup Replay And Spawn State Retirement

## Scope

- Move setup replay/spawn cleanup out of `core_game_manager_restart_setup_helpers_runtime.js`.
- Keep legacy restart/setup helpers as the compatibility shell and inject the optional `assignManagerClientRecordId` dependency.
- Preserve replay history clearing, ranked checkpoint flag resets, session submission reset, spawn reset, and client record id fallback behavior.

## Evidence

- Added `src/core/reset-setup-replay-and-spawn-state.ts` with a tested runtime boundary for setup cleanup state.
- Added `tests/unit/core-reset-setup-replay-and-spawn-state.spec.ts` covering all reset fields, client record id assignment, fallback client id clearing, and runtime installation.
- Updated `tests/unit/core-game-manager-restart-seed.spec.ts` to inject `CoreResetSetupReplayAndSpawnStateRuntime` into the legacy VM harness and assert JS delegation.
- `home-family-bootstrap` installs `CoreResetSetupReplayAndSpawnStateRuntime` before legacy startup scripts load.
- `core_game_manager_restart_setup_helpers_runtime.js` now delegates `resetSetupReplayAndSpawnState` to the TypeScript runtime.
- `refactor-closure-audit` hotspot count dropped from 52 to 51, removing the previous 24-line setup replay/spawn reset hotspot.

## Verification

- `npx vitest run tests/unit/core-reset-setup-replay-and-spawn-state.spec.ts`
- `npx vitest run tests/unit/core-reset-setup-replay-and-spawn-state.spec.ts tests/unit/core-game-manager-restart-seed.spec.ts tests/unit/home-family-bootstrap-ranked-session.spec.ts`
- `npm run build`
- `node scripts/refactor-closure-audit.mjs`
