# Flying Click CSS Split Implementation Plan

## Guardrails

- Do not change runtime visuals or animation timing.
- Do not rewrite selectors, declarations, keyframes, or priority flags.
- Preserve the original source order.
- Do not touch JavaScript, HTML links, backend/API code, or build tooling.
- Update this file as the batch proceeds.

## Batch Plan

- [x] Batch 1: Inspect current `flying-click.css` and confirm effect ownership.
- [x] Batch 2: Create Trellis docs and confirm split boundaries.
- [x] Batch 3: Move contiguous effect rule groups into focused files.
- [x] Batch 4: Replace the `flying-click.css` import in `style/main.css`.
- [x] Batch 5: Update inventory and final-maintenance checklist.
- [x] Batch 6: Run build, unit, and smoke validation.
- [x] Batch 7: Final import/reference self-check and next-step recommendation.

## Validation Results

- `npm run build` passed.
- `npm run test:unit -- tests/unit/home-mobile-board-css.spec.ts tests/unit/leaderboard-rank-style.spec.ts tests/unit/bootstrap-flying-click-effect.spec.ts tests/unit/home-user-display-style.spec.ts tests/unit/modes-logo-css.spec.ts` passed as the full unit suite: 298 files / 1883 tests.
- `npm run test:smoke:pages` passed: 164 tests.
- Final import/reference self-check passed: `style/main.css` has 97 imports, zero missing imports, zero direct rule lines, no old `effects/flying-click.css` import, and no old active file.

## Split Results

- Replaced the active `effects/flying-click.css` import with four ordered imports at the same point in `style/main.css`.
- Removed `style/effects/flying-click.css` as an active file.
- Generated these replacement files:
  - `style/effects/flying-click-base.css`
  - `style/effects/flying-click-logo-keyframes.css`
  - `style/effects/flying-click-tile-keyframes.css`
  - `style/effects/flying-click-reduced-motion.css`
- Mechanical reconstruction check passed: rejoining the four replacement files matched the original file content order.
- Import integrity check passed: `style/main.css` has 97 imports, zero missing imported files, and zero direct rule lines.
