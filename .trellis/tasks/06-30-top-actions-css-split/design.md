# Top Actions CSS Split Design

## Current Shape

`style/components/top-actions.css` is the largest imported main-entry file. It currently owns these contiguous concerns:

- Top action row and base button styling.
- Unread indicator badge.
- Generic SVG hover/focus scaling and first reduced-motion block.
- Per-icon SVG transform reset for game/practice buttons.
- Announcement icon motion.
- History icon motion.
- Mode icon motion.
- Settings icon motion.
- Stats icon motion.
- Export and practice icon motion.
- Reset icon motion path setup.
- Final reduced-motion overrides for all motion groups.

## Target Shape

Replace the single file with conservative files that follow existing contiguous boundaries:

```text
style/components/
  top-actions-base.css
  top-actions-icon-baseline.css
  top-actions-announcement-motion.css
  top-actions-history-motion.css
  top-actions-mode-motion.css
  top-actions-settings-motion.css
  top-actions-stats-motion.css
  top-actions-export-practice-motion.css
  top-actions-reset-motion.css
  top-actions-reduced-motion.css
```

## Import Order Contract

The new imports must replace `components/top-actions.css` at the same position in `style/main.css`:

```css
@import url("components/replay-modal.css");
@import url("components/top-actions-base.css");
@import url("components/top-actions-icon-baseline.css");
@import url("components/top-actions-announcement-motion.css");
@import url("components/top-actions-history-motion.css");
@import url("components/top-actions-mode-motion.css");
@import url("components/top-actions-settings-motion.css");
@import url("components/top-actions-stats-motion.css");
@import url("components/top-actions-export-practice-motion.css");
@import url("components/top-actions-reset-motion.css");
@import url("components/top-actions-reduced-motion.css");
@import url("components/stats-and-guide.css");
```

This preserves the original cascade because every target file is a contiguous slice of the old stylesheet, imported in old line order.

## Implementation Approach

Use a mechanical contiguous-slice split. Keep selectors, declarations, comments, keyframes, and media queries unchanged except for file boundaries. Do not merge reduced-motion media queries in this task.

## Done Definition

- `style/main.css` imports the new component files in the documented order.
- The old `top-actions.css` import is gone.
- No active CSS import points at a missing file.
- Documentation and inventory line counts are current.
- Build, unit, and smoke validation pass.
