# Portal CSS Split PRD

## Goal

Split `style/components/portal.css` into focused component files while preserving the existing visual output and cascade order.

## Acceptance Criteria

- `style/main.css` replaces the single `components/portal.css` import with ordered focused imports at the same location.
- Selectors, declarations, comments, media query conditions, and source order are preserved.
- `style/components/portal.css` is no longer an active file.
- Rejoining the replacement files matches the original source exactly.
- Build, unit, and page smoke validation pass after the split.

## Non-Goals

- Do not redesign portal, history, table, or board presentation.
- Do not rename HTML classes or JavaScript selectors.
- Do not remove inline styles in this batch.
- Do not add tokens or reduce `!important` in this batch.
