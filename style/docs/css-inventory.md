# CSS Inventory

Last updated: 2026-06-30.

## Runtime CSS Files

The HTML pages link runtime CSS directly. `style/main.scss` exists, but `package.json` does not define a Sass build command, so `style/main.css` remains the operational entry stylesheet.

| File | Lines |
| --- | ---: |
| `style/api_docs.css` | 244 |
| `style/account_settings_page.css` | 165 |
| `style/main.css` | 97 |
| `style/register_page.css` | 85 |
| `style/password_page.css` | 58 |
| `style/fonts/clear-sans.css` | 32 |
| `style/palette_page.css` | 8 |
| `style/account_page.css` | 6 |
| `style/stone_2k_monitor.css` | 6 |
| `style/replay_page_rebuild.css` | 6 |
| `style/ui-preview.css` | 5 |
| `style/achievements_page.css` | 5 |
| `style/admin_page.css` | 5 |
| `style/user_profile_page.css` | 4 |
| `style/beta_access.css` | 3 |

Total top-level runtime CSS under `style/*.css`: 697 lines after `main.css`, page entries, utility entries, and the remaining standalone page entries became import manifests. The imported main-entry layer is split across `style/base`, `style/layout`, `style/components`, `style/responsive`, `style/preferences`, `style/effects`, and `style/tokens`. Page-owned CSS lives under `style/pages`; utility and development page CSS lives under `style/utility`.

## Imported `main.css` Layers

| Area | Files | Lines |
| --- | ---: | ---: |
| `style/base` | 2 | 137 |
| `style/layout` | 1 | 93 |
| `style/components` | 57 | 4,116 |
| `style/responsive` | 23 | 1,415 |
| `style/preferences` | 7 | 377 |
| `style/effects` | 5 | 349 |
| `style/tokens` | 1 | 25 |
| `style/main.css` import manifest | 1 | 97 |

Largest remaining focused files:

- `style/api_docs.css`: 244 lines.
- `style/components/settings-switches.css`: 234 lines.
- `style/pages/palette/palette-picker-popover.css`: 231 lines.
- `style/utility/ranked-seed-validator/foundation-form.css`: 230 lines.
- `style/pages/admin/admin-shell-forms.css`: 221 lines.
- `style/pages/account/account-auth.css`: 221 lines.
- `style/pages/palette/palette-theme-controls.css`: 220 lines.
- `style/components/timer-leaderboard.css`: 214 lines.
- `style/pages/practice-board/dialogs-mode.css`: 201 lines.
- `style/pages/stone-monitor/stone-foundation-access.css`: 200 lines.

## Page-Owned CSS Layer

| Area | Files | Lines |
| --- | ---: | ---: |
| `style/pages/account` | 6 | 817 |
| `style/pages/achievements` | 5 | 435 |
| `style/pages/admin` | 5 | 686 |
| `style/pages/beta-access` | 3 | 291 |
| `style/pages/capped-2048` | 1 | 83 |
| `style/pages/index-test` | 1 | 41 |
| `style/pages/modes` | 5 | 519 |
| `style/pages/palette` | 8 | 1,041 |
| `style/pages/pku2048` | 6 | 444 |
| `style/pages/practice-board` | 8 | 603 |
| `style/pages/relay-5x5` | 6 | 564 |
| `style/pages/replay` | 6 | 593 |
| `style/pages/stone-monitor` | 6 | 760 |
| `style/pages/user-profile` | 4 | 358 |
| `style/pages` total | 70 | 7,235 |

## Utility CSS Layer

| Area | Files | Lines |
| --- | ---: | ---: |
| `style/utility/cache-reset` | 1 | 19 |
| `style/utility/favicon-preview` | 1 | 139 |
| `style/utility/ranked-seed-validator` | 5 | 374 |
| `style/utility/ui-preview` | 5 | 375 |
| `style/utility` total | 12 | 907 |

## Inline Style Pressure

The current non-ignored HTML pages contain no remaining `<style>` blocks and no remaining `style=""` attributes. Static initial hidden state now uses `.is-hidden`, backed by `style/base/state.css`.

