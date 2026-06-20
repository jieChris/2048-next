# Saved Payload Replay String Runtime Retirement

## Goal

Retire `resolveReplayStringForSavedPayload` from the legacy saved-state runtime hotspot list by moving saved payload replay string selection into a tested TypeScript runtime boundary.

## Scope

- Add `src/core/saved-payload-replay-string.ts`.
- Expose `CoreSavedPayloadReplayStringRuntime`.
- Install the runtime from `home-family-bootstrap`.
- Delegate the legacy saved-state helper to the TypeScript runtime when available.
- Keep a compact standalone legacy fallback.

## TDD Evidence

- Added TypeScript runtime tests for live replay serialization, timestamp throttling, forced saves, rescue replay fallback, and runtime installation.
- Added legacy VM delegation coverage for `resolveReplayStringForSavedPayload`.
- Red run failed with missing `saved-payload-replay-string` module and legacy returning the rescue fallback.
- Green run: `npx vitest run tests/unit/core-saved-payload-replay-string.spec.ts tests/unit/core-game-manager-saved-state-runtime.spec.ts`.

## Audit Evidence

- `node scripts/refactor-closure-audit.mjs` remains expected-nonzero while long-term hotspots remain.
- Runtime hotspot count decreased from 11 to 10.
- `resolveReplayStringForSavedPayload` is no longer listed as a hotspot.
