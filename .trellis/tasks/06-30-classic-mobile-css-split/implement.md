# Classic Mobile CSS Split Implementation Plan

## Guardrails

- Do not change mobile layout values.
- Do not rewrite selectors or declarations.
- Keep the `max-width: 1200px` rule before `max-width: 520px` rules.
- Do not touch JavaScript, HTML links, backend/API code, or build tooling.
- Update this file as the batch proceeds.

## Batch Plan

- [x] Batch 1: Read current CSS roadmap and inspect `classic-mobile.css`.
- [x] Batch 2: Create Trellis docs and confirm split boundaries.
- [x] Batch 3: Move the wide-copy rule and compact media body slices into focused responsive files.
- [x] Batch 4: Replace the `classic-mobile.css` import in `style/main.css`.
- [x] Batch 5: Update inventory and final-maintenance checklist.
- [x] Batch 6: Run build, unit, and smoke validation.
- [x] Batch 7: Final import/reference self-check and next-step recommendation.

## Validation Results

- `npm run build` passed.
- `npm run test:unit -- tests/unit/home-mobile-board-css.spec.ts tests/unit/leaderboard-rank-style.spec.ts tests/unit/bootstrap-flying-click-effect.spec.ts tests/unit/home-user-display-style.spec.ts tests/unit/modes-logo-css.spec.ts` passed. The command ran the full unit suite: 298 files, 1883 tests.
- `npm run test:smoke:pages` passed: 164 tests. The local Vite proxy logged `ECONNREFUSED 127.0.0.1:3000` for backend routes because the API server was not running; page smoke assertions still passed.

## Split Results

- Replaced the active `responsive/classic-mobile.css` import with eight ordered imports at the same point in `style/main.css`.
- Removed `style/responsive/classic-mobile.css` as an active file.
- Generated these replacement files:
  - `style/responsive/classic-mobile-wide-copy.css`
  - `style/responsive/classic-mobile-compact-shell.css`
  - `style/responsive/classic-mobile-compact-board.css`
  - `style/responsive/classic-mobile-compact-message.css`
  - `style/responsive/classic-mobile-compact-grid.css`
  - `style/responsive/classic-mobile-compact-tiles.css`
  - `style/responsive/classic-mobile-compact-copy-actions.css`
  - `style/responsive/classic-mobile-compact-milestones.css`
- Mechanical reconstruction check passed: rebuilding the compact media block from the eight replacement files matched the original file content order.
- Import integrity check passed: `style/main.css` has 77 imports, zero missing imported files, and zero direct rule lines.
- Active reference check passed: `style/main.css` and `style/responsive` no longer reference `classic-mobile.css`.
- Next recommended shared split target: `style/components/portal.css`.
