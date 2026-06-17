# Game Manager Mode Rules Runtime Retirement

## Scope

- Move special-rules manager state application into the tested TypeScript runtime boundary.
- Keep the legacy `core_game_manager_mode_rules_helpers_runtime.js` path as a compatibility shell.
- Preserve existing game manager setup behavior while reducing closure-audit runtime hotspots.

## Evidence

- `CoreSpecialRulesRuntime` now exposes:
  - `computeSpecialRulesState`
  - `applySpecialRulesStateSnapshot`
  - `applySpecialRulesStateFallback`
- `js/core_game_manager_mode_rules_helpers_runtime.js` delegates special-rules snapshot/fallback application to that runtime before using legacy fallback logic.
- `mode_rules` closure hotspots are reduced from 2 to 0.

## Verification

- `npx vitest run tests/unit/core-special-rules.spec.ts`
- `npx vitest run tests/unit/core-special-rules.spec.ts tests/unit/core-mode.spec.ts tests/unit/bootstrap-practice-mode.spec.ts tests/unit/bootstrap-play-header.spec.ts`
- `npm run build`
- `npm run audit:game-manager`
- `node scripts/refactor-closure-audit.mjs`
