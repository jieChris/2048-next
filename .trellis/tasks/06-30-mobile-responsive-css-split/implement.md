# Mobile Responsive CSS Split Implementation Plan

## Scope

Split `style/responsive/mobile-legacy.css` without changing runtime behavior or visuals.

## Live Direction Guardrails

- Preserve cascade order.
- Move rules mechanically before refactoring selectors.
- Do not add new theme selectors.
- Do not edit JS or backend code.
- Do not alter HTML stylesheet links.
- Update this file as each batch completes.

## Batch Plan

- [x] Batch 1: Create Trellis task docs and confirm split boundaries.
- [x] Batch 2: Move `mobile-legacy.css` contiguous blocks into new responsive files.
- [x] Batch 3: Replace the single `mobile-legacy.css` import in `style/main.css`.
- [x] Batch 4: Update CSS inventory and next optimization notes.
- [x] Batch 5: Run build, unit, and smoke validation.
- [x] Batch 6: Final import/reference self-check and next-step recommendation.

## Planned Split

```text
style/responsive/mobile-shell.css
  Original 980px shell breakpoint for game/replay/practice/modes/history.

style/responsive/mobile-narrow.css
  Original 760px, desktop mobile-control hiding, 520px, 390px, and 320px breakpoint blocks.

style/responsive/mobile-scoreboard.css
  Original mobile scoreboard stabilization blocks.

style/responsive/mobile-home-actions.css
  Original mobile home display, game top-actions overflow, and text-style top button sizing.

style/responsive/practice-touch-desktop.css
  Original tablet/coarse-pointer practice layout block.
```

## Validation Plan

Run after the mechanical split:

```bash
npm run build
npm run test:unit -- tests/unit/home-mobile-board-css.spec.ts tests/unit/home-user-display-style.spec.ts tests/unit/leaderboard-rank-style.spec.ts tests/unit/wide-logo-asset.spec.ts
npm run test:smoke:pages
```

Existing Vite proxy `ECONNREFUSED 127.0.0.1:3000` messages are expected when no local backend is running as long as Playwright assertions pass.

## Validation Results

- `npm run build`: passed.
- `npm run test:unit -- tests/unit/home-mobile-board-css.spec.ts tests/unit/home-user-display-style.spec.ts tests/unit/leaderboard-rank-style.spec.ts tests/unit/wide-logo-asset.spec.ts`: passed. The package script ran the full unit suite: 298 files and 1,883 tests passed.
- `npm run test:smoke:pages`: passed. 164 Playwright smoke tests passed in 1.9m.

The smoke run still prints Vite proxy `ECONNREFUSED 127.0.0.1:3000` messages when no local backend is running; the suite handled those expected local-development conditions and completed successfully.

## Split Results

- `style/main.css`: 34 import lines, no direct style rules.
- Replaced one legacy responsive import with five ordered imports.
- Deleted the inactive `style/responsive/mobile-legacy.css` file after the split.
- New responsive file line counts:
  - `style/responsive/mobile-shell.css`: 484 lines.
  - `style/responsive/mobile-narrow.css`: 287 lines.
  - `style/responsive/mobile-scoreboard.css`: 60 lines.
  - `style/responsive/mobile-home-actions.css`: 102 lines.
  - `style/responsive/practice-touch-desktop.css`: 54 lines.
- Structural check: all 34 `style/main.css` imports exist, and `style/main.css` has no direct style rules.

## Final Self-Check

- Import integrity check: 34 imports, 0 missing files, 0 direct rules, 0 active `mobile-legacy.css` imports.
- Active legacy reference check: no `mobile-legacy.css` references in `style/main.css` or `style/responsive`.
- Scope guard check: no restricted theme-planning keywords in this task, `style/docs`, `style/responsive`, or `style/main.css`.

## Next Recommendation

Continue with `style/components/settings-modal.css`, now the largest imported main-entry file at 783 lines. Use the same pattern: split by contiguous modal subcomponent first, keep selector/value rewrites out of the mechanical pass, then run build, unit, and smoke before moving to the next large file.
