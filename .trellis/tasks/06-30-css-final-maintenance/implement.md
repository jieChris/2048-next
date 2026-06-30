# CSS Final Maintenance Implementation Plan

## Live Direction Guardrails

- Do not change runtime visuals.
- Do not add a new theme or theme switching.
- Do not change HTML stylesheet links.
- Do not add a CSS build tool.
- Do not edit JavaScript, backend, API, account authority, leaderboard authority, replay verification, or ranked session behavior for this cleanup.
- Keep splits mechanical until the file ownership is stable.
- Update this checklist as work proceeds.

## Phase Checklist

- [x] Phase 0: Create final-maintenance Trellis task and refresh current CSS inventory inputs.
- [x] Phase 1: Finish imported main-entry stabilization.
- [x] Phase 2: Split page-level CSS files over 500 lines.
- [x] Phase 3: Govern inline styles and embedded `<style>` blocks.
- [x] Phase 4: Expand semantic tokens from repeated existing values.
- [x] Phase 5: Reduce low-risk `!important` and override pressure.
- [x] Phase 6: Run final verification and close the goal.

## Phase 1 Detailed Plan

- [x] Split `style/preferences/night-background.css` by surface ownership.
- [x] Split `style/responsive/classic-mobile.css` by breakpoint/surface ownership.
- [x] Split `style/components/portal.css` by portal shell/cards/actions/history ownership.
- [x] Split `style/components/replay-modal.css` by replay action, overlay, controls, modal content, mobile hint, mode intro, textarea, and actions ownership.
- [x] Split `style/responsive/mobile-narrow.css` by breakpoint ownership.
- [x] Document `style/components/settings-switches.css` as a cohesive owner file unless a later selector pass requires a split.
- [x] Split `style/effects/flying-click.css` by effect base, logo keyframes, tile keyframes, and reduced-motion ownership.
- [x] Document `style/components/timer-leaderboard.css` and `style/components/timerbox.css` as cohesive owner files unless a later selector pass requires a split.

## Phase 2 Detailed Plan

- [x] Split `style/palette_page.css` into a page-owned import manifest and focused page files.
- [x] Split `style/account_page.css` into a page-owned import manifest and focused page files.
- [x] Split `style/stone_2k_monitor.css` into a page-owned import manifest and focused page files.
- [x] Split `style/admin_page.css` into a page-owned import manifest and focused page files.
- [x] Split `style/replay_page_rebuild.css` into a page-owned import manifest and focused page files.

## Phase 3 Detailed Plan

- [x] Refresh inline style counts.
- [x] Move high-confidence static inline presentation in `history.html`.
- [x] Move additional high-confidence static inline presentation from `Practice_board.html`, `PKU2048.html`, `palette.html`, and `relay_5x5.html`.
- [x] Document remaining runtime hooks and embedded style blocks.

## Phase 4 Detailed Plan

- [x] Count repeated colors, radii, shadows, focus rings, and surface values.
- [x] Add tokens only for values already repeated across owners.
- [x] Replace repeated values one owner file at a time.

## Phase 5 Detailed Plan

- [x] Recount `!important` after structural splits.
- [x] Choose one low-risk owner group where stable classes already exist.
- [x] Remove or narrow overrides without selector behavior changes.

## Rolling Validation Log

