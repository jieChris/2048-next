# Replay Modal CSS Split PRD

## Goal

Split `style/components/replay-modal.css` into focused component files without changing replay, import, mobile hint, or mode-intro visuals.

## Acceptance Criteria

- `style/main.css` replaces the single `components/replay-modal.css` import with ordered focused imports at the same location.
- Selectors, declarations, comments, range-input rules, and source order are preserved.
- `style/components/replay-modal.css` is no longer an active file.
- Rejoining the replacement files matches the original source exactly.
- Build, unit, and page smoke validation pass after the split.

## Non-Goals

- Do not redesign replay controls or modals.
- Do not rename classes, ids, or JavaScript selectors.
- Do not narrow the global range input selector in this batch.
- Do not add tokens or reduce `!important` in this batch.
