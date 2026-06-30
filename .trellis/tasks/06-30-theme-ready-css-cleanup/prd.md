# Theme-Ready CSS Cleanup PRD

## Goal

Prepare the current CSS and DOM state structure for a future separate visual theme without adding that theme now, without changing visuals or behavior, and without adding CSS build tooling.

## Scope

- Replace high-confidence static `style="display: none"` HTML state hooks with class or attribute based state.
- Update the owning JavaScript only where required to preserve current runtime behavior.
- Add theme-ready semantic tokens for existing visual values only.
- Reduce low-risk `!important` pressure where a stable owner selector or state boundary already exists.
- Document theme boundary rules and add guardrail tests for future maintainability.

## Non-Goals

- Do not add a Liquid Glass theme or any new visual theme.
- Do not add a theme switcher.
- Do not change runtime visuals, layout, or user-facing behavior.
- Do not introduce Sass, PostCSS, Tailwind, or a new CSS build step.
- Do not change API, account authority, leaderboard authority, replay verification, ranked sessions, or backend behavior.

## Acceptance Criteria

- Non-ignored HTML files no longer use `style="display: none"` for static initial visibility where a class or attribute is safe.
- Remaining inline styles, if any, are explicitly documented as script-owned runtime values that cannot be safely removed in this pass.
- Existing modal, replay, account captcha, and settings flows continue to work.
- New tokens only alias current values and do not alter visual output.
- `!important` reductions are limited to low-risk owner CSS with smoke or unit coverage.
- CSS inventory documents the new theme boundary and guardrails.
- Final verification includes build, unit, targeted smoke, full page smoke, CSS import checks, and inline-style inventory checks.
