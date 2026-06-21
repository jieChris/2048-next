# Capped Repeat Legend Runtime Retirement

## Goal

Retire `normalizeCappedRepeatLegendClasses` from the legacy saved-state runtime hotspot list by moving capped repeat legend normalization into a tested TypeScript runtime boundary.

## Scope

- Add `src/core/capped-repeat-legend.ts`.
- Expose `CoreCappedRepeatLegendRuntime`.
- Install the runtime from `home-family-bootstrap`.
- Delegate the legacy saved-state helper to the TypeScript runtime when available.
- Keep a compact standalone legacy fallback.

## TDD Evidence

- Added TypeScript runtime tests for capped repeat legend class/style normalization, legend font-size fallback, non-capped early return, and runtime installation.
- Added legacy VM delegation coverage for `normalizeCappedRepeatLegendClasses` with an injected `resolveManagerDocumentLike` operation.
- Red run failed with missing `capped-repeat-legend` module and legacy invoking the old direct manager path.
- Green run: `npx vitest run tests/unit/core-capped-repeat-legend.spec.ts tests/unit/core-game-manager-saved-state-runtime.spec.ts`.

## Audit Evidence

- `node scripts/refactor-closure-audit.mjs` remains expected-nonzero while long-term hotspots remain.
- Runtime hotspot count decreased from 4 to 3.
- `normalizeCappedRepeatLegendClasses` is no longer listed as a hotspot.
