# Undo Stack Entry Bundle Retirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire `js/core_undo_stack_entry_runtime.js` from the active Vite-generated home startup bundle while keeping the tested TypeScript `CoreUndoStackEntryRuntime` installer as the modern owner.

**Architecture:** `src/bootstrap/undo-stack-entry-runtime.ts` already installs `CoreUndoStackEntryRuntime` before legacy game-manager scripts load, preserving legacy-tolerant undo stack entry behavior through TypeScript-owned `src/core/undo-stack-entry.ts`. This stage extends the focused Vite bundled-runtime guard, removes the legacy runtime from `HOME_STANDARD_STARTUP_FILES`, and documents that the legacy JS file plus nomodule loader reference remain for compatibility.

**Tech Stack:** TypeScript, Vitest, Vite config, Playwright smoke, existing `entry-manifest-audit`.

---

### Task 1: Bundle Retirement Guard

**Files:**
- Modify: `scripts/entry-manifest-audit.mjs`
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`

- [x] **Step 1: Write the failing bundle guard test**

Add this assertion near the retired Vite bundled runtime script tests:

```ts
it("tracks undo-stack-entry runtime as a retired Vite bundled runtime script", () => {
  expect(BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS).toContainEqual({
    scriptPath: "core_undo_stack_entry_runtime.js"
  });
});
```

- [x] **Step 2: Verify RED**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: FAIL because `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` does not yet include `core_undo_stack_entry_runtime.js`.

- [x] **Step 3: Add the bundled retired registry entry**

In `scripts/entry-manifest-audit.mjs`, add:

```js
{
  scriptPath: "core_undo_stack_entry_runtime.js"
}
```

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
npm run audit:entry-manifest
```

Expected: Vitest passes, and `npm run audit:entry-manifest` FAILS while `vite.config.ts` still references `core_undo_stack_entry_runtime.js`.

### Task 2: Remove Undo Stack Entry Runtime From Active Bundle

**Files:**
- Modify: `vite.config.ts`

- [x] **Step 1: Remove the bundled legacy runtime**

Delete this entry from `HOME_STANDARD_STARTUP_FILES`:

```ts
"core_undo_stack_entry_runtime.js",
```

Do not delete `js/core_undo_stack_entry_runtime.js`. Do not remove the nomodule loader reference in `public/js/legacy_index_nomodule_loader.js`.

- [x] **Step 2: Verify GREEN**

Run:

```bash
npx vitest run tests/unit/bootstrap-undo-stack-entry-runtime.spec.ts tests/unit/core-undo-stack-entry.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts
npm run audit:entry-manifest
```

Expected: PASS.

### Task 3: Documentation, Gates, PR

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`
- Modify: `docs/superpowers/plans/2026-06-15-undo-stack-entry-bundle-retirement.md`

- [x] **Step 1: Update docs with Stage-1CI evidence**

Add Stage-1CI entries stating `CoreUndoStackEntryRuntime` remains installed from `src/bootstrap/undo-stack-entry-runtime.ts`, `js/core_undo_stack_entry_runtime.js` is no longer included in the Vite home startup bundle, and legacy/nomodule references remain for separate policy work.

- [x] **Step 2: Run focused verification**

Run:

```bash
npx vitest run tests/unit/bootstrap-undo-stack-entry-runtime.spec.ts tests/unit/core-undo-stack-entry.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts
npm run audit:entry-manifest
npm run audit:game-manager
npm run audit:service-boundary
npm run audit:page-legacy-runtime-boundary
npm run build
PW_WEB_PORT=4297 npm run test:smoke:index-ui
npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts
```

Expected: all commands pass.

- [x] **Step 3: Run full prepush gate**

Run:

```bash
npm run verify:prepush
```

Expected: all gates pass.

- [ ] **Step 4: Commit, push, PR**

Run:

```bash
git add scripts/entry-manifest-audit.mjs tests/unit/entry-manifest-audit-helpers.spec.ts vite.config.ts docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-15-undo-stack-entry-bundle-retirement.md
git commit -m "refactor: retire undo stack entry runtime from bundle"
git push -u origin frontend-runtime-ts-boundary-stage1ci-undo-stack-entry-bundle
gh pr create --draft --title "refactor: retire undo stack entry runtime from bundle" --body "<summary and test plan>"
```

Expected: PR opens against `main`; GitHub checks pass before merge.
