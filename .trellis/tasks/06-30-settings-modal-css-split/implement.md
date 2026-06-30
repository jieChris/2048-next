# Settings Modal CSS Split Implementation Plan

## Scope

Split `style/components/settings-modal.css` without changing runtime behavior or visuals.

## Live Direction Guardrails

- Preserve cascade order.
- Move rules mechanically before refactoring selectors.
- Do not add new theme selectors.
- Do not edit JS or backend code.
- Do not alter HTML stylesheet links.
- Update this file as each batch completes.

## Batch Plan

- [x] Batch 1: Create Trellis task docs and confirm split boundaries.
- [x] Batch 2: Move `settings-modal.css` contiguous blocks into new component files.
- [x] Batch 3: Replace the single `settings-modal.css` import in `style/main.css`.
- [x] Batch 4: Update CSS inventory and next optimization notes.
- [x] Batch 5: Run build, unit, and smoke validation.
- [x] Batch 6: Final import/reference self-check and next-step recommendation.

## Planned Split

```text
style/components/settings-modal-shell.css
  Original settings and announcement modal content shell rules.

style/components/announcement-modal.css
  Original announcement list, item, badge, metadata, title, content, link, and empty-state rules.

style/components/settings-toolkit.css
  Original settings row labels, toolkit entry buttons, and modal action ordering.

style/components/settings-switches.css
  Original action rows, language switch, toggle copy, switch slider, and switch state rules.

style/components/settings-modal-responsive.css
  Original first 980px and 520px settings-modal responsive blocks.

style/components/theme-settings-layout.css
  Original custom theme settings two-column layout.

style/components/custom-select.css
  Original custom select dropdown rules.

style/components/theme-preview.css
  Original theme preview dual wrap and preview grid rules.

style/components/settings-notes.css
  Original settings note rules.

style/components/tile-palette-settings.css
  Original tile palette settings and editor rules.

style/components/settings-modal-mobile-tail.css
  Original final 520px override block for top actions, preview, and tile palette layout.
```

## Validation Plan

Run after the mechanical split:

```bash
npm run build
npm run test:unit -- tests/unit/bootstrap-settings-modal-page-host.spec.ts tests/unit/bootstrap-settings-modal-host.spec.ts tests/unit/bootstrap-theme-settings-host.spec.ts tests/unit/home-user-display-style.spec.ts tests/unit/leaderboard-rank-style.spec.ts
npm run test:smoke:pages
```

Existing Vite proxy `ECONNREFUSED 127.0.0.1:3000` messages are expected when no local backend is running as long as Playwright assertions pass.

## Validation Results

- `npm run build`: passed.
- `npm run test:unit -- tests/unit/bootstrap-settings-modal-page-host.spec.ts tests/unit/bootstrap-settings-modal-host.spec.ts tests/unit/bootstrap-theme-settings-host.spec.ts tests/unit/home-user-display-style.spec.ts tests/unit/leaderboard-rank-style.spec.ts`: passed. The package script ran the full unit suite: 298 files and 1,883 tests passed.
- `npm run test:smoke:pages`: passed. 164 Playwright smoke tests passed in 1.8m.

The smoke run still prints Vite proxy `ECONNREFUSED 127.0.0.1:3000` messages when no local backend is running; the suite handled those expected local-development conditions and completed successfully.

## Split Results

- `style/main.css`: 44 import lines, no direct style rules.
- Replaced one settings-modal import with eleven ordered component imports.
- Deleted the inactive `style/components/settings-modal.css` file after the split.
- New component file line counts:
  - `style/components/settings-modal-shell.css`: 35 lines.
  - `style/components/announcement-modal.css`: 91 lines.
  - `style/components/settings-toolkit.css`: 56 lines.
  - `style/components/settings-switches.css`: 235 lines.
  - `style/components/settings-modal-responsive.css`: 91 lines.
  - `style/components/theme-settings-layout.css`: 18 lines.
  - `style/components/custom-select.css`: 85 lines.
  - `style/components/theme-preview.css`: 32 lines.
  - `style/components/settings-notes.css`: 18 lines.
  - `style/components/tile-palette-settings.css`: 78 lines.
  - `style/components/settings-modal-mobile-tail.css`: 44 lines.
- Structural check: all 44 `style/main.css` imports exist, and `style/main.css` has no direct style rules.

## Final Self-Check

- Import integrity check: 44 imports, 0 missing files, 0 direct rules, 0 active `settings-modal.css` imports.
- Active legacy reference check: no `settings-modal.css` references in `style/main.css` or `style/components`.
- Scope guard check: no restricted theme-planning keywords in this task, `style/docs`, `style/components`, or `style/main.css`.

## Next Recommendation

Continue with `style/components/top-actions.css`, now the largest imported main-entry file at 674 lines. Use the same pattern: split by contiguous ownership blocks first, keep selector/value rewrites out of the mechanical pass, then run build, unit, and smoke before moving to the next large file.
