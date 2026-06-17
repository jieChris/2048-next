# Saved Manager Timer State Retirement

## Scope

- Move saved-state timer restore out of `core_game_manager_saved_state_helpers_runtime.js`.
- Keep the legacy saved-state runtime as the compatibility shell that delegates to `CoreSavedManagerTimerStateRuntime`.
- Preserve duration restoration from saved duration, active local anchors, active started-at timestamps, frozen/terminal non-resume behavior, elapsed offset restore, and server anchor restore.

## Evidence

- Added `src/core/saved-manager-timer-state.ts` with a tested runtime boundary for saved timer-state restore.
- Added `tests/unit/core-saved-manager-timer-state.spec.ts` covering active anchor restore, started-at fallback, terminal/frozen timer restore, and runtime installation.
- Updated `tests/unit/core-game-manager-saved-state-runtime.spec.ts` to inject `CoreSavedManagerTimerStateRuntime` into the legacy VM harness and assert JS delegation.
- Updated `home-family-bootstrap` to install `CoreSavedManagerTimerStateRuntime` before legacy game scripts load.
- Updated `tests/unit/home-family-bootstrap-ranked-session.spec.ts` to cover the new bootstrap installation.
- `refactor-closure-audit` hotspot count dropped from 48 to 47, removing the previous `applySavedManagerTimerState` hotspot.

## Verification

- `npx vitest run tests/unit/core-saved-manager-timer-state.spec.ts tests/unit/core-game-manager-saved-state-runtime.spec.ts tests/unit/home-family-bootstrap-ranked-session.spec.ts`
- `npm run build`
- `node scripts/refactor-closure-audit.mjs`
- `npm run verify:prepush`
