# CSS Final Maintenance PRD

## Goal

Bring the `2048-next-logo-work` CSS structure to a maintainable final state for the current visual system without changing runtime visuals, adding a new theme, adding theme switching, or changing the build chain.

## Problem

The first CSS cleanup passes made `style/main.css` an import-only manifest and split several large component/responsive files. Remaining maintenance risk still comes from:

- several imported main-entry files that mix unrelated surfaces;
- standalone page CSS files over 500 lines;
- remaining embedded `<style>` blocks and static `style=""` attributes;
- repeated values that are not yet represented as semantic tokens;
- override pressure from broad selectors and `!important`.

## Acceptance Criteria

- `style/main.css` remains an import-only manifest with no direct CSS rules.
- No HTML stylesheet link to `style/main.css` changes.
- No Sass, PostCSS, Tailwind, or other new build step is introduced.
- No runtime visual redesign is introduced.
- No new theme or theme switcher is introduced.
- The remaining imported main-entry files have clear ownership and are split when a file mixes unrelated surfaces.
- Standalone page CSS files over 500 lines are either split into page-owned import manifests or explicitly documented as intentionally page-owned with a reason.
- Inline styles are classified as runtime state hooks or static presentation. High-confidence static presentation is moved to CSS in small verified batches.
- Shared repeated values have semantic tokens where safe, introduced from existing values only.
- `!important` usage and high-specificity overrides are recounted after structural work; at least one low-risk owner group is reduced if selectors allow it without behavior changes.
- Trellis task docs and `style/docs/css-inventory.md` stay current.
- Final verification includes build, unit, and page smoke evidence.

## Non-Goals

- Do not change game, account, leaderboard, replay, ranked session, API, persistence, or backend authority.
- Do not rewrite selectors during mechanical splits.
- Do not remove runtime visibility or state inline styles unless the owning script is changed in the same focused task.
- Do not create a new CSS framework or migration.
- Do not combine this cleanup with visual redesign work.

## Verification

Use the following as the rolling validation baseline:

```bash
npm run build
npm run test:unit -- tests/unit/home-mobile-board-css.spec.ts tests/unit/leaderboard-rank-style.spec.ts tests/unit/bootstrap-flying-click-effect.spec.ts tests/unit/home-user-display-style.spec.ts tests/unit/modes-logo-css.spec.ts
npm run test:smoke:pages
```

For page-specific CSS splits, add targeted smoke commands when a narrower test exists.
