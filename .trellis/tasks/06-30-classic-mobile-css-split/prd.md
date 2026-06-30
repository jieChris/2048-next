# Classic Mobile CSS Split PRD

## Goal

Split `style/responsive/classic-mobile.css` into focused responsive files without changing mobile layout, board geometry, game message behavior, tile transforms, or milestone visibility.

## Acceptance Criteria

- The old `responsive/classic-mobile.css` import is replaced by ordered focused imports at the same cascade position.
- The `max-width: 1200px` rule remains before the `max-width: 520px` mobile rules.
- The `max-width: 520px` rules may be distributed across files by repeating the same media query wrapper, but the internal rule order and declaration text must be preserved.
- A reconstruction check confirms the replacement files can recreate the original file content order.
- No new theme, theme switcher, build-chain change, JavaScript edit, backend edit, or HTML stylesheet link change is introduced.
- Build, unit CSS/runtime checks, and page smoke pass.
