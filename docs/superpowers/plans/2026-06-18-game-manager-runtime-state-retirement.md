# Game Manager Runtime State Retirement

## Scope

- Move game-manager runtime default state initialization out of `core_game_manager_session_init_helpers_runtime.js`.
- Keep the legacy session-init runtime as the compatibility shell that delegates to `CoreGameManagerRuntimeStateRuntime`.
- Preserve default mode detection, spawn defaults, timer defaults, move-input state, item inventory initialization, ranked checkpoint flags, practice/no-X defaults, and single-mode page lock state reset.

## Evidence

- Added `src/core/game-manager-runtime-state.ts` with a tested runtime boundary for game-manager runtime state initialization.
- Added `tests/unit/core-game-manager-runtime-state.spec.ts` covering default initialization and runtime installation.
- Updated `tests/unit/core-game-manager-session-init-runtime.spec.ts` to assert JS delegation through `CoreGameManagerRuntimeStateRuntime`.
- Updated `home-family-bootstrap` to install `CoreGameManagerRuntimeStateRuntime` before legacy game scripts load.
- Updated `tests/unit/home-family-bootstrap-ranked-session.spec.ts` to cover the new bootstrap installation.

## Verification

- `npx vitest run tests/unit/core-game-manager-runtime-state.spec.ts tests/unit/core-game-manager-session-init-runtime.spec.ts tests/unit/home-family-bootstrap-ranked-session.spec.ts`
- `npm run build`
- `node scripts/refactor-closure-audit.mjs`
- `npm run verify:prepush`
