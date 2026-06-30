# Night Background CSS Split PRD

## Goal

Split `style/preferences/night-background.css` into focused preference-owned CSS files without changing night-mode visuals, behavior, selectors, declarations, or import order.

## Acceptance Criteria

- `style/main.css` keeps the night preference rules at the same cascade position.
- The old single `preferences/night-background.css` import is replaced by ordered focused imports.
- The mechanical rejoin of replacement files matches the original rule order.
- No new theme, theme switcher, build-chain change, JavaScript edit, backend edit, or HTML stylesheet link change is introduced.
- Build, unit CSS/runtime checks, and page smoke pass.
