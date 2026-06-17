# Ranked Session Setup Context Retirement

## Scope

- Move ranked session setup challenge context parsing from `core_game_manager_restart_setup_helpers_runtime.js` into a tested TypeScript boundary.
- Keep the legacy restart/setup runtime as a compatibility shell that delegates to `CoreRankedSessionSetupContextRuntime`.
- Preserve ranked-only gating, mode matching, challenge id trimming, seed normalization, token trimming, and legacy decimal seed flooring.

## Evidence

- Added `src/core/ranked-session-setup-context.ts` with ranked challenge context normalization and runtime installation.
- Added `tests/unit/core-ranked-session-setup-context.spec.ts` covering runtime installation, valid challenge context normalization, missing context mode fallback, invalid context rejection, and decimal seed flooring compatibility.
- Updated `tests/unit/core-game-manager-restart-seed.spec.ts` to inject `CoreRankedSessionSetupContextRuntime` into the legacy VM test harness.
- `home-family-bootstrap` installs `CoreRankedSessionSetupContextRuntime` before legacy startup scripts load.
- `core_game_manager_restart_setup_helpers_runtime.js` now delegates `resolveSetupRankedSessionContext` to the TypeScript runtime.
- `refactor-closure-audit` hotspot count dropped from 56 to 55, removing the previous 25-line ranked session context hotspot.

## Verification

- `npx vitest run tests/unit/core-ranked-session-setup-context.spec.ts`
- `npx vitest run tests/unit/core-ranked-session-setup-context.spec.ts tests/unit/core-game-manager-restart-seed.spec.ts tests/unit/home-family-bootstrap-ranked-session.spec.ts`
- `npm run build`
- `node scripts/refactor-closure-audit.mjs`
