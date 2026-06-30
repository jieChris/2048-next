# CSS Architecture Optimization Implementation Plan

## Scope

This implementation pass creates the first maintainable CSS architecture layer and performs one low-risk inline style cleanup. It intentionally does not implement a new visual theme.

## Ordered Checklist

1. Create task artifacts.
   - `prd.md`
   - `design.md`
   - `implement.md`

2. Create CSS inventory.
   - Add `style/docs/css-inventory.md`.
   - Record current stylesheet line counts.
   - Record inline style categories.
   - Record migration priorities.

3. Add current-theme token layer.
   - Create `style/tokens/base.css`.
   - Define current visual variables for page background, text, muted text, surface border, logo size, and core legacy colors.
   - Do not add future theme selectors.

4. Add logo component layer.
   - Create `style/components/logo.css`.
   - Move repeated `.site-logo` and `.site-logo-link` ownership out of `main.css`.
   - Preserve current dimensions and mobile behavior.

5. Add timer component layer.
   - Create `style/components/timer.css`.
   - Move static timer legend font sizes out of HTML inline styles.
   - Move static timer progress cell width and spacing out of HTML inline styles.

6. Wire imports.
   - Add `@import url("tokens/base.css");`
   - Add `@import url("components/logo.css");`
   - Add `@import url("components/timer.css");`
   - Keep imports before normal rules in `style/main.css`.

7. Remove repeated static logo inline styles.
   - Remove `style="width:234px;max-width:none;display:block"` from shared `img.site-logo` instances.
   - Remove anchor presentation inline styles only where a stable existing selector already covers the behavior.
   - Leave width/height attributes intact.

8. Remove repeated static timer inline styles.
   - Remove static timer legend color/font-size inline styles where `.timer-legend-*` CSS supplies the same values.
   - Replace static timer value cell width/spacing inline styles with `timer-progress-cell`.
   - Leave runtime visibility inline styles intact.

9. Validate.
   - Run `npm run build`.
   - Run a targeted unit test if one covers logo asset/markup behavior.
   - Run targeted Playwright smoke for core pages if build passes and dependencies are available.

## Files Expected To Change

- `.trellis/tasks/06-30-css-architecture-optimization/prd.md`
- `.trellis/tasks/06-30-css-architecture-optimization/design.md`
- `.trellis/tasks/06-30-css-architecture-optimization/implement.md`
- `style/docs/css-inventory.md`
- `style/tokens/base.css`
- `style/components/logo.css`
- `style/components/timer.css`
- `style/main.css`
- Selected HTML files containing repeated static `img.site-logo` inline presentation.
- Selected HTML files containing repeated static timer inline presentation.

## Validation Commands

```bash
npm run build
npm run test:unit -- tests/unit/wide-logo-asset.spec.ts
npm run test:smoke:pages
```

The smoke command may be narrowed if runtime setup or existing unrelated failures make the full page suite impractical.

## Validation Results

- `npm run build`: passed. Final rerun after documentation cleanup also passed.
- `npm run test:unit -- tests/unit/wide-logo-asset.spec.ts tests/unit/home-user-display-style.spec.ts`: passed. The package script expands to `vitest run tests/unit ...`, so it ran the full unit suite: 298 files and 1,883 tests passed. Final rerun after documentation cleanup also passed.
- `npm run test:smoke:pages`: passed. 164 Playwright smoke tests passed.
- `npm run test:smoke:pages`: passed again after session restore. 164 Playwright smoke tests passed in 1.8m.

The pages smoke output includes repeated Vite proxy `ECONNREFUSED 127.0.0.1:3000` messages from API calls without a local backend, but the suite handles those conditions and completed successfully.
