# Mobile Responsive CSS Split Design

## Current Shape

`style/main.css` is already an import-only manifest. Its largest imported responsive file is `style/responsive/mobile-legacy.css`, which mixes several concerns:

- `max-width: 980px` shell rules for game, replay, practice, modes, and history pages.
- `max-width: 760px`, `520px`, `390px`, and `320px` narrow-device overrides.
- Desktop hiding rules for mobile-only controls.
- Mobile scoreboard stabilization.
- Mobile home/user display rules.
- Mobile top-action overflow behavior.
- Text-style top button sizing.
- Tablet/coarse-pointer practice layout.

## Target Shape

Replace the single legacy file with conservative files that follow existing contiguous boundaries:

```text
style/responsive/
  mobile-shell.css
  mobile-narrow.css
  mobile-scoreboard.css
  mobile-home-actions.css
  practice-touch-desktop.css
```

## Import Order Contract

The new imports must replace `responsive/mobile-legacy.css` at the same position in `style/main.css`:

```css
@import url("components/mobile-controls.css");
@import url("responsive/mobile-shell.css");
@import url("responsive/mobile-narrow.css");
@import url("responsive/mobile-scoreboard.css");
@import url("responsive/mobile-home-actions.css");
@import url("responsive/practice-touch-desktop.css");
@import url("components/online-runtime.css");
```

This preserves the original cascade: shell breakpoints first, then narrow overrides, then scoreboard and mobile action refinements, then the tablet/coarse-pointer practice override.

## Implementation Approach

Use a mechanical contiguous-slice split. Keep selectors, declarations, comments, and media queries unchanged except for file boundaries. Do not merge duplicate media queries in this task.

## Done Definition

- `style/main.css` imports the new responsive files in the documented order.
- The old `mobile-legacy.css` import is gone.
- No active CSS import points at a missing file.
- Documentation and inventory line counts are current.
- Build, unit, and smoke validation pass.
