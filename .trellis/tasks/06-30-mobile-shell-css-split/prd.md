# Mobile Shell CSS Split PRD

## Goal

Split `style/responsive/mobile-shell.css` into smaller responsive ownership files while preserving current runtime visuals, cascade order, and mobile behavior.

## Background

`style/main.css` is already an import-only manifest. After the top-actions split, `style/responsive/mobile-shell.css` is the largest imported main-entry file at 484 lines. It owns the broad `max-width: 980px` shell rules for game, replay, practice, modes, and history pages, plus shared mobile timerbox and hint/undo controls.

This file is stable enough for a mechanical split, but it is too broad for later maintenance because unrelated page families currently share one large media block.

## Requirements

- Preserve every selector and declaration value.
- Preserve effective cascade order.
- Keep all split files under the existing `style/responsive/` layer.
- Keep HTML links unchanged; pages must continue loading `style/main.css`.
- Update inventory and roadmap documents after the split.
- Run build, targeted unit tests, and full page smoke tests.

## Non-Goals

- Do not add a visual theme.
- Do not add theme switching.
- Do not rewrite selectors or reduce `!important` in this task.
- Do not merge or reorder unrelated responsive rules.
- Do not edit JavaScript, backend code, account flows, leaderboard logic, replay verification, or ranked session behavior.

## Acceptance Criteria

- `style/responsive/mobile-shell.css` is no longer an active imported file.
- `style/main.css` imports the replacement files in the same location as the old file.
- All imported CSS files exist.
- `style/main.css` remains import-only with no direct style rules.
- Documentation records the new file layout and next optimization target.
- Verification commands pass.

## Risks

- Splitting a single media block into multiple same-condition media blocks can alter behavior only if import order changes; the replacement imports must remain in original source order.
- Mobile game/practice timerbox and hint/undo controls are shared across page types, so they should stay in an ordered shared-controls slice rather than being duplicated.
