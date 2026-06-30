# Settings Modal CSS Split Design

## Current Shape

`style/components/settings-modal.css` is the largest imported main-entry component file. It currently owns these contiguous concerns:

- Settings and announcement modal content shells.
- Announcement list items and links.
- Settings row layout plus toolkit entry buttons.
- Action rows, language switch, toggle row, and switch slider controls.
- First mobile/settings responsive block.
- Custom theme settings row.
- Custom select dropdown.
- Theme preview grid.
- Settings notes.
- Tile palette editor.
- Final mobile overrides for top actions, preview layout, and tile palette controls.

## Target Shape

Replace the single file with conservative files that follow existing contiguous boundaries:

```text
style/components/
  settings-modal-shell.css
  announcement-modal.css
  settings-toolkit.css
  settings-switches.css
  settings-modal-responsive.css
  theme-settings-layout.css
  custom-select.css
  theme-preview.css
  settings-notes.css
  tile-palette-settings.css
  settings-modal-mobile-tail.css
```

## Import Order Contract

The new imports must replace `components/settings-modal.css` at the same position in `style/main.css`:

```css
@import url("components/stats-and-guide.css");
@import url("components/settings-modal-shell.css");
@import url("components/announcement-modal.css");
@import url("components/settings-toolkit.css");
@import url("components/settings-switches.css");
@import url("components/settings-modal-responsive.css");
@import url("components/theme-settings-layout.css");
@import url("components/custom-select.css");
@import url("components/theme-preview.css");
@import url("components/settings-notes.css");
@import url("components/tile-palette-settings.css");
@import url("components/settings-modal-mobile-tail.css");
@import url("components/tile-legend.css");
```

This preserves the original cascade because every target file is a contiguous slice of the old stylesheet, imported in old line order.

## Implementation Approach

Use a mechanical contiguous-slice split. Keep selectors, declarations, comments, and media queries unchanged except for file boundaries. Do not merge duplicate mobile media queries in this task.

## Done Definition

- `style/main.css` imports the new component files in the documented order.
- The old `settings-modal.css` import is gone.
- No active CSS import points at a missing file.
- Documentation and inventory line counts are current.
- Build, unit, and smoke validation pass.
