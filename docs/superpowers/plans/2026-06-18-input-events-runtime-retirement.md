# Input Events Runtime Retirement

## Scope

- Move game-manager input event binding out of `core_game_manager_session_init_helpers_runtime.js`.
- Keep the legacy session-init shell as a compatibility layer that delegates to `CoreGameManagerInputEventsRuntime`.
- Preserve move, item, restart, and keep-playing event wiring, including the prototype keep-playing fallback behavior.

## Evidence

- Added `src/core/game-manager-input-events.ts` with a tested runtime boundary for input event binding.
- Added `tests/unit/core-game-manager-input-events.spec.ts` covering move/item/restart wiring, keep-playing prototype fallback, keep-playing state fallback, and runtime installation.
- Updated `tests/unit/core-game-manager-session-init-runtime.spec.ts` to inject `CoreGameManagerInputEventsRuntime` into the legacy VM harness and assert JS delegation.
- Updated `home-family-bootstrap` to install `CoreGameManagerInputEventsRuntime` before legacy game scripts load.
- Updated `tests/unit/home-family-bootstrap-ranked-session.spec.ts` to cover the new bootstrap installation.
- `refactor-closure-audit` hotspot count dropped from 49 to 48, removing the previous `bindGameManagerInputEvents` hotspot.

## Verification

- `npx vitest run tests/unit/core-game-manager-input-events.spec.ts tests/unit/core-game-manager-session-init-runtime.spec.ts tests/unit/home-family-bootstrap-ranked-session.spec.ts`
- `npm run build`
- `node scripts/refactor-closure-audit.mjs`
- `npm run verify:prepush`
