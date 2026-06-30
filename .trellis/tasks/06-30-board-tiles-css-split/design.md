# Board Tiles CSS Split Design

## Current Shape

`style/components/board-tiles.css` currently contains these contiguous concerns:

- grid and tile containers: original lines 1-49
- tile dimensions: original lines 51-56
- 4x4 tile position transforms: original lines 58-152
- tile base, inner base, and low-performance overrides: original lines 154-192
- tile value colors, responsive font-size rules, and stone tile visual: original lines 194-311
- appear/pop keyframes and new/merged tile animation hooks: original lines 313-438
- game intro/explanation spacing: original lines 440-447

## Target Shape

Replace the single file with seven ordered files:

```text
style/components/board-grid.css
style/components/board-tile-geometry.css
style/components/board-tile-positions.css
style/components/board-tile-base.css
style/components/board-tile-colors.css
style/components/board-tile-animations.css
style/components/game-copy-spacing.css
```

## Import Order Contract

The new imports must replace `components/board-tiles.css` at the same position in `style/main.css`:

```css
@import url("components/board-shell.css");
@import url("components/game-message.css");
@import url("components/board-grid.css");
@import url("components/board-tile-geometry.css");
@import url("components/board-tile-positions.css");
@import url("components/board-tile-base.css");
@import url("components/board-tile-colors.css");
@import url("components/board-tile-animations.css");
@import url("components/game-copy-spacing.css");
@import url("responsive/classic-mobile.css");
```

This preserves source order relative to board shell/message rules before it and classic mobile overrides after it.

## Split Method

Use a mechanical contiguous-slice split:

1. Read the original file.
2. Extract each line-range slice.
3. Write each slice to its replacement file without rewriting selectors or declarations.
4. Verify that concatenating the seven slices in import order reproduces the original content.
5. Update `style/main.css`.
6. Remove the old active file.

## Done Definition

- The old `components/board-tiles.css` import is gone.
- The new files are imported in the documented order.
- No imported CSS file is missing.
- `style/main.css` still has no direct CSS rules.
- Build, targeted unit, and smoke verification pass.
