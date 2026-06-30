# Board Tiles CSS Split PRD

## Goal

Split `style/components/board-tiles.css` into smaller board and tile ownership files while preserving current runtime visuals, geometry, tile colors, and animation behavior.

## Background

`style/main.css` is an import-only manifest. After the mobile-shell split, `style/components/board-tiles.css` is the largest imported main-entry file at 447 lines. It mixes grid cells, tile dimensions, 4x4 tile positions, tile base states, tile value colors, low-performance overrides, animations, and two game copy spacing rules.

This file should be split before future board geometry or theme-readiness work because board sizing, tile color contracts, and animations are high-risk CSS surfaces.

## Requirements

- Preserve every selector and declaration value.
- Preserve effective cascade order.
- Keep replacement files under `style/components/`.
- Keep HTML links unchanged; pages must continue loading `style/main.css`.
- Keep existing board/tile CSS contract tests working through transitive `style/main.css` imports.
- Update inventory and roadmap documents after the split.
- Run build, targeted unit tests, and full page smoke tests.

## Non-Goals

- Do not add a visual theme.
- Do not add theme switching.
- Do not rewrite selectors or reduce `!important` in this task.
- Do not merge repeated media queries.
- Do not change board dimensions, tile colors, animation timings, or low-performance behavior.
- Do not edit JavaScript, backend code, account flows, leaderboard logic, replay verification, or ranked session behavior.

## Acceptance Criteria

- `style/components/board-tiles.css` is no longer an active imported file.
- `style/main.css` imports the replacement files in the same location as the old file.
- All imported CSS files exist.
- `style/main.css` remains import-only with no direct style rules.
- Documentation records the new file layout and next optimization target.
- Verification commands pass.

## Risks

- Board geometry and tile position rules are order-sensitive with mobile overrides in later responsive files; replacement imports must stay where `board-tiles.css` used to be.
- Tile color rules are reused by timer legend and theme code, so color selectors must remain byte-for-byte equivalent.
- Animation keyframes must remain before the rules that reference them in the concatenated import order.
