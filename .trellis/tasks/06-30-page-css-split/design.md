# Page CSS Split Design

## Structure

Keep every existing page entry file as the stable link target and replace its body with ordered `@import` rules. Store page-private implementation files in `style/pages/<page>/` so they do not mix with shared component CSS.

## Split Boundaries

### `style/palette_page.css`

- `pages/palette/palette-shell.css`: lines 1-104
- `pages/palette/palette-theme-controls.css`: lines 105-321
- `pages/palette/palette-editor-shell.css`: lines 322-455
- `pages/palette/palette-color-targets.css`: lines 456-554
- `pages/palette/palette-picker-popover.css`: lines 555-785
- `pages/palette/palette-preview.css`: lines 786-852
- `pages/palette/palette-night.css`: lines 853-977
- `pages/palette/palette-responsive.css`: lines 978-1039

### `style/account_page.css`

- `pages/account/account-auth.css`: lines 1-221
- `pages/account/account-board-tools.css`: lines 222-332
- `pages/account/account-board-list.css`: lines 333-499
- `pages/account/account-guide.css`: lines 500-545
- `pages/account/account-night.css`: lines 546-726
- `pages/account/account-responsive.css`: lines 727-817

### `style/stone_2k_monitor.css`

- `pages/stone-monitor/stone-foundation-access.css`: original `stone-access-hero` lines 1-200
- `pages/stone-monitor/stone-hero-nav.css`: original `stone-access-hero` lines 201-311
- `pages/stone-monitor/stone-controls-stats.css`: lines 312-449
- `pages/stone-monitor/stone-results-table.css`: lines 450-581
- `pages/stone-monitor/stone-preview-detail.css`: lines 582-659
- `pages/stone-monitor/stone-responsive.css`: lines 660-761

### `style/admin_page.css`

- `pages/admin/admin-shell-forms.css`: lines 1-221
- `pages/admin/admin-result-tables.css`: lines 222-319
- `pages/admin/admin-access-management.css`: lines 320-465
- `pages/admin/admin-achievements.css`: lines 466-658
- `pages/admin/admin-responsive.css`: lines 659-687

### `style/replay_page_rebuild.css`

- `pages/replay/replay-shell-stats.css`: lines 1-99
- `pages/replay/replay-board-controls.css`: lines 100-205
- `pages/replay/replay-import-modal.css`: lines 206-325
- `pages/replay/replay-night.css`: lines 326-419
- `pages/replay/replay-responsive.css`: lines 420-593
- `pages/replay/replay-preseek-state.css`: lines 594-596

## Validation

- Mechanical reconstruction check for each page entry.
- Import existence and direct-rule check for each page entry.
- Build, unit, and smoke validation after all five page entries are split.
