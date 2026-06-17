# Ranked Checkpoint Local Mirror Setup Retirement

## Scope

- Move ranked checkpoint local mirror setup reads from `core_game_manager_restart_setup_helpers_runtime.js` into a tested TypeScript boundary.
- Keep the legacy restart/setup runtime as a compatibility shell that delegates to `CoreRankedCheckpointLocalMirrorSetupRuntime`.
- Preserve ranked-only gating, mode key selection, owner user validation, and saved-state mode validation.

## Evidence

- Added `src/core/ranked-checkpoint-local-mirror-setup.ts` with local mirror presence checks, saved-state extraction, owner matching, mode matching, and runtime installation.
- Added `tests/unit/core-ranked-checkpoint-local-mirror-setup.spec.ts` covering runtime installation, matching owner/mode restore, owner mismatch rejection, and mode mismatch rejection.
- `home-family-bootstrap` installs `CoreRankedCheckpointLocalMirrorSetupRuntime` before legacy startup scripts load.
- `core_game_manager_restart_setup_helpers_runtime.js` now delegates `hasRankedCheckpointLocalMirrorForSetup` and `readRankedCheckpointLocalMirrorSavedStateForSetup` to the TypeScript runtime.
- `refactor-closure-audit` hotspot count dropped from 57 to 56, removing the previous 35-line ranked local mirror saved-state read hotspot.

## Verification

- `npx vitest run tests/unit/core-ranked-checkpoint-local-mirror-setup.spec.ts`
- `npx vitest run tests/unit/core-ranked-checkpoint-local-mirror-setup.spec.ts tests/unit/home-family-bootstrap-ranked-session.spec.ts`
- `npm run build`
- `node scripts/refactor-closure-audit.mjs`
