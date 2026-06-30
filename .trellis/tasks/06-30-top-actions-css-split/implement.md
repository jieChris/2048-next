# Top Actions CSS Split Implementation Plan

## Scope

Split `style/components/top-actions.css` without changing runtime behavior, visuals, or motion behavior.

## Live Direction Guardrails

- Preserve cascade order.
- Move rules mechanically before refactoring selectors.
- Do not add new theme selectors.
- Do not edit JS or backend code.
- Do not alter HTML stylesheet links.
- Keep reduced-motion overrides after their referenced motion rules.
- Update this file as each batch completes.

## Batch Plan

- [x] Batch 1: Create Trellis roadmap and task docs, confirm split boundaries.
- [x] Batch 2: Move `top-actions.css` contiguous blocks into new component files.
- [x] Batch 3: Replace the single `top-actions.css` import in `style/main.css`.
- [x] Batch 4: Update CSS inventory and next optimization notes.
- [x] Batch 5: Run build, unit, and smoke validation.
- [x] Batch 6: Final import/reference self-check and next-step recommendation.

## Planned Split

```text
style/components/top-actions-base.css
  Original top action row, button base, unread badge, generic SVG hover/focus scaling, and first reduced-motion block.

style/components/top-actions-icon-baseline.css
  Original transform reset selectors for per-icon game/practice buttons.

style/components/top-actions-announcement-motion.css
  Original announcement speaker/wave motion and keyframes.

style/components/top-actions-history-motion.css
  Original history hand motion and keyframes.

style/components/top-actions-mode-motion.css
  Original mode quadrant motion and keyframes.

style/components/top-actions-settings-motion.css
  Original settings gear rotation and keyframes.

style/components/top-actions-stats-motion.css
  Original stats line motion and keyframes.

style/components/top-actions-export-practice-motion.css
  Original export and practice icon trace/mover/frame motion and keyframes.

style/components/top-actions-reset-motion.css
  Original reset icon trace/mover path setup.

style/components/top-actions-reduced-motion.css
  Original final reduced-motion override block.
```

## Validation Plan

Run after the mechanical split:

```bash
npm run build
npm run test:unit -- tests/unit/bootstrap-top-actions.spec.ts tests/unit/bootstrap-top-actions-host.spec.ts tests/unit/bootstrap-top-action-bindings-host.spec.ts tests/unit/bootstrap-mobile-top-buttons.spec.ts tests/unit/home-user-display-style.spec.ts tests/unit/leaderboard-rank-style.spec.ts
npm run test:smoke:pages
```

Existing Vite proxy `ECONNREFUSED 127.0.0.1:3000` messages are expected when no local backend is running as long as Playwright assertions pass.

## Validation Results

- `npm run build`: passed.
- `npm run test:unit -- tests/unit/bootstrap-top-actions.spec.ts tests/unit/bootstrap-top-actions-host.spec.ts tests/unit/bootstrap-top-action-bindings-host.spec.ts tests/unit/bootstrap-mobile-top-buttons.spec.ts tests/unit/home-user-display-style.spec.ts tests/unit/leaderboard-rank-style.spec.ts`: passed. The project script also ran the full `tests/unit` suite: 298 files, 1,883 tests passed.
- `npm run test:smoke:pages`: passed. 164 Playwright smoke tests passed.
- Vite proxy `ECONNREFUSED 127.0.0.1:3000` messages appeared during smoke because no local backend was running; assertions still passed.

## Split Results

- Replaced the active `components/top-actions.css` import with ten ordered imports at the same point in `style/main.css`.
- Removed `style/components/top-actions.css` as an active file.
- Generated these replacement files:
  - `style/components/top-actions-base.css`
  - `style/components/top-actions-icon-baseline.css`
  - `style/components/top-actions-announcement-motion.css`
  - `style/components/top-actions-history-motion.css`
  - `style/components/top-actions-mode-motion.css`
  - `style/components/top-actions-settings-motion.css`
  - `style/components/top-actions-stats-motion.css`
  - `style/components/top-actions-export-practice-motion.css`
  - `style/components/top-actions-reset-motion.css`
  - `style/components/top-actions-reduced-motion.css`
- Mechanical split check passed: rejoining the ten slices in import order matched the original file content order.
- Import integrity check passed: `style/main.css` has 53 imports, zero missing imported files, and zero direct rule lines.

## Final Self-Check

- Active CSS reference check passed: `style/main.css` and `style/components` no longer reference `top-actions.css`.
- Theme scope check passed: this task did not add future visual-theme content.
- `style/docs/css-inventory.md` now records the top-actions split and shows `style/responsive/mobile-shell.css` as the largest remaining imported main-entry file.
- `.trellis/tasks/06-30-main-css-decomposition/next-optimization.md` now recommends `responsive/mobile-shell.css` as the next structural split.
- `.trellis/tasks/06-30-css-continuation-roadmap/plan.md` marks `top-actions.css` completed and keeps the next phase focused on `mobile-shell.css`.
