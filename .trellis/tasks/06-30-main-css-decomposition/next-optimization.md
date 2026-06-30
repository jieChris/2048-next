# Next CSS Optimization Plan

## Current State After Main Split

`style/main.css` is now an import-only manifest. This satisfies the immediate structural goal: the runtime entry is stable, and direct style ownership lives in focused files.

The next work should optimize the new layers, not undo the split.

## Priority 1: Stabilize Large New Files

Completed follow-up:

- `style/responsive/mobile-legacy.css` was split into five ordered responsive files in `.trellis/tasks/06-30-mobile-responsive-css-split/`.
- `style/components/settings-modal.css` was split into eleven ordered component files in `.trellis/tasks/06-30-settings-modal-css-split/`.
- `style/components/top-actions.css` was split into ten ordered component files in `.trellis/tasks/06-30-top-actions-css-split/`.
- `style/responsive/mobile-shell.css` was split into six ordered responsive files in `.trellis/tasks/06-30-mobile-shell-css-split/`.
- `style/components/board-tiles.css` was split into seven ordered component files in `.trellis/tasks/06-30-board-tiles-css-split/`.
- `style/preferences/night-background.css` was split into seven ordered preference files in `.trellis/tasks/06-30-night-background-css-split/`.
- `style/responsive/classic-mobile.css` was split into eight ordered responsive files in `.trellis/tasks/06-30-classic-mobile-css-split/`.

Largest files to split next:

- `style/components/portal.css`
- `style/components/replay-modal.css`
- `style/responsive/mobile-narrow.css`

Method:

1. Add or identify smoke/screenshot coverage for the affected surfaces.
2. Split one file at a time by subcomponent.
3. Preserve import order inside `style/main.css`.
4. Run build, unit CSS contract tests, and targeted smoke after each split.

Suggested breakdown:

- `portal.css` -> portal shell, cards, action rows, history list controls.

## Priority 2: Expand Semantic Tokens

Create tokens only from repeated existing values. Do not invent new visual styling.

Candidate token groups:

- text colors: primary, muted, inverted
- page/surface colors
- board/tile base colors
- border colors
- radius values
- focus rings
- button surfaces
- modal surfaces
- shadow presets
- spacing values used by board/timer/top actions

Method:

1. Count repeated colors and dimensions.
2. Introduce tokens in `style/tokens/base.css`.
3. Replace repeated values in one ownership file at a time.
4. Keep token names semantic, not page-specific.

## Priority 3: Inline Style Governance

Separate remaining inline styles into two categories:

- Runtime state hooks: keep until owning JS is changed.
- Static presentation: migrate to classes.

Method:

1. Update `style/docs/css-inventory.md` with exact remaining inline categories.
2. Start with non-runtime static styles in `history.html`, practice variants, and utility pages.
3. Add component classes before removing inline attributes.
4. Run targeted smoke for each page touched.

## Priority 4: Reduce Specificity And `!important`

Do this only after the split has stayed stable.

Method:

1. Count `!important` by file.
2. Pick one component file.
3. Replace broad selectors with stable component classes where markup already supports it.
4. Avoid changing runtime state selectors that JS depends on.
5. Verify with smoke before moving to the next component.

## Priority 5: Future Theme Readiness

After the structural cleanup is stable, define a visual-theme contract separate from the existing board theme manager.

Method:

1. Keep board theme ids and current `data-theme` behavior untouched.
2. Define a separate top-level visual-theme attribute or class in a future task.
3. Start with tokens and component surfaces, not page-specific overrides.
4. Gate rollout behind explicit UI and screenshot validation.

## Suggested Next Task

Continue with `components/portal.css` because it is now the largest imported main-entry file. Split it into portal shell/cards/actions/history-list ownership while preserving import order and avoiding selector rewrites.