| File | `<style>` blocks | `style=""` attrs | Notes |
| --- | ---: | ---: | --- |
| `2048.html` | 0 | 0 | Replay/settings/announcement initial visibility uses `.is-hidden`. |
| `play.html` | 0 | 0 | Top intro and modal initial visibility uses `.is-hidden`. |
| `undo_2048.html` | 0 | 0 | Replay/settings initial visibility uses `.is-hidden`. |
| `index_test.html` | 0 | 0 | Page CSS moved to `style/pages/index-test/page.css`; modal initial visibility uses `.is-hidden`. |
| `Practice_board.html` | 0 | 0 | Page CSS moved to `style/pages/practice-board/page.css`; settings initial visibility uses `.is-hidden`. |
| `PKU2048.html` | 0 | 0 | Page CSS moved to `style/pages/pku2048/page.css`; settings initial visibility uses `.is-hidden`. |
| `capped_2048.html` | 0 | 0 | Replay/settings initial visibility uses `.is-hidden`. |
| `replay.html` | 0 | 0 | Replay import, modal, diagnostics, and drag overlay initial visibility uses `.is-hidden`. |
| `account.html` | 0 | 0 | Login captcha initial visibility uses `.is-hidden`. |
| `relay_5x5.html` | 0 | 0 | Page CSS moved to `style/pages/relay-5x5/page.css`. |
| `modes.html` | 0 | 0 | Page CSS moved to `style/pages/modes/page.css`. |
| `favicon-preview.html` | 0 | 0 | Utility CSS moved to `style/utility/favicon-preview/page.css`. |
| `cache-reset.html` | 0 | 0 | Utility CSS moved to `style/utility/cache-reset/page.css`. |
| `ranked_seed_validator.html` | 0 | 0 | Development utility CSS moved to `style/utility/ranked-seed-validator/page.css`. |

The current full non-ignored HTML scan reports zero static `style="display: none"` hooks and zero `style=""` attributes. Runtime-owned dynamic display writes still exist in JavaScript where they encode script-owned layout state outside this cleanup scope.

## `!important` Pressure

Most `!important` usage now lives in the responsive compatibility layer, low-performance tile overrides, dynamic theme priority boundaries, and explicit state suppression. This cleanup reduced the visible CSS count from 199 to 192 while adding a guarded state utility that can beat dynamic theme button display rules.

| File | `!important` count |
| --- | ---: |
| `style/responsive/mobile-shell-secondary-pages.css` | 12 |
| `style/responsive/mobile-home-actions.css` | 12 |
| `style/pages/pku2048/board-foundation.css` | 11 |
| `style/pages/practice-board/board-foundation.css` | 11 |
| `style/responsive/mobile-shell-practice-dashboard.css` | 10 |
| `style/responsive/classic-mobile-compact-copy-actions.css` | 10 |
| `style/components/timerbox.css` | 10 |
| `style/components/board-tile-base.css` | 10 |
| `style/pages/replay/replay-responsive.css` | 9 |
| `style/effects/flying-click-base.css` | 9 |
| `style/responsive/practice-touch-desktop.css` | 9 |
| `style/pages/pku2048/code-panel.css` | 7 |
| `style/responsive/mobile-narrow-520.css` | 6 |
| `style/pages/practice-board/dialogs-mode.css` | 6 |
| `style/responsive/mobile-shell-replay.css` | 5 |
| `style/responsive/mobile-shell-shared-controls.css` | 5 |
| `style/responsive/mobile-narrow-760.css` | 4 |
| `style/responsive/mobile-narrow-390.css` | 3 |
| `style/pages/practice-board/stats-inline.css` | 3 |
| `style/pages/pku2048/stats-inline.css` | 3 |
| `style/components/timer-leaderboard.css` | 3 |
| `style/components/board-tile-colors.css` | 3 |
| `style/components/board-grid.css` | 3 |
| `style/components/diagonal-assist.css` | 2 |
| `style/components/game-message.css` | 2 |
| `style/components/history-mini-board.css` | 2 |
| `style/components/stats-and-guide.css` | 2 |
| `style/pages/user-profile/record-detail.css` | 2 |
| `style/preferences/night-history.css` | 2 |
| `style/preferences/night-modals-settings.css` | 2 |
| `style/base/state.css` | 2 |
| `style/components/board-shell.css` | 1 |
| `style/components/logo.css` | 1 |
| `style/pages/modes/foundation-top.css` | 1 |
| `style/pages/modes/tabs-actions.css` | 1 |
| `style/pages/palette/palette-theme-controls.css` | 1 |
| `style/pages/practice-board/visibility.css` | 1 |
| `style/pages/relay-5x5/forms-note.css` | 1 |
| `style/pages/replay/replay-night.css` | 1 |
| `style/pages/replay/replay-shell-stats.css` | 1 |
| `style/responsive/classic-mobile-wide-copy.css` | 1 |
| `style/responsive/mobile-shell-game.css` | 1 |
| `style/responsive/mobile-wide-hidden-controls.css` | 1 |

