# CSS Maintenance Debt Design

## Architecture

Keep the current direct-CSS runtime model:

- Top-level CSS files remain the linked entry points.
- Large standalone entries become ordered `@import` manifests.
- Split files stay page-owned:
  - `style/pages/achievements/`
  - `style/pages/user-profile/`
  - `style/pages/beta-access/`
  - `style/utility/ui-preview/`
- Embedded page styles move to page-specific CSS entries only when the page already has a natural standalone ownership boundary.

## Split Rules

- Mechanical first: move contiguous CSS rule groups without rewriting selectors or declarations.
- Preserve import order exactly.
- Do not token-rewrite during splitting.
- Do not use shared `main.css` for page-private utility styles.
- Do not move runtime inline `style=""` attributes in this pass.

## Validation Strategy

- Run import-manifest integrity checks after each split batch.
- Use `npm run build` after structural changes.
- Use the full unit command already established by the CSS maintenance pass.
- Use targeted smoke for pages touched by split or embedded-style migration, then run `npm run test:smoke:pages` before closing.
