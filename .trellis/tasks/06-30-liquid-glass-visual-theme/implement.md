# Liquid Glass Visual Theme Implementation Plan

## Guardrails

- Do not implement during planning approval.
- Keep classic visuals unchanged.
- Keep visual theme separate from color scheme.
- Keep board palette separate from global visual theme.
- Do not touch API, account authority, leaderboard authority, replay verification, ranked session, or backend behavior.
- Do not add CSS build tooling.
- Use screenshots and computed-style checks before claiming full coverage.

## Phase Checklist

- [x] Phase 0: Freeze baseline and create theme coverage inventory.
- [x] Phase 1: Add shared visual-theme state model with no visual output changes.
- [x] Phase 2: Add Liquid Glass token scaffolding for day and night.
- [x] Phase 3: Apply Liquid Glass to core game surfaces and controls in `2048-next-logo-work`.
- [x] Phase 4: Apply Liquid Glass to modals, dialogs, guides, replay, settings, and runtime overlays.
- [ ] Phase 5: Apply Liquid Glass to all page-owned and utility CSS in `2048-next-logo-work`.
- [ ] Phase 6: Add `2048-ranked` visual-theme axis and Liquid Glass token/style layer.
- [ ] Phase 7: Add accessibility, transparency, and performance fallbacks.
- [ ] Phase 8: Add docs, tests, screenshot coverage, and final verification.

## Phase 0: Baseline and Inventory

Status:

- Coverage inventory recorded in `coverage-inventory.md`.
- Screenshot capture is deferred until Phase 2 because Phase 1 intentionally has no visual output change.

Tasks:

- Record current `classic light` and current night-background visual screenshots for key pages.
- Inventory selectors that currently use hard-coded backgrounds, borders, shadows, and text colors.
- Inventory dynamic runtime style injection from `js/theme_manager.js`.
- Define the page matrix for screenshots:
  - desktop 1440x1000
  - mobile 390x844
  - `classic light`, `classic dark/night`, `liquid-glass light`, `liquid-glass dark`

Validation:

- `npm run build`
- `npm run test:unit`
- current smoke baseline for key pages

## Phase 1: Theme State, Persistence, and Controls

Status:

- `2048-next-logo-work` now writes first-paint root attributes from `public/js/core_night_mode_preload.js`.
- State helpers live in `src/bootstrap/visual-theme-state.ts`.
- Settings modal exposes visual theme and color scheme controls while keeping the legacy night-background toggle.
- `classic` remains the default visual theme.

`2048-next-logo-work`:

- Add preload/runtime helpers that set:
  - `data-visual-theme`
  - `data-color-scheme`
  - `data-resolved-color-scheme`
- Add settings UI controls:
  - visual theme: Classic / Liquid Glass
  - color scheme: System / Day / Night
- Keep existing night-background toggle as compatibility until migrated.

`2048-ranked`:

- Add `src/lib/visual-theme.ts`.
- Add `src/lib/visual-theme.server.ts`.
- Add `src/components/visual-theme-toggle.tsx`.
- Update `src/app/layout.tsx` pre-paint script to set `data-visual-theme`.
- Keep `ColorScheme` unchanged.

Tests:

- Unit tests for value validation.
- Runtime tests for pre-paint attribute setting.
- Smoke tests for persistence across reload.

## Phase 2: Token Scaffolding

Status:

- Theme imports are wired from `style/main.css`.
- Liquid Glass day/night tokens live under `style/themes/liquid-glass/`.
- Token overrides are gated by `html[data-visual-theme="liquid-glass"]` and `data-resolved-color-scheme`.
- No page-level Liquid Glass selectors have been added yet.

`2048-next-logo-work`:

- Add `style/themes/visual-theme-state.css`.
- Add Liquid Glass day/night token files.
- Import theme files from `style/main.css`.
- Add guardrail tests that all theme files resolve.

`2048-ranked`:

- Add Liquid Glass variable branches under `html[data-visual-theme="liquid-glass"]`.
- Keep Tailwind token names mapped to CSS variables.

Validation:

- Computed values change only when Liquid Glass is active.
- Classic computed values remain unchanged.

## Phase 3: Core Game Coverage

Status:

- Core Liquid Glass imports are wired from `style/main.css`.
- Core layers live in:
  - `style/themes/liquid-glass/surfaces.css`
  - `style/themes/liquid-glass/controls.css`
  - `style/themes/liquid-glass/game.css`
- Core selectors are gated under `html[data-visual-theme="liquid-glass"]`.
- Guardrail tests verify core game theme imports, no unguarded board selectors, and stable board sizing declarations.
- Latest verification before Phase 4:
  - `npm run build`
  - `npm run test:unit`
  - `PW_WEB_PORT=4176 npm run test:smoke:index-ui`

Apply Liquid Glass to:

