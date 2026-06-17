# Session Replay Snapshot Retirement

## Scope

- Move setup-time session replay V3/V1 snapshot initialization out of `core_game_manager_restart_setup_helpers_runtime.js`.
- Keep the legacy restart/setup runtime as a compatibility shell that delegates to `CoreSessionReplaySnapshotRuntime`.
- Preserve replay mode tagging, board/rules metadata, undo flag capture, special rules cloning, challenge id fallback, seed capture, empty action/record arrays, and two `Date.now()` timestamps.

## Evidence

- Added `src/core/session-replay-snapshot.ts` with replay snapshot initialization and runtime installation.
- Added `tests/unit/core-session-replay-snapshot.spec.ts` covering V3/V1 payload shape, mode tag compatibility, challenge fallback semantics, and legacy runtime installation.
- Updated `tests/unit/core-game-manager-restart-seed.spec.ts` to inject `CoreSessionReplaySnapshotRuntime` into the legacy VM harness and assert JS delegation.
- `home-family-bootstrap` installs `CoreSessionReplaySnapshotRuntime` before legacy startup scripts load.
- `core_game_manager_restart_setup_helpers_runtime.js` now delegates `initializeSetupSessionReplaySnapshot` to the TypeScript runtime.
- `refactor-closure-audit` hotspot count dropped from 55 to 54, removing the previous 33-line session replay snapshot hotspot.

## Verification

- `npx vitest run tests/unit/core-session-replay-snapshot.spec.ts`
- `npx vitest run tests/unit/core-session-replay-snapshot.spec.ts tests/unit/core-game-manager-restart-seed.spec.ts tests/unit/home-family-bootstrap-ranked-session.spec.ts`
- `npm run build`
- `node scripts/refactor-closure-audit.mjs`