Total visible CSS `!important` count after theme-ready cleanup: 192. Low-risk reductions came from settings switch owner selectors and the duplicate replay hidden-scoreboard declaration. Palette preview tile priority and dynamic theme priority were intentionally retained.

## Completed In Theme-Ready Cleanup Pass

- Added `style/base/state.css` and replaced safe static HTML `style="display: none"` hooks with `.is-hidden`.
- Updated replay/settings/modal/announcement/play-intro/account captcha owners to toggle class state where touched.
- Added current-value semantic tokens for overlay, modal/popover surfaces, focus rings, dialog shadow, and shared radii.
- Added `style/docs/theme-boundaries.md` and `tests/unit/theme-ready-css-maintenance.spec.ts` as guardrails for future theme work.
- Reduced low-risk visible CSS `!important` count from 199 to 192 without changing visual output.

## Completed In First Pass

- Added `style/tokens/base.css` for current visual values only.
- Added `style/components/logo.css` and moved shared logo presentation out of `style/main.css`.
- Added `style/components/timer.css` and moved repeated timer legend/cell presentation out of HTML inline styles.
- Removed repeated static logo and timer inline styles from the shared game-family pages.
- Left runtime state inline styles in place.

## Completed In Main Split Pass

- Replaced `style/main.css` direct rules with an import-only manifest.
- Moved the remaining 6,457 direct `main.css` rule lines into 26 focused files.
- Preserved cascade order by importing the new files in the same broad order as the original stylesheet.
- Kept HTML stylesheet links unchanged.
- Kept Sass/build tooling unchanged.

## Completed In Mobile Responsive Split Pass

- Replaced `style/responsive/mobile-legacy.css` with five ordered responsive files:
  - `style/responsive/mobile-shell.css`
  - `style/responsive/mobile-narrow.css`
  - `style/responsive/mobile-scoreboard.css`
  - `style/responsive/mobile-home-actions.css`
  - `style/responsive/practice-touch-desktop.css`
- Kept the split mechanical: selectors, declarations, comments, and media queries were not rewritten.
- Kept the responsive layer total at 1,399 lines while reducing the largest responsive file from 987 lines to 484 lines.

## Completed In Settings Modal Split Pass

- Replaced `style/components/settings-modal.css` with eleven ordered component files:
  - `style/components/settings-modal-shell.css`
  - `style/components/announcement-modal.css`
  - `style/components/settings-toolkit.css`
  - `style/components/settings-switches.css`
  - `style/components/settings-modal-responsive.css`
  - `style/components/theme-settings-layout.css`
  - `style/components/custom-select.css`
  - `style/components/theme-preview.css`
  - `style/components/settings-notes.css`
  - `style/components/tile-palette-settings.css`
  - `style/components/settings-modal-mobile-tail.css`
- Kept the split mechanical: selectors, declarations, comments, and media queries were not rewritten.
- Kept the component layer total unchanged while reducing the largest settings-modal-owned file from 783 lines to 235 lines.

## Completed In Top Actions Split Pass

- Replaced `style/components/top-actions.css` with ten ordered component files:
  - `style/components/top-actions-base.css`
  - `style/components/top-actions-icon-baseline.css`
  - `style/components/top-actions-announcement-motion.css`
  - `style/components/top-actions-history-motion.css`
  - `style/components/top-actions-mode-motion.css`
  - `style/components/top-actions-settings-motion.css`
  - `style/components/top-actions-stats-motion.css`
  - `style/components/top-actions-export-practice-motion.css`
  - `style/components/top-actions-reset-motion.css`
  - `style/components/top-actions-reduced-motion.css`
- Kept the split mechanical: selectors, declarations, and keyframes were not rewritten.
- Kept the import position where the old top-actions file lived while reducing the largest top-actions-owned file from 674 lines to 111 lines.

## Completed In Mobile Shell Split Pass

- Replaced `style/responsive/mobile-shell.css` with six ordered responsive files:
  - `style/responsive/mobile-shell-game.css`
  - `style/responsive/mobile-shell-replay.css`
  - `style/responsive/mobile-shell-practice-dashboard.css`
  - `style/responsive/mobile-shell-shared-controls.css`
  - `style/responsive/mobile-shell-practice-board.css`
  - `style/responsive/mobile-shell-secondary-pages.css`
- Kept the split mechanical: selectors, declarations, and breakpoints were not rewritten.
- Reused the same `max-width: 980px` media condition in each replacement file and preserved original import order.
- Reduced the largest mobile-shell-owned file from 484 lines to 157 lines.

