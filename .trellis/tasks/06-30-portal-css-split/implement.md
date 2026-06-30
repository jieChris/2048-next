# Portal CSS Split Implementation Plan

## Guardrails

- Do not change runtime visuals.
- Do not rewrite selectors or declarations.
- Preserve the original source order.
- Do not touch JavaScript, HTML links, backend/API code, or build tooling.
- Update this file as the batch proceeds.

## Batch Plan

- [x] Batch 1: Inspect current `portal.css` and its `style/main.css` import position.
- [x] Batch 2: Create Trellis docs and confirm split boundaries.
- [x] Batch 3: Move contiguous portal/history rule groups into focused component files.
- [x] Batch 4: Replace the `portal.css` import in `style/main.css`.
- [x] Batch 5: Update inventory and final-maintenance checklist.
- [x] Batch 6: Run build, unit, and smoke validation.
- [x] Batch 7: Final import/reference self-check and next-step recommendation.

## Validation Results

- `npm run build` passed.
- `npm run test:unit -- tests/unit/home-mobile-board-css.spec.ts tests/unit/leaderboard-rank-style.spec.ts tests/unit/bootstrap-flying-click-effect.spec.ts tests/unit/home-user-display-style.spec.ts tests/unit/modes-logo-css.spec.ts` passed. The command ran the full unit suite: 298 files, 1883 tests.
- `npm run test:smoke:pages` passed: 164 tests. The local Vite proxy logged `ECONNREFUSED 127.0.0.1:3000` for backend routes because the API server was not running; page smoke assertions still passed.

## Split Results

- Replaced the active `components/portal.css` import with seven ordered imports at the same point in `style/main.css`.
- Removed `style/components/portal.css` as an active file.
- Generated these replacement files:
  - `style/components/portal-shell.css`
  - `style/components/portal-forms.css`
  - `style/components/portal-table.css`
  - `style/components/history-list.css`
  - `style/components/history-mini-board.css`
  - `style/components/history-final-board.css`
  - `style/components/portal-responsive.css`
- Mechanical reconstruction check passed: rejoining the seven replacement files matched the original file content order.
- Import integrity check passed: `style/main.css` has 83 imports, zero missing imported files, and zero direct rule lines.
- Active reference check passed: `style/main.css` and `style/components` no longer reference `components/portal.css`, and `style/components/portal.css` no longer exists.
- Next recommended shared review targets: `style/components/replay-modal.css`, `style/responsive/mobile-narrow.css`, and `style/components/settings-switches.css`.
