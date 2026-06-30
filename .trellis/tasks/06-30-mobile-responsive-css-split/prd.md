# Mobile Responsive CSS Split PRD

## Goal

Split `style/responsive/mobile-legacy.css` into smaller responsive ownership files while preserving the current runtime visuals and cascade order.

## User Value

Future CSS maintenance should not require scanning one mixed 987-line responsive file for game, replay, practice, modes, history, scoreboard, and touch-device overrides. Smaller files make later page-specific cleanup and theme work easier to plan without coupling unrelated mobile rules.

## Requirements

- Keep current visuals functionally unchanged.
- Do not add a new visual theme or theme switcher.
- Do not introduce Sass, PostCSS, Tailwind, or any new build step.
- Keep HTML references to `style/main.css` unchanged.
- Preserve the existing cascade order by replacing the single import with ordered imports.
- Move CSS mechanically: do not rename selectors, rewrite values, or simplify specificity in this task.
- Keep the existing board theme manager contract untouched.
- Do not touch backend, API, account authority, replay verification, leaderboard authority, or ranked session behavior.
- Do not revert existing user or previous dirty worktree changes.

## Acceptance Criteria

- `style/responsive/mobile-legacy.css` no longer remains as the largest active imported responsive file.
- New responsive files have clear ownership names and are imported from `style/main.css`.
- The single legacy import is replaced with ordered imports at the same manifest position.
- `style/docs/css-inventory.md` reflects the new responsive layout and line counts.
- The next optimization plan is updated so the completed split is not listed as pending work.
- `npm run build` passes.
- CSS contract/unit tests pass.
- Page smoke tests pass or any failure is clearly tied to an existing unrelated environment issue.

## Out Of Scope

- New visual theme design.
- Theme switching UI.
- Inline `<style>` extraction.
- Selector renaming or specificity cleanup.
- Moving page-specific runtime behavior into JS.
- Any backend or cross-repo authority work.

## Risks

- Responsive rules are highly order-sensitive; moving a block to the wrong import position can alter mobile layout.
- Some broad breakpoint files intentionally contain multiple page selectors. Over-splitting inside a media block could make cascade debugging harder.
- Existing dirty changes include unrelated logo, HTML, output, and test files; this task must work around them without reverting.

## Non-Blocking Assumptions

- A conservative contiguous-slice split is safer than immediately separating every page selector.
- Fine-grained responsive cleanup should happen after this mechanical split is verified.
