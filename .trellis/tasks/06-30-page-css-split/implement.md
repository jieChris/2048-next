# Page CSS Split Implementation Plan

## Guardrails

- Preserve current visuals and cascade order.
- Keep existing HTML stylesheet links unchanged.
- Keep each split mechanical until verification is complete.
- Do not edit JavaScript, backend/API, or build tooling.
- Update this checklist as work proceeds.

## Batch Plan

- [x] Batch 1: Identify page-level CSS files over 500 lines.
- [x] Batch 2: Define split boundaries and page-owned target directories.
- [x] Batch 3: Mechanically split the five page entries and replace each entry with an import manifest.
- [x] Batch 4: Run reconstruction and import integrity checks.
- [x] Batch 5: Update inventory and final-maintenance checklist.
- [x] Batch 6: Run build, unit, and smoke validation.
- [x] Batch 7: Record final status and next migration priorities.

## Validation Results

- `npm run build` passed.
- Initial unit validation exposed one test adapter issue: `tests/unit/admin-replay-upload-ui.spec.ts` still read `style/admin_page.css` directly after that file became an import manifest.
- Updated that test to use the existing `readCssEntry` helper so import manifests are expanded before assertions.
- `npm run test:unit -- tests/unit/home-mobile-board-css.spec.ts tests/unit/leaderboard-rank-style.spec.ts tests/unit/bootstrap-flying-click-effect.spec.ts tests/unit/home-user-display-style.spec.ts tests/unit/modes-logo-css.spec.ts` passed as the full unit suite: 298 files / 1883 tests.
- `npm run test:smoke:pages` passed: 164 tests.

## Split Results

- Replaced `style/palette_page.css` with an 8-import manifest and moved the original rules into `style/pages/palette/`.
- Replaced `style/account_page.css` with a 6-import manifest and moved the original rules into `style/pages/account/`.
- Replaced `style/stone_2k_monitor.css` with a 6-import manifest and moved the original rules into `style/pages/stone-monitor/`.
- Replaced `style/admin_page.css` with a 5-import manifest and moved the original rules into `style/pages/admin/`.
- Replaced `style/replay_page_rebuild.css` with a 6-import manifest and moved the original rules into `style/pages/replay/`.
- Mechanical reconstruction checks passed before write for all five original page entries.
- Post-write import integrity passed: all five page entries have zero missing imports and zero direct rule lines.
- Page-owned focused files now total 3,900 lines across 31 files. The largest page-owned file is `style/pages/palette/palette-picker-popover.css` at 231 lines.
