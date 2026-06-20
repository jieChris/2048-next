# Capped UI Bindings Runtime Retirement

## Goal

Retire `bindCappedUiBindings` from the legacy bindings runtime hotspot list by moving the capped UI manager-forward binding list into a tested TypeScript runtime boundary.

## Scope

- Add `src/core/capped-ui-bindings.ts`.
- Expose `CoreCappedUiManagerForwardBindingsRuntime`.
- Install the runtime from `home-family-bootstrap`.
- Delegate capped UI binding-list creation from the legacy bindings helper to the TypeScript runtime when available.
- Keep a compact standalone legacy fallback using the same binding-name table.

## TDD Evidence

- Added TypeScript runtime tests for stable binding order, operation lookup, and runtime installation.
- Added legacy VM delegation coverage for `createCappedUiManagerForwardBindings`.
- Red run failed with missing `capped-ui-bindings` module and missing legacy creation entrypoint.
- Green run: `npx vitest run tests/unit/core-capped-ui-bindings.spec.ts tests/unit/core-game-manager-bindings-runtime.spec.ts`.

## Audit Evidence

- `node scripts/refactor-closure-audit.mjs` remains expected-nonzero while long-term hotspots remain.
- Runtime hotspot count decreased from 6 to 5.
- `bindCappedUiBindings` is no longer listed as a hotspot.
