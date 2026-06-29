# Post Move Bundle Retirement Implementation Plan
> **For agentic workers:** Use Trellis/Trellies as the default project workflow. Before implementation, debugging, review, or code modification, check for and follow `.trellis/`, `.trellis/spec/`, Trellis task files, Trellis skills, and Trellis commands when available. Do not use legacy Superpower Skill instructions. If old Superpower instructions conflict with Trellis/Trellies, Trellis/Trellies wins. Steps use checkbox syntax for tracking.

**Goal:** Retire `js/core_post_move_runtime.js` from the active Vite-generated home startup bundle now that `CorePostMoveRuntime` is installed from tested TypeScript.

**Architecture:** Keep `src/bootstrap/post-move-runtime.ts` as the canonical modern runtime owner and keep the legacy JS file for archive/nomodule compatibility. Extend the focused bundled-runtime retirement guard, then remove `core_post_move_runtime.js` from `HOME_STANDARD_STARTUP_FILES` in `vite.config.ts`. Do not touch `public/js/legacy_index_nomodule_loader.js` in this stage.

**Tech Stack:** TypeScript, Vitest, Vite config, Playwright smoke, existing `entry-manifest-audit`.

---

### Task 1: Bundle Retirement Guard

**Files:**
- Modify: `scripts/entry-manifest-audit.mjs`
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`

- [x] **Step 1: Write the failing bundle guard test**

Add this assertion near the retired Vite bundled runtime script tests:

```ts
it("tracks post-move runtime as a retired Vite bundled runtime script", () => {
  expect(BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS).toContainEqual({
    scriptPath: "core_post_move_runtime.js"
  });
});
```

- [x] **Step 2: Verify RED**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: FAIL because `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` does not yet include `core_post_move_runtime.js`.

- [x] **Step 3: Add the bundled retired registry entry**

In `scripts/entry-manifest-audit.mjs`, add:

```js
{
  scriptPath: "core_post_move_runtime.js"
}
```

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
npm run audit:entry-manifest
```

Expected: Vitest passes, and `npm run audit:entry-manifest` FAILS while `vite.config.ts` still references `core_post_move_runtime.js`.

### Task 2: Remove Post Move Runtime From Active Bundle

**Files:**
- Modify: `vite.config.ts`

- [x] **Step 1: Remove the bundled legacy runtime**

Delete this entry from `HOME_STANDARD_STARTUP_FILES`:

```ts
"core_post_move_runtime.js",
```

Do not delete `js/core_post_move_runtime.js`. Do not remove the nomodule loader reference in `public/js/legacy_index_nomodule_loader.js`.

- [x] **Step 2: Verify GREEN**

Run:

```bash
npx vitest run tests/unit/bootstrap-post-move-runtime.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts
npm run audit:entry-manifest
```

Expected: PASS.

### Task 3: Documentation, Gates, PR

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`
- Modify: `docs/superpowers/plans/2026-06-15-post-move-bundle-retirement.md`

- [x] **Step 1: Update docs with Stage-1CA evidence**

Add Stage-1CA entries stating `CorePostMoveRuntime` remains installed from `src/bootstrap/post-move-runtime.ts`, `js/core_post_move_runtime.js` is no longer included in the Vite home startup bundle, and legacy/nomodule references remain for separate policy work.

- [x] **Step 2: Run focused verification**

Run:

```bash
npx vitest run tests/unit/bootstrap-post-move-runtime.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts
npm run audit:entry-manifest
npm run audit:game-manager
npm run audit:service-boundary
npm run audit:page-legacy-runtime-boundary
npm run build
PW_WEB_PORT=4289 npm run test:smoke:index-ui
npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts
```

Expected: all commands pass.

- [x] **Step 3: Run full prepush gate**

Run:

```bash
npm run verify:prepush
```

Expected: all gates pass.

- [x] **Step 3a: Stabilize PR Refactor Gate smoke**

CI `Refactor Gate` failed in `tests/smoke/pages-online-submit-persist-retry.smoke.spec.ts` because the record-persist smoke depended on `online` polling timing while startup polling could still be active. The smoke now triggers the wrapped terminal submit hook directly, preserving the pending-record replay assertions while avoiding polling timing as the test driver.

Run:

```bash
npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-online-submit-persist-retry.smoke.spec.ts
npm run test:smoke:ci
```

Expected: all commands pass.

- [ ] **Step 4: Commit, push, PR**

Run:

```bash
git add scripts/entry-manifest-audit.mjs tests/unit/entry-manifest-audit-helpers.spec.ts vite.config.ts docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-15-post-move-bundle-retirement.md
git commit -m "refactor: retire post move runtime from bundle"
git push -u origin frontend-runtime-ts-boundary-stage1ca-post-move-bundle
gh pr create --draft --title "refactor: retire post move runtime from bundle" --body "<summary and test plan>"
```

Expected: PR opens against `main`; GitHub checks pass before merge.
