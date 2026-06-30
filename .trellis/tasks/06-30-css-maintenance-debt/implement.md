# CSS Maintenance Debt Implementation Plan

## Guardrails

- Do not change runtime visuals or behavior.
- Do not add a new theme or theme switcher.
- Do not edit JavaScript, backend, API, account authority, leaderboard authority, replay verification, or ranked session behavior.
- Do not add a CSS build tool.
- Keep splits mechanical and update this checklist as work proceeds.

## Checklist

- [x] Phase 0: Refresh inventory and dependency scan.
- [x] Phase 1: Split `achievements_page.css`.
- [x] Phase 2: Split `user_profile_page.css`.
- [x] Phase 3: Split `beta_access.css`.
- [x] Phase 4: Split `ui-preview.css`.
- [x] Phase 5: Move safe embedded page `<style>` blocks into page-owned CSS files.
- [x] Phase 6: Update inventory and run final verification.

## Rolling Validation Log

- Phase 0 complete:
  - Confirmed `style/achievements_page.css`, `style/user_profile_page.css`, `style/beta_access.css`, and `style/ui-preview.css` are linked only by their owning HTML pages.
  - Confirmed unit CSS readers currently target `style/main.css`, `style/admin_page.css`, and `style/fonts/clear-sans.css`; no test directly reads the four standalone entries.
  - Confirmed remaining embedded `<style>` page blocks are in `index_test.html`, `Practice_board.html`, `PKU2048.html`, `capped_2048.html`, `relay_5x5.html`, `modes.html`, `favicon-preview.html`, `cache-reset.html`, and `ranked_seed_validator.html`.
- Phases 1-4 complete:
  - Converted the four standalone entry files to ordered import manifests.
  - Added page-owned split files under `style/pages/achievements/`, `style/pages/user-profile/`, `style/pages/beta-access/`, and `style/utility/ui-preview/`.
  - Expanded-import comparison against the original tracked CSS rules passed for all four entries.
- Phase 5 complete:
  - Moved embedded head `<style>` blocks from `index_test.html`, `Practice_board.html`, `PKU2048.html`, `capped_2048.html`, `relay_5x5.html`, `modes.html`, `favicon-preview.html`, `cache-reset.html`, and `ranked_seed_validator.html` into page-owned CSS files.
  - Split the migrated CSS files over 300 lines into same-directory import manifests and partials.
  - Confirmed no remaining HTML `<style>` blocks outside ignored build/report/work artifacts.
  - Confirmed remaining `style=""` attributes are runtime visibility hooks and remain intentionally unchanged.
- Phase 6 complete:
  - Updated `style/docs/css-inventory.md` with current entry, page-owned, utility, inline-style, file-size, and `!important` pressure data.
  - Updated `tests/unit/modes-logo-css.spec.ts` to read the externalized `style/pages/modes/page.css` entry instead of assuming modes CSS stays inline in `modes.html`.
  - Final structure check confirmed CSS imports resolve, no HTML `<style>` blocks remain, and no CSS file exceeds 250 lines.

## Final Validation Log

- `node` CSS structure check: passed; all CSS imports resolve, no HTML `<style>` blocks remain, and no CSS file exceeds 250 lines.
- `npm run build`: passed.
- `npm run test:unit -- tests/unit/modes-logo-css.spec.ts`: passed; due the project script prefix, Vitest ran the full unit suite and reported 298 files / 1883 tests passed.
- Targeted Playwright smoke for achievements, beta access gate, user profile, modes, relay 5x5, and home family: passed, 21/21.
- `npm run test:smoke:pages`: passed, 164/164. Vite logged expected local API proxy `ECONNREFUSED 127.0.0.1:3000` noise while assertions passed.
- `git diff --check`: passed with no whitespace errors.
