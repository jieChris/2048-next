# CSS Maintenance Debt PRD

## Goal

Resolve the remaining CSS maintenance debt after the final-maintenance pass without changing visuals, behavior, build tooling, or theme/runtime authority.

## Scope

- Split the remaining standalone runtime CSS files that are large enough to carry ongoing maintenance risk:
  - `style/achievements_page.css`
  - `style/ui-preview.css`
  - `style/user_profile_page.css`
  - `style/beta_access.css`
- Move safe page-owned embedded `<style>` blocks into page-owned CSS files when doing so does not require JavaScript behavior changes.
- Keep existing HTML stylesheet entry points stable where possible; when embedded styles are moved, add only page-specific CSS links.
- Update CSS inventory and Trellis implementation notes.

## Non-Goals

- Do not add or design a new theme.
- Do not add theme switching.
- Do not change game, account, leaderboard, replay, ranked session, API, or backend behavior.
- Do not rewrite selectors or declarations during mechanical splits.
- Do not remove runtime `style=""` hooks.
- Do not introduce Sass, PostCSS, Tailwind, or any new CSS build step.

## Acceptance Criteria

- The four large standalone CSS files become import-only manifests or are explicitly documented if a file is intentionally retained.
- Page-owned split files live under clear ownership directories under `style/pages` or `style/utility`.
- Migrated embedded styles keep selector text, declaration text, media query bodies, and cascade order intact.
- HTML changes are limited to page-specific stylesheet links needed for migrated embedded styles.
- `style/main.css` remains an import-only manifest.
- Final verification includes build, unit, and relevant page smoke evidence.
