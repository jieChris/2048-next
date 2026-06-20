# Restart Confirm Language Runtime Retirement

## Goal

Retire `resolveRestartConfirmLanguage` from the legacy restart/setup runtime hotspot list by moving restart confirmation language resolution into the tested TypeScript restart boundary.

## Scope

- Add `resolveRestartConfirmLanguage` to `src/core/restart-game.ts`.
- Expose it through `CoreRestartGameRuntime`.
- Delegate the legacy helper in `js/core_game_manager_restart_setup_helpers_runtime.js` to the TypeScript runtime when available.
- Keep a compact standalone legacy fallback for non-bundled execution.

## TDD Evidence

- Added TypeScript runtime tests for i18n priority, storage fallback, default Chinese behavior, and exception handling.
- Added legacy VM delegation coverage for `resolveRestartConfirmLanguage`.
- Red run failed with `resolveRestartConfirmLanguage is not a function` and legacy returning fallback `zh`.
- Green run: `npx vitest run tests/unit/core-restart-game.spec.ts tests/unit/core-game-manager-restart-seed.spec.ts`.

## Audit Evidence

- `node scripts/refactor-closure-audit.mjs` remains expected-nonzero while long-term hotspots remain.
- Runtime hotspot count decreased from 13 to 12.
- `resolveRestartConfirmLanguage` is no longer listed as a hotspot.
