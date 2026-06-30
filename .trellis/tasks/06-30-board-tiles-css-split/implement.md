# Board Tiles CSS Split Implementation Plan

## Scope

Split `style/components/board-tiles.css` without changing runtime behavior, visuals, geometry, tile colors, or animation behavior.

## Live Direction Guardrails

- Preserve cascade order.
- Move rules mechanically before any selector refactor.
- Keep each replacement file under `style/components/`.
- Do not add new theme selectors.
- Do not edit JavaScript or backend code.
- Do not alter HTML stylesheet links.
- Update this file as each batch completes.

## Batch Plan

- [x] Batch 1: Read Trellis constraints, current roadmap, and current `board-tiles.css` structure.
- [x] Batch 2: Create Trellis task docs and confirm split boundaries.
- [x] Batch 3: Move `board-tiles.css` contiguous slices into new component files.
- [x] Batch 4: Replace the single `board-tiles.css` import in `style/main.css`.
- [x] Batch 5: Update CSS inventory and next optimization notes.
- [x] Batch 6: Run build, unit, and smoke validation.
- [x] Batch 7: Final import/reference self-check and next-step recommendation.

## Planned Split

```text
style/components/board-grid.css
  Original grid and tile container rules.

style/components/board-tile-geometry.css
  Original tile width, height, and line-height rules.

style/components/board-tile-positions.css
  Original 4x4 tile position transform matrix.

style/components/board-tile-base.css
  Original tile base positioning, tile-inner base styling, and low-performance overrides.

style/components/board-tile-colors.css
  Original tile value colors, high-value font-size media rules, and stone tile visual.

style/components/board-tile-animations.css
  Original appear/pop keyframes and tile-new/tile-merged animation hooks.

style/components/game-copy-spacing.css
  Original game intro and game explanation spacing rules.
```

## Validation Plan

Run after the mechanical split:

```bash
npm run build
npm run test:unit -- tests/unit/home-mobile-board-css.spec.ts tests/unit/leaderboard-rank-style.spec.ts tests/unit/bootstrap-flying-click-effect.spec.ts tests/unit/home-user-display-style.spec.ts tests/unit/modes-logo-css.spec.ts
npm run test:smoke:pages
```

Existing Vite proxy `ECONNREFUSED 127.0.0.1:3000` messages are expected when no local backend is running as long as Playwright assertions pass.

## Validation Results

- `npm run build`: passed, exit 0.
- `npm run test:unit -- tests/unit/home-mobile-board-css.spec.ts tests/unit/leaderboard-rank-style.spec.ts tests/unit/bootstrap-flying-click-effect.spec.ts tests/unit/home-user-display-style.spec.ts tests/unit/modes-logo-css.spec.ts`: passed, exit 0. The project script expanded to the full unit suite: 298 files, 1883 tests.
- `npm run test:smoke:pages`: passed, exit 0. Playwright reported 164 passed. Vite proxy `ECONNREFUSED 127.0.0.1:3000` messages appeared because no local backend was running; they did not fail assertions.

## Split Results

- Replaced the active `components/board-tiles.css` import with seven ordered imports at the same point in `style/main.css`.
- Removed `style/components/board-tiles.css` as an active file.
- Generated these replacement files:
  - `style/components/board-grid.css`
  - `style/components/board-tile-geometry.css`
  - `style/components/board-tile-positions.css`
  - `style/components/board-tile-base.css`
  - `style/components/board-tile-colors.css`
  - `style/components/board-tile-animations.css`
  - `style/components/game-copy-spacing.css`
- Mechanical split check passed: rejoining the seven slices in import order matched the original file content order.
- Import integrity check passed: `style/main.css` has 64 imports, zero missing imported files, and zero direct rule lines.

## Final Self-Check

- Old active reference check passed: no `board-tiles.css` references remain under `style/main.css` or `style/components`.
- Scope check passed: this task did not add a visual theme, theme switcher, build-chain change, JavaScript edit, backend edit, or HTML stylesheet link change.
- Excluded-theme wording check passed for this task's files and touched CSS/docs.
- Next target: split `style/preferences/night-background.css`, now the largest imported main-entry file, by document/global surfaces, board/timer surfaces, modal/settings surfaces, portal/history surfaces, and practice surfaces.