- document/page background
- container shell
- score/best cards
- top action buttons
- board shell/grid/tile interiors
- timerbox/timer leaderboard
- mobile controls

Rules:

- Do not change board dimensions.
- Use `box-sizing: border-box` where adding borders.
- Limit `backdrop-filter` to bounded surfaces.

Tests:

- Unit CSS guardrails for board size-affecting declarations.
- Smoke screenshots for `2048.html`, `play.html`, `capped_2048.html`, `undo_2048.html`, `Practice_board.html`, `PKU2048.html`.

## Phase 4: Runtime Overlays

Status:

- Runtime overlay theme layer is wired from `style/main.css` after `components/game-dialog.css`.
- Overlay styles live in `style/themes/liquid-glass/modals.css`.
- Covered overlay families:
  - replay/settings/announcement/mobile hint modal shells
  - settings rows, switches, selects, custom select dropdowns, notes, tile palette settings
  - replay import textarea and modal buttons through shared controls
  - announcement cards, pin badges, links, empty states
  - game message win/loss overlay
  - game dialog panel, inputs, buttons, danger state
  - home guide overlay/panel/highlight
  - mode intro copy and leaderboard rows
- Guardrail tests require the modal theme layer to be imported after base dialog CSS and require key selectors to be gated under `html[data-visual-theme="liquid-glass"]`.
- Latest targeted verification:
  - `npx vitest run tests/unit/theme-ready-css-maintenance.spec.ts`
  - `npx vitest run tests/unit/bootstrap-settings-modal-page-host.spec.ts tests/unit/bootstrap-replay-modal.spec.ts tests/unit/bootstrap-replay-modal-runtime.spec.ts tests/unit/bootstrap-play-challenge-intro-host.spec.ts`

Apply Liquid Glass to:

- settings modal
- replay modal/export modal/import modal
- announcement modal
- game message/dialog
- mobile hint modal
- challenge intro modal
- guide overlays

Tests:

- Existing modal tests must pass.
- Computed `display` state must still use `.is-hidden`/owner classes.
- Overlay click, close button, copy/export, replay import flows remain covered by smoke.

## Phase 5: Page-Owned and Utility Coverage

Apply page-level Liquid Glass layers to:

- account
- history
- replay page
- modes
- palette
- achievements
- admin
- beta access
- user profile
- stone monitor
- relay 5x5
- cache reset
- favicon preview
- ranked seed validator
- UI preview
- API docs

Strategy:

- First use shared component tokens.
- Add page-specific Liquid Glass selectors only where a page owns unique structures.
- Keep focused files under the current soft 250-line budget.

Tests:

- Existing page smoke.
- Screenshot matrix for representative pages.
- Structure scan remains zero inline style and zero `<style>` blocks.

## Phase 6: `2048-ranked`

Add:

- visual theme cookie and server reader
- visual theme toggle
- layout root attribute
- Liquid Glass CSS variable branch
- component-level glass classes for header/footer/cards/tables/forms/admin panels

Convert only blocking hard-coded Tailwind color utilities:

- status/feedback colors may remain semantic if contrast is verified
- broad `bg-*`, `border-*`, `dark:*` utility usage should move to CSS variables when it prevents complete theme replacement

Tests:

- Next build/type-check.
- Component or route smoke if available.
- Manual screenshot matrix for public, auth, leaderboard, admin, loading/error states.

## Phase 7: Fallbacks

Add fallbacks for:

- `@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))`
- `@media (prefers-reduced-motion: reduce)`
- `@media (prefers-reduced-transparency: reduce)`
- `@media (forced-colors: active)`

Expected behavior:

- Glass becomes opaque/semi-opaque.
- Shadows and blur reduce.
- Focus rings remain visible.
- No layout change.

## Phase 8: Final Verification

Required commands for `2048-next-logo-work`:

- `npm run build`
- `npm run test:unit`
- `npm run test:smoke:pages`
- `npm run test:refactor-contract`
- `git diff --check`
- structure scans for inline styles and `<style>` blocks

Required checks for `2048-ranked`:

- install/build command from its package scripts
- type-check/lint/test command from its package scripts
- screenshot matrix across public/auth/admin pages

Manual review checklist:

- Day and night both feel like the same Liquid Glass system.
- Classic remains visually unchanged.
- Switching themes does not reset board palette or account/session state.
- Mobile board remains correctly sized.
- Tables, modals, and sticky headers remain readable.
- Unsupported blur fallback is acceptable.

## Recommended Execution Order

Implement in small goals:

1. State model only.
2. `2048-next-logo-work` core game Liquid Glass.
3. `2048-next-logo-work` secondary pages and fallbacks.
4. `2048-ranked` visual-theme axis and Liquid Glass layer.
5. Full screenshot and performance hardening.

Do not start phase 3 until phase 1 and phase 2 are verified. Do not start `2048-ranked` styling until the shared token naming is stable in `2048-next-logo-work`.
