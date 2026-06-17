# Fallback Pow2 Variant Configs Retirement

## Scope

- Move fallback pow2 variant mode config construction from `core_game_manager_static_runtime.js` into a tested TypeScript boundary.
- Keep the legacy static runtime as a compatibility shell that delegates variant fallback config creation to `CoreFallbackModeConfigsRuntime`.
- Preserve diagonal, item, stone, timed, spawn50, and NO X fallback config semantics while reducing runtime closure hotspots.

## Evidence

- Added `src/core/game-manager-fallback-mode-configs.ts` with pure fallback variant config construction and runtime installation.
- Added `tests/unit/core-game-manager-fallback-mode-configs.spec.ts` covering runtime installation, config keys, unranked defaults, spawn table, and variant-specific special rules.
- `home-family-bootstrap` installs `CoreFallbackModeConfigsRuntime` before legacy startup scripts load.
- `core_game_manager_static_runtime.js` now delegates `createGameManagerFallbackPow2VariantModeConfigs` to the TypeScript runtime.
- `refactor-closure-audit` hotspot count dropped from 59 to 58, removing the previous 58-line fallback pow2 variant config hotspot.

## Verification

- `npx vitest run tests/unit/core-game-manager-fallback-mode-configs.spec.ts`
- `npx vitest run tests/unit/core-game-manager-fallback-mode-configs.spec.ts tests/unit/home-family-bootstrap-ranked-session.spec.ts`
- `npm run build`
- `node scripts/refactor-closure-audit.mjs`
