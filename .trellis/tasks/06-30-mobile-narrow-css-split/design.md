# Mobile Narrow CSS Split Design

## Split Boundaries

Keep each replacement file aligned to one contiguous media query group:

- `mobile-narrow-760.css`: `max-width: 760px` rules.
- `mobile-wide-hidden-controls.css`: `min-width: 981px` visibility rules.
- `mobile-narrow-520.css`: `max-width: 520px` rules.
- `mobile-narrow-390.css`: `max-width: 390px` rules.
- `mobile-narrow-320.css`: `max-width: 320px` rules.

## Method

- Slice the original file by media-query start markers.
- Verify the concatenated chunks equal the original file.
- Replace the old import in `style/main.css` with the new ordered imports.
- Delete the old active file after the reconstruction check passes.

## Risk Controls

- No selector rewrites.
- No declaration rewrites.
- No breakpoint changes.
- Validation uses the shared rolling CSS baseline.
