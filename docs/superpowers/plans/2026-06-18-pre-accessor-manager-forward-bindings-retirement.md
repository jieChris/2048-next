# Pre Accessor Manager Forward Bindings Retirement

## Scope

- Move pre-accessor manager-forward binding list construction out of `core_game_manager_bindings_runtime.js`.
- Keep the legacy bindings runtime as the compatibility shell that provides existing function references to `CorePreAccessorManagerForwardBindingsRuntime`.
- Preserve binding names, binding order, and the existing manager-forward batch binding behavior before core runtime accessor registration.

## Evidence

- Added `src/core/pre-accessor-manager-forward-bindings.ts` with a tested runtime boundary for the pre-accessor manager-forward binding list.
- Added `tests/unit/core-pre-accessor-manager-forward-bindings.spec.ts` covering stable binding order, function reference preservation, and runtime installation.
- Added `tests/unit/core-game-manager-bindings-runtime.spec.ts` to assert JS delegation into the TypeScript runtime through explicit operations.
- Updated `home-family-bootstrap` to install `CorePreAccessorManagerForwardBindingsRuntime` before legacy game scripts load.
- Updated `tests/unit/home-family-bootstrap-ranked-session.spec.ts` to cover the new bootstrap installation.
- `refactor-closure-audit` hotspot count dropped from 50 to 49, removing the previous `createPreAccessorManagerForwardBindings` hotspot.

## Verification

- `npx vitest run tests/unit/core-pre-accessor-manager-forward-bindings.spec.ts tests/unit/core-game-manager-bindings-runtime.spec.ts tests/unit/home-family-bootstrap-ranked-session.spec.ts`
- `npm run build`
- `node scripts/refactor-closure-audit.mjs`
- `npm run verify:prepush`