## Completed In Board Tiles Split Pass

- Replaced `style/components/board-tiles.css` with seven ordered component files:
  - `style/components/board-grid.css`
  - `style/components/board-tile-geometry.css`
  - `style/components/board-tile-positions.css`
  - `style/components/board-tile-base.css`
  - `style/components/board-tile-colors.css`
  - `style/components/board-tile-animations.css`
  - `style/components/game-copy-spacing.css`
- Kept the split mechanical: selectors, declarations, media queries, and keyframes were not rewritten.
- Kept the import position where the old board-tiles file lived while reducing the largest board-tiles-owned file from 447 lines to 126 lines.

## Completed In Night Background Split Pass

- Replaced `style/preferences/night-background.css` with seven ordered preference files:
  - `style/preferences/night-background-base.css`
  - `style/preferences/night-score-timer.css`
  - `style/preferences/night-board-actions.css`
  - `style/preferences/night-modals-settings.css`
  - `style/preferences/night-diagonal-assist.css`
  - `style/preferences/night-history.css`
  - `style/preferences/night-practice.css`
- Kept the split mechanical: selectors, declarations, media queries, and priority flags were not rewritten.
- Kept the import position where the old night-background file lived while reducing the largest night-preference-owned file from 382 lines to 126 lines.

## Completed In Classic Mobile Split Pass

- Replaced `style/responsive/classic-mobile.css` with eight ordered responsive files:
  - `style/responsive/classic-mobile-wide-copy.css`
  - `style/responsive/classic-mobile-compact-shell.css`
  - `style/responsive/classic-mobile-compact-board.css`
  - `style/responsive/classic-mobile-compact-message.css`
  - `style/responsive/classic-mobile-compact-grid.css`
  - `style/responsive/classic-mobile-compact-tiles.css`
  - `style/responsive/classic-mobile-compact-copy-actions.css`
  - `style/responsive/classic-mobile-compact-milestones.css`
- Kept the split mechanical: selectors and declarations were not rewritten. The compact rules repeat the same `max-width: 520px` media wrapper in focused files.
- Kept the import position where the old classic-mobile file lived while reducing the largest classic-mobile-owned file from 369 lines to 104 lines.

## Completed In Portal Split Pass

- Replaced `style/components/portal.css` with seven ordered component files:
  - `style/components/portal-shell.css`
  - `style/components/portal-forms.css`
  - `style/components/portal-table.css`
  - `style/components/history-list.css`
  - `style/components/history-mini-board.css`
  - `style/components/history-final-board.css`
  - `style/components/portal-responsive.css`
- Kept the split mechanical: selectors, declarations, media query, and priority flags were not rewritten.
- Kept the import position where the old portal file lived while reducing the largest portal-owned file from 352 lines to 104 lines.

## Completed In Replay Modal Split Pass

- Replaced `style/components/replay-modal.css` with eight ordered component files:
  - `style/components/replay-message-actions.css`
  - `style/components/replay-modal-overlay.css`
  - `style/components/replay-controls-panel.css`
  - `style/components/replay-modal-content.css`
  - `style/components/mobile-hint-modal.css`
  - `style/components/mode-intro-modal.css`
  - `style/components/replay-import-textarea.css`
  - `style/components/replay-modal-actions.css`
- Kept the split mechanical: selectors, declarations, comments, range-input rules, and priority flags were not rewritten.
- Kept the import position where the old replay modal file lived while reducing the largest replay-modal-owned file from 314 lines to 157 lines.

## Completed In Mobile Narrow Split Pass

- Replaced `style/responsive/mobile-narrow.css` with five ordered responsive files:
  - `style/responsive/mobile-narrow-760.css`
  - `style/responsive/mobile-wide-hidden-controls.css`
  - `style/responsive/mobile-narrow-520.css`
  - `style/responsive/mobile-narrow-390.css`
  - `style/responsive/mobile-narrow-320.css`
- Kept the split mechanical: selectors, declarations, breakpoints, and priority flags were not rewritten.
- Kept the import position where the old mobile-narrow file lived while reducing the largest mobile-narrow-owned file from 287 lines to 132 lines.

## Completed In Flying Click Split Pass

- Replaced `style/effects/flying-click.css` with four ordered effect files:
  - `style/effects/flying-click-base.css`
  - `style/effects/flying-click-logo-keyframes.css`
  - `style/effects/flying-click-tile-keyframes.css`
  - `style/effects/flying-click-reduced-motion.css`
