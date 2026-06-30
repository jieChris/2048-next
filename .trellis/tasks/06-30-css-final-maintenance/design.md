# CSS Final Maintenance Design

## Architecture

Keep the existing runtime loading model:

- `style/main.css` is the shared manifest for game-family pages.
- Top-level page CSS files remain the page stylesheet entry points.
- Focused files live under ownership directories such as `style/components`, `style/responsive`, `style/preferences`, and page-specific subdirectories.
- Page-level split files should be imported by the original page CSS entry file so HTML links do not change.

## Split Strategy

Mechanical splits come first. A mechanical split:

- moves contiguous rule groups into named files;
- preserves selector text, declaration text, comments, media query bodies, and order;
- replaces one import or one page CSS body with ordered imports;
- verifies that rejoining the slices matches the original file.

Selector simplification and token replacement come only after the owning file is small enough to reason about.

## Final State Targets

- Imported shared files should usually stay below roughly 250 lines unless a cohesive owner naturally needs more.
- Standalone page entry files over 500 lines should become import manifests or be split by page section.
- Runtime state inline styles are documented, not blindly removed.
- Static inline presentation is moved to classes when the target page has smoke or screenshot coverage.
- Tokens represent current repeated values only; token names describe roles, not page names.

## Current Work Order

1. Finish imported main-entry stabilization:
   - `style/preferences/night-background.css`
   - `style/responsive/classic-mobile.css`
   - `style/components/portal.css`
   - reassess `style/components/replay-modal.css`, `style/responsive/mobile-narrow.css`, and `style/components/settings-switches.css`
2. Split page-level CSS files over 500 lines:
   - `style/palette_page.css`
   - `style/account_page.css`
   - `style/stone_2k_monitor.css`
   - `style/admin_page.css`
   - `style/replay_page_rebuild.css`
3. Govern inline styles:
   - move high-confidence static presentation;
   - keep runtime hooks documented.
4. Expand semantic tokens from repeated existing values.
5. Reduce low-risk override pressure.

## Risk Controls

- One owner file per batch.
- Preserve import order.
- Run build and targeted unit after each structural batch.
- Run full page smoke after shared CSS changes or before declaring a phase complete.
- Keep Trellis implementation notes updated after each batch.
