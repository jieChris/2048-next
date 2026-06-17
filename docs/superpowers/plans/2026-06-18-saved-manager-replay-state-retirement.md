# Saved Manager Replay State Retirement

## Scope

- Move saved replay restore out of `core_game_manager_saved_state_helpers_runtime.js`.
- Keep the legacy saved-state runtime as the compatibility shell that delegates to `CoreSavedManagerReplayStateRuntime`.
- Preserve move history restore, IPS counters, undo/redo restore policy, compact replay logs, rescue replay strings, session replay v1/v3 restore, and spawn value counters.

## Evidence

- Added `src/core/saved-manager-replay-state.ts` with a tested runtime boundary for saved replay-state restore.
- Added `tests/unit/core-saved-manager-replay-state.spec.ts` covering full replay restore, lite payload preservation, undo-stack clearing, spawn counters, and runtime installation.
- Updated `tests/unit/core-game-manager-saved-state-runtime.spec.ts` to inject `CoreSavedManagerReplayStateRuntime` into the legacy VM harness and assert JS delegation.
- Updated `home-family-bootstrap` to install `CoreSavedManagerReplayStateRuntime` before legacy game scripts load.
- Updated `tests/unit/home-family-bootstrap-ranked-session.spec.ts` to cover the new bootstrap installation.

## Verification

- `npx vitest run tests/unit/core-saved-manager-replay-state.spec.ts tests/unit/core-game-manager-saved-state-runtime.spec.ts tests/unit/home-family-bootstrap-ranked-session.spec.ts`
- `npm run build`
- `node scripts/refactor-closure-audit.mjs`
- `npm run verify:prepush`
