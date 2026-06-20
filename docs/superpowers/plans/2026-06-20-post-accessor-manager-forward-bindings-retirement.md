# Post-Accessor Manager Forward Bindings Runtime Retirement

## Goal

Retire `createPostAccessorManagerForwardBindings` from the legacy bindings runtime hotspot list by moving the stable post-accessor manager-forward binding list into a tested TypeScript runtime boundary.

## Scope

- Add `src/core/post-accessor-manager-forward-bindings.ts`.
- Expose `CorePostAccessorManagerForwardBindingsRuntime`.
- Install the runtime from `home-family-bootstrap`.
- Delegate the legacy bindings helper to the TypeScript runtime when available.
- Keep a compact standalone legacy fallback using the same binding-name table.

## TDD Evidence

- Added TypeScript runtime tests for stable binding order, operation lookup, and runtime installation.
- Added legacy VM delegation coverage for `createPostAccessorManagerForwardBindings`.
- Red run failed with missing `post-accessor-manager-forward-bindings` module and legacy returning the local fallback instead of the runtime mock.
- Green run: `npx vitest run tests/unit/core-post-accessor-manager-forward-bindings.spec.ts tests/unit/core-game-manager-bindings-runtime.spec.ts`.

## Audit Evidence

- `node scripts/refactor-closure-audit.mjs` remains expected-nonzero while long-term hotspots remain.
- Runtime hotspot count decreased from 7 to 6.
- `createPostAccessorManagerForwardBindings` is no longer listed as a hotspot.