- `style/preferences/night-background.css` mechanical split completed. Replacement imports in `style/main.css`: `night-background-base.css`, `night-score-timer.css`, `night-board-actions.css`, `night-modals-settings.css`, `night-diagonal-assist.css`, `night-history.css`, and `night-practice.css`. Rejoin check matched the original source order.
- Validation for the night-background split passed: `npm run build`, full unit suite via targeted command (298 files, 1883 tests), and `npm run test:smoke:pages` (164 passed).
- `style/responsive/classic-mobile.css` mechanical split completed. Replacement imports in `style/main.css`: `classic-mobile-wide-copy.css`, `classic-mobile-compact-shell.css`, `classic-mobile-compact-board.css`, `classic-mobile-compact-message.css`, `classic-mobile-compact-grid.css`, `classic-mobile-compact-tiles.css`, `classic-mobile-compact-copy-actions.css`, and `classic-mobile-compact-milestones.css`. Reconstruction check matched the original source order.
- Validation for the classic-mobile split passed: `npm run build`, full unit suite via targeted command (298 files, 1883 tests), and `npm run test:smoke:pages` (164 passed).
- `style/components/portal.css` mechanical split completed. Replacement imports in `style/main.css`: `portal-shell.css`, `portal-forms.css`, `portal-table.css`, `history-list.css`, `history-mini-board.css`, `history-final-board.css`, and `portal-responsive.css`. Reconstruction check matched the original source order.
- Validation for the portal split passed: `npm run build`, full unit suite via targeted command (298 files, 1883 tests), and `npm run test:smoke:pages` (164 passed).
- `style/components/replay-modal.css` mechanical split completed. Replacement imports in `style/main.css`: `replay-message-actions.css`, `replay-modal-overlay.css`, `replay-controls-panel.css`, `replay-modal-content.css`, `mobile-hint-modal.css`, `mode-intro-modal.css`, `replay-import-textarea.css`, and `replay-modal-actions.css`. Reconstruction check matched the original source order.
- Validation for the replay-modal split passed: `npm run build`, full unit suite via targeted command (298 files, 1883 tests), and `npm run test:smoke:pages` (164 passed).
- `style/responsive/mobile-narrow.css` mechanical split completed. Replacement imports in `style/main.css`: `mobile-narrow-760.css`, `mobile-wide-hidden-controls.css`, `mobile-narrow-520.css`, `mobile-narrow-390.css`, and `mobile-narrow-320.css`. Reconstruction check matched the original source order.
- Validation for the mobile-narrow split passed: `npm run build`, full unit suite via targeted command (298 files, 1883 tests), and `npm run test:smoke:pages` (164 passed).
- `style/effects/flying-click.css` mechanical split completed. Replacement imports in `style/main.css`: `flying-click-base.css`, `flying-click-logo-keyframes.css`, `flying-click-tile-keyframes.css`, and `flying-click-reduced-motion.css`. Reconstruction check matched the original source order.
- Validation for the flying-click split passed: `npm run build`, full unit suite via targeted command (298 files, 1883 tests), and `npm run test:smoke:pages` (164 passed). Final import/reference self-check passed with 97 imports, zero missing imports, zero direct rule lines, no old `effects/flying-click.css` import, and no old active file.
- Phase 1 closed with all imported main-entry CSS below the working split threshold. `settings-switches.css` (235 lines), `timer-leaderboard.css` (214 lines), and `timerbox.css` (192 lines) are intentionally retained as cohesive owner files because their ownership is narrower than the page-level files targeted in Phase 2.
- Phase 2 mechanical page split completed for `palette_page.css`, `account_page.css`, `stone_2k_monitor.css`, `admin_page.css`, and `replay_page_rebuild.css`. Each original page entry is now an import-only manifest, with page-owned rules moved under `style/pages/<page>/`. Post-write import integrity passed with zero missing imports and zero direct rule lines for all five page entries. The page-owned layer is 3,900 lines across 31 files, with the largest focused file at 231 lines.
- Validation for the page CSS split passed: `npm run build`, full unit suite via targeted command (298 files, 1883 tests), and `npm run test:smoke:pages` (164 passed). One unit test was updated to use the existing CSS import expansion helper after `style/admin_page.css` became an import manifest.
- Phase 3 static inline cleanup completed. Removed or migrated six high-confidence static inline presentation attributes: three from `history.html`, the redundant `float: right` attributes from `Practice_board.html` and `PKU2048.html`, the hidden native palette select, and the duplicate relay segment board sizing. Remaining inline attributes are runtime visibility hooks or generated content hooks; embedded page `<style>` blocks remain documented for the next page-stylesheet strategy. Validation passed: `npm run build`, full unit suite via targeted command (298 files, 1883 tests), and targeted smoke coverage for history import, palette preview, relay 5x5, and practice mode picker (11 passed).
- Phase 4 semantic token expansion completed for repeated current visual values used by the main game/page stack. Added text, border, muted action, control radius, and panel radius tokens in `style/tokens/base.css`, then replaced matching literals across `style/base`, `style/components`, `style/responsive`, `style/preferences`, and page-owned CSS that is loaded after `style/main.css`. Standalone utility entries such as `api_docs.css`, `ui-preview.css`, and `beta_access.css` keep their local values because they do not depend on `main.css`.
- Validation for the token expansion passed: `npm run build`, full unit suite via targeted command (298 files, 1883 tests), and targeted smoke coverage for home display, palette preview, replay runtime, and UI regressions (58 passed).
- Phase 5 override-pressure pass completed. Recounted `!important` after token work at 157 uses, removed the three low-risk `!important` declarations from `.replay-modal-content > .replay-textarea`, and left higher-risk runtime/responsive overrides in place. The palette preview tile radius override was explicitly retained because runtime theme CSS injects `.theme-preview-tile` rules with `!important`, and the existing more specific selector preserves the palette preview contract.
- Validation for the override-pressure pass passed: `npm run build` and replay import/runtime smoke coverage (26 passed). Final `!important` count is 154.

## Final Validation Log

- Final import/reference self-check passed with `style/main.css` at 97 imports, zero missing imports, and zero direct rule lines.
- Final validation passed: `npm run build`.
- Final validation passed: `npm run test:unit -- tests/unit/home-mobile-board-css.spec.ts tests/unit/leaderboard-rank-style.spec.ts tests/unit/bootstrap-flying-click-effect.spec.ts tests/unit/home-user-display-style.spec.ts tests/unit/modes-logo-css.spec.ts` (298 files, 1883 tests).
- Final validation passed: `npm run test:smoke:pages` (164 passed). Local Vite proxy logged expected `ECONNREFUSED 127.0.0.1:3000` noise because the API backend was not running; smoke assertions passed.
