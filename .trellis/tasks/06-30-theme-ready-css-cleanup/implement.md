# Theme-Ready CSS Cleanup Implementation Plan

## Guardrails

- Do not add a new visual theme.
- Do not add theme switching.
- Do not change runtime visuals or layout.
- Do not add CSS build tooling.
- Keep edits scoped to DOM state, current-value tokens, low-risk priority cleanup, docs, and tests.
- Update this checklist as work proceeds.

## Checklist

- [x] Phase 0: Inventory inline visibility hooks, token gaps, `!important` pressure, and existing tests.
- [x] Phase 1: Replace safe static `style="display: none"` hooks with class/attribute state and update owning runtime/tests.
- [x] Phase 2: Add current-value theme-ready semantic tokens without changing visuals.
- [x] Phase 3: Remove low-risk `!important` declarations covered by stable owner selectors or state classes.
- [x] Phase 4: Add theme-boundary docs and maintainability guardrail tests.
- [x] Phase 5: Run build, unit, targeted smoke, full page smoke, and structure checks.

## Rolling Validation Log

- Phase 0 inventory:
  - Static initial `style="display: none"` hooks remain in `2048.html`, `capped_2048.html`, `play.html`, `index_test.html`, `Practice_board.html`, `undo_2048.html`, `account.html`, `replay.html`, and `PKU2048.html`.
  - Safe runtime owners identified: `src/bootstrap/replay-modal.ts`, `js/core_replay_modal_runtime.js`, `src/bootstrap/play-challenge-intro-host.ts`, `js/core_play_challenge_intro_host_runtime.js`, `src/bootstrap/mobile-top-buttons.ts`, `js/core_mobile_top_buttons_runtime.js`, `js/announcement_manager.js`, `js/replay_ui.js`, `js/account_page.js`, and settings modal page host generated markup.
  - HTML `<style>` blocks are already absent outside ignored build/report/work artifacts.
  - `style/tokens/base.css` exists but lacks shared state/overlay/focus/elevation aliases needed for future theme boundaries.
  - Visible CSS `!important` pressure is 199 declarations, mostly responsive compatibility, low-performance tile overrides, dynamic theme priority, and runtime suppression boundaries. Low-risk cleanup should target state visibility and owner selectors only.
  - Existing tests still assert some inline `style.display` values for replay/settings/play-intro/mobile-top state; these need to move to class/computed visibility assertions as owners change.
- Phase 1 state cleanup:
  - Added `style/base/state.css` and imported it from `style/main.css` after base tokens.
  - Replaced safe static `style="display: none"` hooks with `.is-hidden` in the touched game, replay, account, and practice HTML entries.
  - Updated owning runtime/bootstrap code to toggle `.is-hidden` instead of relying on inline `style.display` for replay modal, challenge intro, mobile top buttons, settings modal host, announcements, replay import UI, and account captcha state.
  - Moved replay import modal/button normal display values back into owner CSS so class state only controls hidden/shown state.
- Phase 2 token boundary:
  - Added current-value semantic aliases for modal/popover/overlay surfaces, dialog/pill radius, focus rings, and dialog shadow in `style/tokens/base.css`.
  - Updated modal/dialog/switch components to consume shared semantic tokens without changing values.
- Phase 3 priority cleanup:
  - Reduced low-risk owner `!important` declarations in settings switches and replay board controls while preserving runtime/theme suppression boundaries.
- Phase 4 docs and guardrails:
  - Added `style/docs/theme-boundaries.md`.
  - Added `tests/unit/theme-ready-css-maintenance.spec.ts` to guard HTML inline state, CSS import resolution, size budgets, state utility, theme-boundary tokens, and docs.
- Partial validation completed:
  - `npx tsc --noEmit` passed.
  - `npx vitest run tests/unit/theme-ready-css-maintenance.spec.ts tests/unit/bootstrap-replay-modal.spec.ts tests/unit/bootstrap-play-challenge-intro-host.spec.ts tests/unit/bootstrap-mobile-top-buttons.spec.ts tests/unit/bootstrap-settings-modal-page-host.spec.ts` passed.
  - `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/index-ui-settings-actions.smoke.spec.ts tests/smoke/pages-announcement-settings.smoke.spec.ts tests/smoke/pages-replay-import.smoke.spec.ts` passed.
  - `npx playwright test --config=playwright.refactor-contract.config.ts --workers=1 tests/refactor-contract/index-ui-settings-storage.smoke.spec.ts tests/refactor-contract/pages-play-entry.smoke.spec.ts` passed.

## Final Validation Log

- Structure scans:
  - `rg -n 'style="display:\s*none;?" --glob '*.html' --glob '!dist/**' --glob '!work/**' --glob '!playwright-report/**'` returned no matches.
  - `rg -n 'style="[^"]*"' --glob '*.html' --glob '!dist/**' --glob '!work/**' --glob '!playwright-report/**'` returned no matches.
  - `rg -n '<style\b|</style>' --glob '*.html' --glob '!dist/**' --glob '!work/**' --glob '!playwright-report/**'` returned no matches.
  - `rg -n '!important' style --glob '*.css' | wc -l` reports 192 declarations after the low-risk cleanup.
- Build/type-check:
  - `npm run build` passed after final edits.
- Unit:
  - `npm run test:unit` passed: 299 test files, 1891 tests.
- Targeted smoke:
  - `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/index-ui-settings-actions.smoke.spec.ts tests/smoke/pages-announcement-settings.smoke.spec.ts tests/smoke/pages-replay-import.smoke.spec.ts` passed: 5 tests.
- Full page smoke:
  - `npm run test:smoke:pages` passed: 164 tests.
- Refactor contract:
  - Initial full `npm run test:refactor-contract` run exposed a test-harness timeout in `tests/refactor-contract/pages-announcement-settings.smoke.spec.ts`.
  - Root cause: the test pre-created `CoreGameSettingsStorageRuntime`, which short-circuited the current TypeScript runtime installer that preserves existing globals.
  - Fixed the test harness to intercept runtime assignment via an accessor and wrap the installed functions without changing production runtime semantics.
  - `npx playwright test --config=playwright.refactor-contract.config.ts --workers=1 tests/refactor-contract/pages-announcement-settings.smoke.spec.ts` passed: 1 test.
  - `npm run test:refactor-contract` passed: 32 tests.
- Patch hygiene:
  - `git diff --check` passed.
