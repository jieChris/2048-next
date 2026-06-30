# Top Actions CSS Split PRD

## Goal

Split `style/components/top-actions.css` into smaller top-action ownership files while preserving current runtime visuals, motion behavior, and cascade order.

## User Value

Top action controls are shared across game and practice pages and include button base styles, unread badges, generic SVG hover behavior, per-icon motion groups, and reduced-motion overrides. Splitting them makes future maintenance safer and prevents one motion-heavy file from becoming the next large CSS bottleneck.

## Requirements

- Keep current visuals functionally unchanged.
- Do not add a new visual theme or theme switcher.
- Do not introduce Sass, PostCSS, Tailwind, or any new build step.
- Keep HTML references to `style/main.css` unchanged.
- Preserve the existing cascade order by replacing the single import with ordered imports.
- Move CSS mechanically: do not rename selectors, rewrite values, or simplify specificity in this task.
- Keep reduced-motion rules after the motion rules they override.
- Do not edit JavaScript or backend/API code.
- Do not revert existing user or previous dirty worktree changes.

## Acceptance Criteria

- `style/components/top-actions.css` is no longer an active imported file.
- New component files have clear ownership names and are imported from `style/main.css`.
- The single top-actions import is replaced with ordered imports at the same manifest position.
- `style/docs/css-inventory.md` reflects the new component layout and line counts.
- The next optimization plan is updated so the completed split is not listed as pending work.
- `npm run build` passes.
- Unit/CSS contract tests pass.
- Page smoke tests pass or any failure is clearly tied to an existing unrelated environment issue.

## Out Of Scope

- New visual theme design.
- Theme switching UI.
- Motion redesign.
- Selector renaming or specificity cleanup.
- JavaScript top-action behavior changes.
- Any backend or cross-repo authority work.

## Risks

- Motion rules rely on keyframes and hover/focus selectors staying in order.
- Reduced-motion overrides must remain after all referenced motion declarations.
- Existing dirty changes include unrelated logo, HTML, output, and test files; this task must work around them without reverting.

## Non-Blocking Assumptions

- A conservative contiguous-slice split is safer than grouping all similar selectors together.
- Fine-grained selector cleanup should happen after this mechanical split is verified.
