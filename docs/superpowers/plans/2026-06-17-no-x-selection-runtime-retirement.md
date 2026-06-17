# NO X Selection Runtime Retirement

## Scope

- Move NO X selection overlay rendering, click handling, localized copy, and setup target resolution from `core_game_manager_restart_setup_helpers_runtime.js` into a tested TypeScript boundary.
- Keep the legacy restart/setup runtime as a compatibility shell that delegates to `CoreNoXSelectionRuntime`.
- Preserve seedless setup selection behavior while reducing restart/setup runtime closure hotspots.

## Evidence

- Added `src/core/no-x-selection-overlay.ts` with overlay rendering, target application, header sync, and setup mode config resolution.
- Added `tests/unit/core-no-x-selection-overlay.spec.ts` covering runtime installation, localized overlay rendering, click application, stale overlay cleanup, and setup NO X target resolution.
- `home-family-bootstrap` installs `CoreNoXSelectionRuntime` before legacy startup scripts load.
- `core_game_manager_restart_setup_helpers_runtime.js` now delegates `ensureNoXSelectionOverlayForManager` and `resolveSetupNoXModeConfig` to the TypeScript runtime.
- `refactor-closure-audit` hotspot count dropped from 63 to 59, removing the previous 61-line overlay hotspot and the 29-line setup NO X hotspot.

## Verification

- `npx vitest run tests/unit/core-no-x-selection-overlay.spec.ts`
- `npx vitest run tests/unit/core-no-x-selection-overlay.spec.ts tests/unit/home-family-bootstrap-ranked-session.spec.ts`
- `npm run build`
- `node scripts/refactor-closure-audit.mjs`
