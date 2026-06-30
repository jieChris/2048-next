# Night Background CSS Split Implementation Plan

## Guardrails

- Do not change visual values.
- Do not rewrite selectors.
- Do not touch JavaScript, HTML links, backend/API code, or build tooling.
- Update this file as the batch proceeds.

## Batch Plan

- [x] Batch 1: Read current CSS roadmap and inspect `night-background.css`.
- [x] Batch 2: Create Trellis docs and confirm contiguous split boundaries.
- [x] Batch 3: Move contiguous slices into focused preference files.
- [x] Batch 4: Replace the `night-background.css` import in `style/main.css`.
- [x] Batch 5: Update inventory and final-maintenance checklist.
- [x] Batch 6: Run build, unit, and smoke validation.
- [x] Batch 7: Final import/reference self-check and next-step recommendation.

## Validation Results

- `npm run build`: passed, exit 0.
- `npm run test:unit -- tests/unit/home-mobile-board-css.spec.ts tests/unit/leaderboard-rank-style.spec.ts tests/unit/bootstrap-flying-click-effect.spec.ts tests/unit/home-user-display-style.spec.ts tests/unit/modes-logo-css.spec.ts`: passed, exit 0. The project script expanded to the full unit suite: 298 files, 1883 tests.
- `npm run test:smoke:pages`: passed, exit 0. Playwright reported 164 passed. Vite proxy `ECONNREFUSED 127.0.0.1:3000` messages appeared because no local backend was running; they did not fail assertions.

## Split Results

- Replaced the active `preferences/night-background.css` import with seven ordered imports at the same point in `style/main.css`.
- Removed `style/preferences/night-background.css` as an active file.
- Generated these replacement files:
  - `style/preferences/night-background-base.css`
  - `style/preferences/night-score-timer.css`
  - `style/preferences/night-board-actions.css`
  - `style/preferences/night-modals-settings.css`
  - `style/preferences/night-diagonal-assist.css`
  - `style/preferences/night-history.css`
  - `style/preferences/night-practice.css`
- Mechanical split check passed: rejoining the seven slices in import order matched the original file content order.
- Import integrity check passed: `style/main.css` has 70 imports, zero missing imported files, and zero direct rule lines.

## Final Self-Check

- Old active reference check: no active `style/main.css` import points to `preferences/night-background.css`.
- Scope check: no visual values, selectors, JavaScript, backend/API code, HTML stylesheet links, or build tooling were changed.
- Next target: split `style/responsive/classic-mobile.css`, now the largest imported main-entry file.
