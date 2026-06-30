# CSS Continuation Optimization Plan

## Goal

Continue reducing CSS maintenance risk after the `main.css`, mobile responsive, and settings modal splits, while keeping runtime visuals and behavior unchanged.

## Current State

- `style/main.css` is an import-only manifest.
- The main-entry layer is split into base, layout, components, responsive, preferences, effects, and tokens directories.
- Completed structural passes:
  - shared logo/timer inline cleanup
  - `main.css` decomposition
  - `mobile-legacy.css` responsive split
  - `settings-modal.css` component split
  - `top-actions.css` component split
  - `mobile-shell.css` responsive split
  - `board-tiles.css` component split
  - `night-background.css` preference split
  - `classic-mobile.css` responsive split
- Largest imported main-entry files now:
  - `style/components/portal.css`: 352 lines.
  - `style/components/replay-modal.css`: 314 lines.
  - `style/responsive/mobile-narrow.css`: 287 lines.
  - `style/effects/flying-click.css`: 283 lines.
  - `style/components/settings-switches.css`: 235 lines.
- Largest standalone page CSS files still remain:
  - `style/palette_page.css`: 1,039 lines.
  - `style/account_page.css`: 817 lines.
  - `style/stone_2k_monitor.css`: 761 lines.
  - `style/admin_page.css`: 687 lines.
  - `style/replay_page_rebuild.css`: 596 lines.

## Non-Goals

- Do not add a new visual theme in this cleanup.
- Do not add theme switching.
- Do not introduce Sass, PostCSS, Tailwind, or a new build step.
- Do not change HTML links to `style/main.css`.
- Do not rewrite selectors or values during mechanical file splits.
- Do not remove runtime state inline styles unless the owning script changes in the same focused task.
- Do not touch backend, API authority, account authority, leaderboard authority, replay verification, or ranked session behavior.

## Phase 1: Finish Imported Main-Entry Stabilization

Target: make the active `main.css` import graph readable by ownership and keep the largest imported files below roughly 350-450 lines where practical.

Order:

1. `style/components/top-actions.css` - completed
   - Split by contiguous button base, icon baseline, per-icon motion groups, and reduced-motion overrides.
   - Verification: build, unit, full page smoke.
2. `style/responsive/mobile-shell.css` - completed
   - Split by page family: game, replay, practice/timerbox, modes/history.
   - Preserve breakpoint order; avoid merging media queries.
3. `style/components/board-tiles.css` - completed
   - Split by grid geometry, tile positions, tile colors, tile animations.
   - Add/keep CSS contract tests that read transitive `main.css` imports.
4. `style/preferences/night-background.css` - completed
   - Split by document/global, board/timer, modals/settings, portal/history, practice surfaces.
   - Verify night-mode smoke paths after each split.
5. `style/responsive/classic-mobile.css` - completed
   - Split only after board tile geometry is stable, because both affect mobile board sizing.
6. `style/components/portal.css`
   - Split into portal shell/cards/actions/history-list only after history smoke coverage remains green.

## Phase 2: Page-Level CSS Decomposition

Target: reduce standalone page CSS files that are still over 500 lines.

Order:

1. `style/palette_page.css`
   - Candidate split: page shell, theme form, custom select, preview grid, palette editor, night overrides.
2. `style/account_page.css`
   - Candidate split: account shell, auth forms, leaderboard card/table, responsive/night surfaces.
3. `style/stone_2k_monitor.css`
   - Candidate split: page shell, filters, tables, status badges, responsive states.
4. `style/admin_page.css`
   - Candidate split: admin shell, rescue tools, beta access, achievement management, tables/forms.
5. `style/replay_page_rebuild.css`
   - Candidate split: replay page shell, controls, stats, import states, responsive layout.

Each page-level split must preserve the page's existing stylesheet link unless the page already has a safe page-level import manifest pattern.

## Phase 3: Inline Style Governance

Target: distinguish static presentation debt from runtime state hooks.

Steps:

1. Refresh `style/docs/css-inventory.md` with current inline `<style>` and `style=""` counts.
2. Keep runtime state hooks such as `display: none` unless the owning JS is changed.
3. Migrate high-confidence static inline styles in small batches:
   - history portal spacing
   - practice fixed score layout
   - utility page embedded styles
4. Run targeted smoke for each touched page.

## Phase 4: Semantic Token Expansion

Target: prepare stable component surfaces for future theming without introducing any new theme.

Rules:

1. Create tokens only from repeated existing values.
2. Replace repeated values one owner file at a time.
3. Keep names semantic, not page-specific.
4. Do not token-replace values inside still-large files before their ownership split is stable.

Candidate token groups:

- text colors
- muted text colors
- page surfaces
- component surfaces
- border colors
- focus rings
- button surfaces
- shadow presets
- spacing/radius values used across board, timer, top actions, and modals

## Phase 5: Specificity And `!important` Reduction

Target: reduce override pressure only after file ownership is stable.

Order:

1. Recount `!important` by file.
2. Start with component files where stable classes already exist.
3. Avoid runtime selectors used by JS state toggles.
4. Replace one override group at a time.
5. Verify with build, unit, and targeted smoke before continuing.

## Phase 6: Future Theme Readiness Gate

Target: define readiness criteria for future visual theme work without implementing it in this cleanup.

Readiness criteria:

- `main.css` remains import-only.
- Imported main-entry files have clear ownership and stable import order.
- Top page CSS files have either been split or explicitly documented as page-owned.
- Static inline presentation debt is separated from runtime state hooks.
- Tokens exist for repeated shared surfaces, borders, text, shadows, radii, and focus rings.
- Full smoke passes after structural work.

## Rolling Verification Standard

For each structural split:

```bash
npm run build
npm run test:unit -- <targeted unit/css contract tests>
npm run test:smoke:pages
```

Vite proxy `ECONNREFUSED 127.0.0.1:3000` messages are expected when no local backend is running as long as Playwright assertions pass.

## Current Action

Phase 1, Step 5 split is complete. Finish validation for that batch, then execute Phase 1, Step 6: split `style/components/portal.css` mechanically while preserving import order.
