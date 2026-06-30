# Page CSS Split PRD

## Goal

Split the largest page-level CSS entry files into page-owned focused files while preserving existing HTML stylesheet links and runtime visuals.

## Scope

- `style/palette_page.css`
- `style/account_page.css`
- `style/stone_2k_monitor.css`
- `style/admin_page.css`
- `style/replay_page_rebuild.css`

## Acceptance Criteria

- Each original page CSS file remains as an import-only manifest.
- New page-owned CSS files live under `style/pages/<page>/`.
- Rejoining imported page files in manifest order exactly matches the original page CSS content, except for the new manifest wrapper.
- No selectors, declarations, media queries, keyframes, priority flags, HTML links, JavaScript, backend/API code, or build tooling are rewritten.
- `npm run build`, the CSS-relevant unit command, and `npm run test:smoke:pages` pass after the split batch.

## Non-Goals

- Do not introduce Liquid Glass or any new theme.
- Do not token-rewrite values in this phase.
- Do not remove inline runtime state styles in this phase.
