# Mobile Shell CSS Split Design

## Current Shape

`style/responsive/mobile-shell.css` currently contains one `@media screen and (max-width: 980px)` block. Inside that block, rules are grouped mostly by page family:

- game shell: original lines 2-126
- replay shell: original lines 128-203
- practice dashboard/setup shell: original lines 205-263
- shared game/practice mobile controls and timerbox behavior: original lines 264-418
- practice board late shell rules: original lines 419-430
- modes and history shell rules: original lines 432-482

The outer media wrapper is shared by all rules.

## Target Shape

Replace the single file with six ordered files:

```text
style/responsive/mobile-shell-game.css
style/responsive/mobile-shell-replay.css
style/responsive/mobile-shell-practice-dashboard.css
style/responsive/mobile-shell-shared-controls.css
style/responsive/mobile-shell-practice-board.css
style/responsive/mobile-shell-secondary-pages.css
```

Each replacement file owns one `@media screen and (max-width: 980px)` block containing its original inner slice.

## Import Order Contract

The new imports must replace `responsive/mobile-shell.css` at the same position in `style/main.css`:

```css
@import url("components/mobile-controls.css");
@import url("responsive/mobile-shell-game.css");
@import url("responsive/mobile-shell-replay.css");
@import url("responsive/mobile-shell-practice-dashboard.css");
@import url("responsive/mobile-shell-shared-controls.css");
@import url("responsive/mobile-shell-practice-board.css");
@import url("responsive/mobile-shell-secondary-pages.css");
@import url("responsive/mobile-narrow.css");
```

This preserves source order relative to `components/mobile-controls.css` before it and `responsive/mobile-narrow.css` after it.

## Split Method

Use a mechanical inner-slice split:

1. Read the original file.
2. Extract the inner rule slices by original line range.
3. Wrap each slice with the same `@media screen and (max-width: 980px)` condition.
4. Verify that concatenating the extracted inner slices in import order reproduces the original inner rule sequence.
5. Update `style/main.css`.
6. Remove the old active file.

## Done Definition

- The old `responsive/mobile-shell.css` import is gone.
- The new files are imported in the documented order.
- No imported CSS file is missing.
- `style/main.css` still has no direct CSS rules.
- Build, targeted unit, and smoke verification pass.
