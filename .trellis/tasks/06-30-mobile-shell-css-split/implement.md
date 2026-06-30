# Mobile Shell CSS Split Implementation Plan

## Scope

Split `style/responsive/mobile-shell.css` without changing runtime behavior, visuals, or responsive breakpoints.

## Live Direction Guardrails

- Preserve cascade order.
- Move rules mechanically before any selector refactor.
- Keep each replacement file under `style/responsive/`.
- Do not add new theme selectors.
- Do not edit JavaScript or backend code.
- Do not alter HTML stylesheet links.
- Update this file as each batch completes.

## Batch Plan

- [x] Batch 1: Read Trellis constraints, current roadmap, and current `mobile-shell.css` structure.
- [x] Batch 2: Create Trellis task docs and confirm split boundaries.
- [x] Batch 3: Move `mobile-shell.css` inner slices into new responsive files.
- [x] Batch 4: Replace the single `mobile-shell.css` import in `style/main.css`.
- [x] Batch 5: Update CSS inventory and next optimization notes.
- [x] Batch 6: Run build, unit, and smoke validation.
- [x] Batch 7: Final import/reference self-check and next-step recommendation.

## Planned Split

```text
style/responsive/mobile-shell-game.css
  Original game page shell rules from the 980px media block.

style/responsive/mobile-shell-replay.css
  Original replay page shell and replay controls rules from the 980px media block.

style/responsive/mobile-shell-practice-dashboard.css
  Original practice page dashboard/setup rules from the 980px media block.

style/responsive/mobile-shell-shared-controls.css
  Original shared game/practice timerbox, mobile hint, mobile undo, restart, and collapsed-content rules from the 980px media block.

style/responsive/mobile-shell-practice-board.css
  Original late practice heading and board shell rules from the 980px media block.

style/responsive/mobile-shell-secondary-pages.css
  Original modes and history page shell rules from the 980px media block.
```

## Validation Plan

Run after the mechanical split:

```bash
npm run build
npm run test:unit -- tests/unit/home-mobile-board-css.spec.ts tests/unit/bootstrap-mobile-top-buttons.spec.ts tests/unit/bootstrap-mobile-timerbox.spec.ts tests/unit/bootstrap-mobile-timerbox-host.spec.ts tests/unit/bootstrap-mobile-hint-ui.spec.ts tests/unit/bootstrap-responsive-relayout.spec.ts tests/unit/home-user-display-style.spec.ts tests/unit/leaderboard-rank-style.spec.ts
npm run test:smoke:pages
```

Existing Vite proxy `ECONNREFUSED 127.0.0.1:3000` messages are expected when no local backend is running as long as Playwright assertions pass.

## Validation Results

- `npm run build`: passed.
- `npm run test:unit -- tests/unit/home-mobile-board-css.spec.ts tests/unit/bootstrap-mobile-top-buttons.spec.ts tests/unit/bootstrap-mobile-timerbox.spec.ts tests/unit/bootstrap-mobile-timerbox-host.spec.ts tests/unit/bootstrap-mobile-hint-ui.spec.ts tests/unit/bootstrap-responsive-relayout.spec.ts tests/unit/home-user-display-style.spec.ts tests/unit/leaderboard-rank-style.spec.ts`: passed. The package script also ran the full `tests/unit` suite: 298 files, 1,883 tests passed.
- `npm run test:smoke:pages`: passed. 164 Playwright smoke tests passed in 1.9m.
- Vite proxy `ECONNREFUSED 127.0.0.1:3000` messages appeared during smoke because no local backend was running; assertions still passed.

## Split Results

- Replaced the active `responsive/mobile-shell.css` import with six ordered imports at the same point in `style/main.css`.
- Removed `style/responsive/mobile-shell.css` as an active file.
- Generated these replacement files:
  - `style/responsive/mobile-shell-game.css`
  - `style/responsive/mobile-shell-replay.css`
  - `style/responsive/mobile-shell-practice-dashboard.css`
  - `style/responsive/mobile-shell-shared-controls.css`
  - `style/responsive/mobile-shell-practice-board.css`
  - `style/responsive/mobile-shell-secondary-pages.css`
- Mechanical split check passed: the six inner-rule slices reconstruct the original `max-width: 980px` media block inner rule sequence.
- Import integrity check passed: `style/main.css` has 58 imports, zero missing imported files, and zero direct rule lines.

## Final Self-Check

- Active CSS reference check passed: `style/main.css` and `style/responsive` no longer reference `mobile-shell.css`.
- Scope check passed: this task did not add future visual-theme content.
- `style/docs/css-inventory.md` now records the mobile-shell split and shows `style/components/board-tiles.css` as the largest remaining imported main-entry file.
- `.trellis/tasks/06-30-main-css-decomposition/next-optimization.md` now recommends `components/board-tiles.css` as the next structural split.
- `.trellis/tasks/06-30-css-continuation-roadmap/plan.md` marks `mobile-shell.css` completed and keeps the next phase focused on `board-tiles.css`.
