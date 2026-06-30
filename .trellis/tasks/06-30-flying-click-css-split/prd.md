# Flying Click CSS Split PRD

## Goal

Split `style/effects/flying-click.css` into focused effect files while preserving the existing flying-click animation behavior.

## Acceptance Criteria

- `style/main.css` replaces the single `effects/flying-click.css` import with ordered focused imports at the same location.
- Selectors, declarations, keyframes, reduced-motion rules, priority flags, and source order are preserved.
- `style/effects/flying-click.css` is no longer an active file.
- Rejoining the replacement files matches the original source exactly.
- Build, unit, and page smoke validation pass after the split.

## Non-Goals

- Do not redesign or retime the effect.
- Do not rewrite keyframes.
- Do not remove priority flags.
- Do not touch JavaScript, HTML links, or build tooling.
