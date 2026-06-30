# Main CSS Decomposition PRD

## Goal

Decompose `style/main.css` into maintainable CSS layers while keeping `style/main.css` as the only HTML-linked runtime entry.

## User Value

Future CSS work should be able to change shared layout, components, page-specific surfaces, and visual preferences without editing a single 6k-line stylesheet. A later visual theme can then target clear ownership boundaries instead of fighting scattered legacy selectors.

## Requirements

- Keep current visuals functionally unchanged.
- Do not add a new visual theme or theme switcher.
- Do not introduce Sass, PostCSS, Tailwind, or any new build step.
- Keep HTML references to `style/main.css` unchanged.
- Preserve the existing cascade order as much as possible.
- Split by ownership into small files with clear responsibilities.
- Keep `style/main.css` import-only at the end of this task.
- Keep the existing board theme manager contract untouched.
- Keep runtime inline styles untouched unless explicitly covered by a later focused task.
- Do not touch backend, API, account authority, replay verification, leaderboard authority, or ranked session behavior.
- Do not revert existing user/previous dirty worktree changes.

## Acceptance Criteria

- A Trellis task documents the decomposition plan and validation results.
- `style/main.css` contains only `@import` statements and comments, with no direct style rules.
- New CSS files are grouped by stable ownership.
- The final import order is documented.
- `style/docs/css-inventory.md` is updated with the new file layout and remaining risks.
- `npm run build` passes.
- Unit tests covering HTML/CSS asset assumptions pass.
- Page smoke tests pass or any failure is clearly tied to an existing unrelated environment issue.
- A next-step optimization plan is written after the split is complete.

## Out Of Scope

- New visual theme design.
- Theme switching UI.
- Inline `<style>` extraction outside the files touched by this decomposition.
- Selector renaming or large semantic refactors.
- Reducing `!important` by changing specificity.
- Replacing direct CSS with Sass or another preprocessor.
- Any backend or cross-repo authority work.

## Risks

- CSS cascade changes can subtly affect board layout, mobile controls, modal overlays, or night-background preference styling.
- Splitting media queries can make future debugging harder if file responsibility is unclear.
- Existing dirty changes include logo and preview work; this task must work around them without reverting.

## Non-Blocking Assumptions

- Mechanical movement that preserves selector order is safer than opportunistic selector cleanup.
- Fine-grained semantic cleanup should happen after this file split is verified.
