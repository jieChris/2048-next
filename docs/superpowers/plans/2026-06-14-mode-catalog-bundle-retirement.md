# Mode Catalog Bundle Retirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire `js/core_mode_catalog_runtime.js` from the active Vite-generated home startup bundle path now that `CoreModeCatalogRuntime` is installed from tested TypeScript.

**Architecture:** Keep the TypeScript installer in `src/bootstrap/mode-catalog.ts` as the canonical modern runtime owner. Extend the focused bundled-runtime retired registry in `entry-manifest-audit` to cover `core_mode_catalog_runtime.js`, then remove it from `HOME_STANDARD_STARTUP_FILES`. Leave the legacy JS file in place.

**Tech Stack:** TypeScript, Vitest, Vite config, Playwright smoke, existing `entry-manifest-audit`.

---

### Task 1: Bundle Retirement Guard

**Files:**
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`
- Modify: `scripts/entry-manifest-audit.mjs`

- [x] **Step 1: Write the failing bundled-retired registry test**

Add this test near the bundled retired runtime assertions:

```ts
it("tracks mode-catalog runtime as a retired Vite bundled runtime script", () => {
  expect(BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS).toContainEqual({
    scriptPath: "core_mode_catalog_runtime.js"
  });
});
```

- [x] **Step 2: Verify RED**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: FAIL because `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` does not include `core_mode_catalog_runtime.js`.

- [x] **Step 3: Add mode-catalog to the bundled retired registry**

Add this entry to `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` in `scripts/entry-manifest-audit.mjs`:

```js
{
  scriptPath: "core_mode_catalog_runtime.js"
}
```

- [x] **Step 4: Verify audit RED**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
npm run audit:entry-manifest
```

Expected: Vitest passes, and `npm run audit:entry-manifest` FAILS because `vite.config.ts` still references `core_mode_catalog_runtime.js`.

### Task 2: Remove Mode Catalog Runtime From Active Bundle

**Files:**
- Modify: `vite.config.ts`

- [x] **Step 1: Remove the bundled legacy runtime**

Delete this entry from `HOME_STANDARD_STARTUP_FILES` in `vite.config.ts`:

```ts
"core_mode_catalog_runtime.js",
```

Do not delete `js/core_mode_catalog_runtime.js`.

- [x] **Step 2: Verify GREEN**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
npm run audit:entry-manifest
npx vitest run tests/unit/bootstrap-mode-catalog.spec.ts
PW_WEB_PORT=4279 npm run test:smoke:index-ui
```

Expected: all commands pass.

### Task 3: Documentation And Gates

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`
- Modify: `docs/superpowers/plans/2026-06-14-mode-catalog-bundle-retirement.md`

- [x] **Step 1: Update docs with Stage-1BQ evidence**

Add Stage-1BQ entries stating `core_mode_catalog_runtime.js` is retired from `HOME_STANDARD_STARTUP_FILES`, `CoreModeCatalogRuntime` remains installed from `src/bootstrap/mode-catalog.ts`, the legacy file remains in place, and `entry-manifest-audit` now blocks that Vite bundled path.

- [x] **Step 2: Run focused verification**

Run:

```bash
npx vitest run tests/unit/bootstrap-mode-catalog.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts
npm run audit:entry-manifest
npm run audit:game-manager
npm run audit:service-boundary
npm run audit:page-legacy-runtime-boundary
npm run build
PW_WEB_PORT=4279 npm run test:smoke:index-ui
npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts
```

Expected: all commands pass.

- [x] **Step 3: Run full prepush gate**

Run:

```bash
npm run verify:prepush
```

Expected: all refactor gates, critical smoke, unit tests, and build pass.

- [x] **Step 4: Commit, push, PR**

Run:

```bash
git add scripts/entry-manifest-audit.mjs tests/unit/entry-manifest-audit-helpers.spec.ts vite.config.ts docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-14-mode-catalog-bundle-retirement.md
git commit -m "refactor: retire mode catalog runtime from bundle"
git push -u origin frontend-runtime-ts-boundary-stage1bq-mode-catalog-bundle
gh pr create --title "refactor: retire mode catalog runtime from bundle" --body "<summary and test plan>"
```

Expected: PR opens against `main`; GitHub checks pass before merge.
