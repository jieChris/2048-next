# Home Guide Bundle Retirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire `js/core_home_guide_runtime.js` from the active Vite-generated home deferred bundle path now that `CoreHomeGuideRuntime` is installed from tested TypeScript.

**Architecture:** Keep the TypeScript installer in `src/bootstrap/home-guide.ts` as the canonical modern runtime owner. Extend `entry-manifest-audit` with a focused bundled-runtime retirement guard so `core_home_guide_runtime.js` cannot re-enter `vite.config.ts` bundle file lists, then remove it from `HOME_STANDARD_DEFERRED_FILES`. Leave the legacy JS file in place for archive/nomodule compatibility.

**Tech Stack:** TypeScript, Vitest, Vite config, Playwright smoke, existing `entry-manifest-audit`.

---

### Task 1: Bundle Retirement Guard

**Files:**
- Modify: `scripts/entry-manifest-audit.mjs`
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`

- [x] **Step 1: Write the failing bundle guard test**

Add imports for the new registry and assertion:

```ts
import {
  BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS,
  ensureRetiredRuntimeScriptAbsent
} from "../../scripts/entry-manifest-audit.mjs";
```

Add this test near the retired runtime assertions:

```ts
it("tracks home-guide runtime as a retired Vite bundled runtime script", () => {
  expect(BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS).toContainEqual({
    scriptPath: "core_home_guide_runtime.js"
  });
});
```

Add this focused failure-shape test:

```ts
it("detects retired runtime references in Vite bundle config content", () => {
  expect(() =>
    ensureRetiredRuntimeScriptAbsent(
      'const HOME_STANDARD_DEFERRED_FILES = ["core_home_guide_runtime.js"];',
      "vite.config.ts",
      {
        scriptPath: "core_home_guide_runtime.js"
      }
    )
  ).toThrow(/vite\.config\.ts: retired runtime script still referenced/);
});
```

- [x] **Step 2: Verify RED**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: FAIL because `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` is not exported yet.

- [x] **Step 3: Add the bundle retired registry and audit wiring**

In `scripts/entry-manifest-audit.mjs`, add:

```js
const BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS = [
  {
    scriptPath: "core_home_guide_runtime.js"
  }
];
```

Inside `runEntryManifestAudit()`, read Vite config and enforce the registry:

```js
const viteConfig = await readUtf8("vite.config.ts");
for (const retiredRuntimeScript of BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS) {
  ensureRetiredRuntimeScriptAbsent(viteConfig, "vite.config.ts", retiredRuntimeScript);
}
```

Export the new registry:

```js
export {
  BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS,
  // existing exports...
};
```

- [x] **Step 4: Verify audit RED**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
npm run audit:entry-manifest
```

Expected: Vitest passes, and `npm run audit:entry-manifest` FAILS because `vite.config.ts` still references `core_home_guide_runtime.js`.

### Task 2: Remove Home Guide Runtime From Active Bundle

**Files:**
- Modify: `vite.config.ts`

- [x] **Step 1: Remove the bundled legacy runtime**

Delete this entry from `HOME_STANDARD_DEFERRED_FILES` in `vite.config.ts`:

```ts
"core_home_guide_runtime.js",
```

Do not delete `js/core_home_guide_runtime.js`. Do not remove the nomodule loader entry in this stage; that loader is not used by module-capable Playwright/modern Vite paths and should be handled by a separate legacy-browser policy decision.

- [x] **Step 2: Verify GREEN**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
npm run audit:entry-manifest
PW_WEB_PORT=4276 npm run test:smoke:index-ui
```

Expected: Vitest passes, manifest audit passes, and fresh-port index-ui smoke passes.

### Task 3: Documentation And Gates

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`
- Modify: `docs/superpowers/plans/2026-06-14-home-guide-bundle-retirement.md`

- [x] **Step 1: Update docs with Stage-1BM evidence**

Add Stage-1BM entries stating `core_home_guide_runtime.js` is retired from `HOME_STANDARD_DEFERRED_FILES`, `CoreHomeGuideRuntime` remains installed from `src/bootstrap/home-guide.ts`, the legacy file remains in place, and `entry-manifest-audit` now covers focused Vite bundled retirement.

- [x] **Step 2: Run focused verification**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
npm run audit:entry-manifest
npm run audit:game-manager
npm run audit:service-boundary
npm run audit:page-legacy-runtime-boundary
npm run build
PW_WEB_PORT=4276 npm run test:smoke:index-ui
npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts
```

Expected: all commands pass.

- [x] **Step 3: Run full prepush gate**

Run:

```bash
npm run verify:prepush
```

Expected: all refactor gates, critical smoke, unit tests, and build pass.

- [ ] **Step 4: Commit, push, PR**

Run:

```bash
git add scripts/entry-manifest-audit.mjs tests/unit/entry-manifest-audit-helpers.spec.ts vite.config.ts docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-14-home-guide-bundle-retirement.md
git commit -m "refactor: retire home guide runtime from bundle"
git push -u origin frontend-runtime-ts-boundary-stage1bm-home-guide-bundle
gh pr create --title "refactor: retire home guide runtime from bundle" --body "<summary and test plan>"
```

Expected: PR opens against `main`; GitHub checks pass before merge.