- Kept the split mechanical: selectors, declarations, keyframes, reduced-motion rule, and priority flags were not rewritten.
- Kept the import position where the old flying-click file lived while reducing the largest flying-click-owned file from 283 lines to 125 lines.

## Completed In Page CSS Split Pass

- Replaced the five largest page-level CSS entries with import-only manifests:
  - `style/palette_page.css`
  - `style/account_page.css`
  - `style/stone_2k_monitor.css`
  - `style/admin_page.css`
  - `style/replay_page_rebuild.css`
- Moved their original page-owned rules into 31 focused files under `style/pages/<page>/`.
- Kept the split mechanical: selectors, declarations, media queries, priority flags, and cascade order were not rewritten.
- Kept all existing HTML stylesheet links unchanged.
- Reduced the largest page-owned focused file to `style/pages/palette/palette-picker-popover.css` at 231 lines.

## Completed In Static Inline Cleanup Pass

- Moved `history.html` action spacing, pagination alignment, and hidden import file input presentation into `style/components/history-list.css`.
- Removed redundant `float: right` inline declarations from `Practice_board.html` and `PKU2048.html`; `.scores-container` already owns that declaration.
- Moved the hidden native palette select presentation into `style/pages/palette/palette-theme-controls.css`.
- Removed duplicate relay segment board sizing from `relay_5x5.html`; the existing page style block already owns the same selector and declarations.
- Left runtime visibility hooks such as modal `display: none` in place.

## Completed In Semantic Token Pass

- Expanded `style/tokens/base.css` from 10 to 25 lines with current-value tokens for text roles, surface roles, control borders, muted replay actions, and radius roles.
- Replaced repeated classic visual literals in the `main.css` import stack and page-owned CSS loaded after `main.css`.
- Kept standalone utility entries such as `style/api_docs.css`, `style/ui-preview.css`, and `style/beta_access.css` self-contained instead of making them depend on the shared game token layer.
- Verified the pass with `npm run build`, the full unit suite via the targeted command (298 files, 1883 tests), and targeted page smoke coverage for home display, palette preview, replay runtime, and UI regressions (58 passed).

## Completed In Override Pressure Pass

- Recounted `!important` after the structural and token passes.
- Removed three low-risk `!important` declarations from `style/components/replay-import-textarea.css`; the declarations remain unchanged and are covered by replay import/runtime smoke.
- Kept high-risk responsive compatibility, low-performance animation suppression, runtime visibility, and dynamic theme priority boundaries intact.
- Final verification passed with `npm run build`, full unit coverage (298 files, 1883 tests), and `npm run test:smoke:pages` (164 passed).

## Completed In CSS Maintenance Debt Pass

- Replaced the remaining large standalone page/utility entries with import manifests:
  - `style/achievements_page.css`
  - `style/user_profile_page.css`
  - `style/beta_access.css`
  - `style/ui-preview.css`
- Moved their original rules into focused page/utility directories:
  - `style/pages/achievements/`
  - `style/pages/user-profile/`
  - `style/pages/beta-access/`
  - `style/utility/ui-preview/`
- Moved all remaining HTML head `<style>` blocks into page-owned CSS files:
  - `style/pages/index-test/page.css`
  - `style/pages/practice-board/page.css`
  - `style/pages/pku2048/page.css`
  - `style/pages/capped-2048/page.css`
  - `style/pages/relay-5x5/page.css`
  - `style/pages/modes/page.css`
  - `style/utility/favicon-preview/page.css`
  - `style/utility/cache-reset/page.css`
  - `style/utility/ranked-seed-validator/page.css`
- Split migrated page CSS over 300 lines into same-directory manifests and partials.
- Confirmed there are no remaining HTML `<style>` blocks outside ignored build/report/work artifacts.
- Reduced the largest focused CSS file to `style/api_docs.css` at 244 lines.

## Next Migration Priorities

1. Keep the soft file-size budget at about 250 lines per focused CSS file; split only when a file grows past that or mixes unrelated owners.
2. Convert remaining runtime `style=""` hooks only with the owning scripts, using class/attribute state toggles plus targeted tests.
3. Reduce practice/PKU `!important` pressure after those pages have focused screenshot or smoke coverage for board editing, code dialogs, and inline stats.
4. Add screenshot coverage for the newly externalized utility/development pages before deeper visual cleanup.
5. Keep `style/api_docs.css` standalone for now; split it only if it grows or starts sharing patterns with another page.

## Explicit Non-Goals

- Do not add a new visual theme in this cleanup.
- Do not add theme switching.
- Do not rewrite `style/main.css` wholesale.
- Do not remove runtime state inline styles unless the owning script is updated at the same time.
