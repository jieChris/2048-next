# Mobile Narrow CSS Split Implementation Plan

## Guardrails

- Do not change runtime visuals.
- Do not rewrite selectors, declarations, breakpoints, or priority flags.
- Preserve the original source order.
- Do not touch JavaScript, HTML links, backend/API code, or build tooling.
- Update this file as the batch proceeds.

## Batch Plan

- [x] Batch 1: Inspect current `mobile-narrow.css` and confirm breakpoint ownership.
- [x] Batch 2: Create Trellis docs and confirm split boundaries.
- [x] Batch 3: Move contiguous media query groups into focused responsive files.
- [x] Batch 4: Replace the `mobile-narrow.css` import in `style/main.css`.
- [x] Batch 5: Update inventory and final-maintenance checklist.
- [x] Batch 6: Run build, unit, and smoke validation.
- [x] Batch 7: Final import/reference self-check and next-step recommendation.

## Validation Results

- `npm run build` passed.
- `npm run test:unit -- tests/unit/home-mobile-board-css.spec.ts tests/unit/leaderboard-rank-style.spec.ts tests/unit/bootstrap-flying-click-effect.spec.ts tests/unit/home-user-display-style.spec.ts tests/unit/modes-logo-css.spec.ts` passed. The command ran the full unit suite: 298 files, 1883 tests.
- `npm run test:smoke:pages` passed: 164 tests. The local Vite proxy logged `ECONNREFUSED 127.0.0.1:3000` for backend routes because the API server was not running; page smoke assertions still passed.

## Split Results

- Replaced the active `responsive/mobile-narrow.css` import with five ordered imports at the same point in `style/main.css`.
- Removed `style/responsive/mobile-narrow.css` as an active file.
- Generated these replacement files:
  - `style/responsive/mobile-narrow-760.css`
  - `style/responsive/mobile-wide-hidden-controls.css`
  - `style/responsive/mobile-narrow-520.css`
  - `style/responsive/mobile-narrow-390.css`
  - `style/responsive/mobile-narrow-320.css`
- Mechanical reconstruction check passed: rejoining the five replacement files matched the original file content order.
- Import integrity check passed: `style/main.css` has 94 imports, zero missing imported files, and zero direct rule lines.
- Active reference check passed: `style/main.css` and `style/responsive` no longer reference `responsive/mobile-narrow.css`, and `style/responsive/mobile-narrow.css` no longer exists.
- Next recommended shared review target: `style/effects/flying-click.css`.
