# Main CSS Decomposition Implementation Plan

## Scope

Split `style/main.css` into layered CSS files without changing runtime behavior or visuals. Keep this as a structural migration only.

## Live Direction Guardrails

- Preserve cascade order.
- Move rules mechanically before refactoring selectors.
- Do not add new theme selectors.
- Do not edit JS or backend code.
- Do not alter HTML stylesheet links.
- Update this file after each completed batch.

## Target Import Manifest

```css
@import url("tokens/base.css");
@import url(fonts/clear-sans.css);
@import url("components/logo.css");
@import url("components/timer.css");
@import url("base/document.css");
@import url("layout/shell.css");
@import url("components/score.css");
@import url("components/timerbox.css");
@import url("components/timer-leaderboard.css");
@import url("base/content.css");
@import url("components/board-shell.css");
@import url("components/game-message.css");
@import url("components/board-tiles.css");
@import url("responsive/classic-mobile.css");
@import url("components/replay-modal.css");
@import url("components/top-actions.css");
@import url("components/stats-and-guide.css");
@import url("components/settings-modal.css");
@import url("components/tile-legend.css");
@import url("components/portal.css");
@import url("components/mobile-controls.css");
@import url("responsive/mobile-legacy.css");
@import url("components/online-runtime.css");
@import url("components/diagonal-assist.css");
@import url("preferences/night-background.css");
@import url("components/game-dialog.css");
@import url("components/beta-access-gate.css");
@import url("responsive/dialog-gate-mobile.css");
@import url("effects/flying-click.css");
@import url("effects/breakout-easter-egg.css");
```

## Batch Plan

- [x] Batch 1: Create directories and move base/layout/score/timer sections.
- [x] Batch 2: Move board shell, game message, board tiles, classic mobile, replay modal, and top action sections.
- [x] Batch 3: Move stats/guide/settings/tile legend/portal sections.
- [x] Batch 4: Move responsive/mobile/online/diagonal/night/dialog/gate/effects sections.
- [x] Batch 5: Replace `main.css` with import manifest and verify no direct style rules remain.
- [x] Batch 6: Update inventory and write next-step optimization plan.

## Split Results

- `style/main.css`: 30 import lines, no direct style rules.
- Moved 6,457 direct CSS rule lines into 26 files.
- Largest new files:
  - `style/responsive/mobile-legacy.css`: 987 lines.
  - `style/components/settings-modal.css`: 783 lines.
  - `style/components/top-actions.css`: 674 lines.
  - `style/components/board-tiles.css`: 447 lines.
  - `style/preferences/night-background.css`: 382 lines.
- Structural check: `rg -n '^[^@/\\s].*\\{' style/main.css` returned no matches.

## Validation Plan

Run after the full mechanical split:

```bash
npm run build
npm run test:unit -- tests/unit/wide-logo-asset.spec.ts tests/unit/home-user-display-style.spec.ts tests/unit/modes-logo-css.spec.ts tests/unit/home-mobile-board-css.spec.ts
npm run test:smoke:pages
```

If full smoke is slow, run it after build and unit pass. Existing Vite proxy `ECONNREFUSED 127.0.0.1:3000` messages are expected when no local backend is running as long as Playwright assertions pass.

## Validation Results

- `npm run build`: passed after mechanical split; final rerun after test-helper/doc updates also passed.
- `npm run test:unit -- tests/unit/wide-logo-asset.spec.ts tests/unit/home-user-display-style.spec.ts tests/unit/modes-logo-css.spec.ts tests/unit/home-mobile-board-css.spec.ts`: passed after updating CSS contract tests to read `style/main.css` plus imported CSS. The package script ran the full unit suite: 298 files and 1,883 tests passed.
- `npm run test:smoke:pages`: passed. 164 Playwright smoke tests passed in 1.8m.

The smoke run still prints Vite proxy `ECONNREFUSED 127.0.0.1:3000` messages when no local backend is running; the suite handled those expected local-development conditions and completed successfully.
