# CSS Architecture Optimization PRD

## Goal

Improve the maintainability of the current `2048-next` CSS architecture without changing the current product visuals and without adding any new visual theme.

## User Value

Future visual work should not require editing or overriding dozens of page files. Shared UI surfaces, buttons, logos, panels, forms, modals, and layout primitives should have stable CSS ownership so a future theme can be added after this structural cleanup.

## Confirmed Facts

- The production Vite entry list includes 27 HTML inputs in `vite.config.ts`; `public/easter-eggs/breakout/index.html` is a separate production page.
- `ranked_seed_validator.html` is a development page and is not part of the Vite build input.
- Runtime CSS in `style/*.css` is about 12,432 lines.
- `style/main.css` is the largest runtime stylesheet at 6,476 lines.
- `style/main.scss` exists, but `package.json` has no Sass build script. Runtime HTML links to `style/main.css`.
- There are multiple HTML inline `<style>` blocks and many static `style=""` attributes.
- Existing board themes are managed by `js/theme_manager.js`, which writes `data-theme` for board theme ids. This cleanup must not reuse or repurpose `data-theme`.
- This task does not touch API, account authority, backend persistence, leaderboard authority, replay verification, or ranked session behavior.

## Requirements

- Keep the current visual appearance functionally unchanged.
- Do not add a new visual theme or a theme toggle in this task.
- Treat `style/main.css` as the runtime source unless a later task explicitly introduces a Sass build path.
- Add CSS organization that can be adopted incrementally without forcing a full rewrite.
- Prefer stable semantic CSS variables and utility/component classes over page-level duplication.
- Remove only low-risk static inline presentation styles in the first implementation pass.
- Leave dynamic runtime inline styles alone when scripts intentionally toggle visibility, dimensions, or runtime state.
- Do not modify backend or cross-repo API boundaries.

## Acceptance Criteria

- A Trellis task contains this PRD plus design and implementation planning.
- The repo has an explicit CSS inventory or audit document for current line counts, inline style pressure, and migration priorities.
- Shared CSS token and component-layer files exist and are imported by `style/main.css`.
- At least one repeated static inline style family is migrated to CSS classes without changing visuals.
- Existing dirty user changes are not reverted.
- `npm run build` succeeds.
- Targeted unit or smoke coverage for affected page markup/assets is run when practical.

## Out Of Scope

- New visual theme design.
- Theme switch UI.
- New logo rollout.
- Rewriting every page stylesheet.
- Replacing the existing board theme system.
- Reworking Sass/build tooling.
- Any backend, database, auth, replay verification, or API authority changes.

## Open Questions

- None blocking. The user explicitly requested implementation under goal mode.
