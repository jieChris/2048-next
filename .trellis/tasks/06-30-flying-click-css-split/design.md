# Flying Click CSS Split Design

## Split Boundaries

Keep each replacement file aligned to a contiguous effect ownership group:

- `flying-click-base.css`: root/layer/particle/logo/powder/static tile sizing rules.
- `flying-click-logo-keyframes.css`: logo rise, logo image burst, and powder keyframes.
- `flying-click-tile-keyframes.css`: tile particle keyframes.
- `flying-click-reduced-motion.css`: reduced-motion media rule.

## Method

- Slice the original file by keyframe/media start markers.
- Verify the concatenated chunks equal the original file.
- Replace the old import in `style/main.css` with the new ordered imports.
- Delete the old active file after the reconstruction check passes.

## Risk Controls

- No selector rewrites.
- No declaration rewrites.
- No keyframe changes.
- Validation uses the shared rolling CSS baseline.
