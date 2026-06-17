# Single Mode Page Lock Runtime Retirement

## Scope

- Move single-mode page lock ownership from `core_game_manager_restart_setup_helpers_runtime.js` into a tested TypeScript boundary.
- Keep the legacy restart/setup runtime as a compatibility shell that delegates to `CoreSingleModePageLockRuntime`.
- Preserve page duplicate protection while reducing runtime closure hotspots.

## Evidence

- Added `src/core/single-mode-page-lock.ts` with lock acquisition, conflict detection, heartbeat state, and release behavior.
- `home-family-bootstrap` installs `CoreSingleModePageLockRuntime` before legacy startup scripts load.
- `core_game_manager_restart_setup_helpers_runtime.js` delegates `ensureSingleModePageLock`, `releaseSingleModePageLock`, and lock-state release to the TypeScript runtime.
- `refactor-closure-audit` hotspot count dropped from 65 to 63, removing the previous 121-line `ensureSingleModePageLock` and 27-line release-state hotspot.

## Verification

- `npx vitest run tests/unit/core-single-mode-page-lock.spec.ts`
- `npx vitest run tests/unit/core-single-mode-page-lock.spec.ts tests/unit/home-family-bootstrap-ranked-session.spec.ts`
- `npm run build`
- `node scripts/refactor-closure-audit.mjs`
- `node scripts/page-legacy-runtime-boundary-audit.mjs`
- `node scripts/service-boundary-audit.mjs`
- `node scripts/legacy-boundary-audit.mjs`
