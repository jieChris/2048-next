# Settings Modal CSS Split PRD

## Goal

Split `style/components/settings-modal.css` into smaller component-owned files while preserving the current runtime visuals and cascade order.

## User Value

The settings modal stylesheet currently mixes base modal layout, announcements, toolkit entry buttons, toggle switches, language controls, custom theme selector, preview grids, tile palette editor, and mobile overrides. Splitting these concerns makes later maintenance safer and keeps future theme work from depending on a single large mixed file.

## Requirements

- Keep current visuals functionally unchanged.
- Do not add a new visual theme or theme switcher.
- Do not introduce Sass, PostCSS, Tailwind, or any new build step.
- Keep HTML references to `style/main.css` unchanged.
- Preserve the existing cascade order by replacing the single import with ordered imports.
- Move CSS mechanically: do not rename selectors, rewrite values, or simplify specificity in this task.
- Keep the existing board theme manager contract untouched.
- Do not edit JavaScript or backend/API code.
- Do not revert existing user or previous dirty worktree changes.

## Acceptance Criteria

- `style/components/settings-modal.css` is no longer an active imported file.
- New component files have clear ownership names and are imported from `style/main.css`.
- The single settings-modal import is replaced with ordered imports at the same manifest position.
- `style/docs/css-inventory.md` reflects the new component layout and line counts.
- The next optimization plan is updated so the completed split is not listed as pending work.
- `npm run build` passes.
- Unit/CSS contract tests pass.
- Page smoke tests pass or any failure is clearly tied to an existing unrelated environment issue.

## Out Of Scope

- New visual theme design.
- Theme switching UI.
- Inline `<style>` extraction.
- Selector renaming or specificity cleanup.
- JavaScript settings-modal behavior changes.
- Any backend or cross-repo authority work.

## Risks

- Settings modal rules are shared across multiple game-family pages, home settings, timer module settings, language controls, and toolkit entries.
- The file contains mobile overrides in two separate locations; moving them together would alter cascade order.
- Existing dirty changes include unrelated logo, HTML, output, and test files; this task must work around them without reverting.

## Non-Blocking Assumptions

- A conservative contiguous-slice split is safer than grouping all mobile overrides together.
- Fine-grained selector cleanup should happen after this mechanical split is verified.
