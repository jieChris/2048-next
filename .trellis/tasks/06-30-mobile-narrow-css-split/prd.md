# Mobile Narrow CSS Split PRD

## Goal

Split `style/responsive/mobile-narrow.css` into breakpoint-owned responsive files while preserving the existing mobile cascade.

## Acceptance Criteria

- `style/main.css` replaces the single `responsive/mobile-narrow.css` import with ordered breakpoint imports at the same location.
- Selectors, declarations, media query conditions, priority flags, and source order are preserved.
- `style/responsive/mobile-narrow.css` is no longer an active file.
- Rejoining the replacement files matches the original source exactly.
- Build, unit, and page smoke validation pass after the split.

## Non-Goals

- Do not redesign mobile layout.
- Do not rewrite selectors or reduce `!important` in this batch.
- Do not change breakpoints.
- Do not touch JavaScript, HTML links, or build tooling.
