# Home Guide Done Notice Host Runtime TS Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Move `CoreHomeGuideDoneNoticeHostRuntime` installation to a tested TypeScript bootstrap boundary and retire `js/core_home_guide_done_notice_host_runtime.js` from active entry manifests without deleting the legacy file.

**Architecture:** `src/bootstrap/home-guide-done-notice-host.ts` remains the TypeScript owner for home-guide completion toast creation, update, and hide timer behavior. The module exposes the legacy `window.CoreHomeGuideDoneNoticeHostRuntime` shape before home-family legacy scripts load. `entry-manifest-audit` blocks the legacy done-notice host URL from active play/home manifests.

**Tech Stack:** TypeScript, Vite URL manifests, Vitest, Playwright smoke checks, Node audit scripts.

---

### Task 1: Guard Active Manifests Against Home Guide Done Notice Host Runtime

**Files:**
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`
- Modify: `scripts/entry-manifest-audit.mjs`

- [x] **Step 1: Write the failing audit registry test**

Add a test expecting `{ scriptPath: "core_home_guide_done_notice_host_runtime.js", symbolName: "coreHomeGuideDoneNoticeHostRuntimeUrl" }` in `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

- [x] **Step 2: Run RED**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: FAIL before the retired-runtime registry entry exists.

- [x] **Step 3: Add registry entry and run GREEN**

Add the entry to `scripts/entry-manifest-audit.mjs`, then rerun the same Vitest command. Expected: PASS.

### Task 2: Install CoreHomeGuideDoneNoticeHostRuntime From TypeScript

**Files:**
- Modify: `tests/unit/bootstrap-home-guide-done-notice-host.spec.ts`
- Modify: `src/bootstrap/home-guide-done-notice-host.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Write the failing bootstrap runtime test**

Extend the existing done-notice host test file with installer tests covering runtime shape, supplied window installation, no overwrite, and null target.

- [x] **Step 2: Run RED**

Run:

```bash
npx vitest run tests/unit/bootstrap-home-guide-done-notice-host.spec.ts
```

Expected: FAIL before `createHomeGuideDoneNoticeHostRuntime()` / `installHomeGuideDoneNoticeHostRuntime()` exist.

- [x] **Step 3: Add TypeScript bootstrap installer and home-family install call**

Export `HomeGuideDoneNoticeHostRuntime`, `HomeGuideDoneNoticeHostRuntimeWindowLike`, `HomeGuideDoneNoticeHostRuntimeInstallOptions`, `createHomeGuideDoneNoticeHostRuntime()`, and `installHomeGuideDoneNoticeHostRuntime()` from `src/bootstrap/home-guide-done-notice-host.ts`. Import and call `installHomeGuideDoneNoticeHostRuntime()` in `src/entries/home-family-bootstrap.ts` before legacy scripts load.

- [x] **Step 4: Run focused GREEN**

Run:

```bash
npx vitest run tests/unit/bootstrap-home-guide-done-notice-host.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: PASS.

### Task 3: Remove Home Guide Done Notice Host Runtime From Active Manifests

**Files:**
- Modify: `src/entries/play-runtime-scripts.ts`
- Modify: `src/entries/home-family-shared.ts`

- [x] **Step 1: Run manifest audit RED**

Run:

```bash
npm run audit:entry-manifest
```

Expected: FAIL because active manifests still reference `core_home_guide_done_notice_host_runtime.js` / `coreHomeGuideDoneNoticeHostRuntimeUrl`.

- [x] **Step 2: Remove active manifest imports and exports**

Remove the `coreHomeGuideDoneNoticeHostRuntimeUrl` import and array entries from active manifest modules. Do not delete `js/core_home_guide_done_notice_host_runtime.js`.

- [x] **Step 3: Run manifest audit GREEN**

Run:

```bash
npm run audit:entry-manifest
```

Expected: PASS.

### Task 4: Document Evidence And Run Full Gates

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`
- Modify: `docs/superpowers/plans/2026-06-13-home-guide-done-notice-host-runtime-boundary.md`

- [x] **Step 1: Prepend guardrail and roadmap evidence**

Document that Stage 1AO moved `CoreHomeGuideDoneNoticeHostRuntime` installation to TypeScript, retired its active manifest URL, and preserved the legacy JS file as inactive compatibility source.

- [x] **Step 2: Run full verification**

Run:

```bash
npm run audit:entry-manifest
npm run audit:game-manager
npm run audit:service-boundary
npm run audit:page-legacy-runtime-boundary
npm run build
npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts
npm run verify:prepush
```

Expected: all commands exit 0.

- [x] **Step 3: Commit**

Run:

```bash
git status --short --branch
git diff --check
git add docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-13-home-guide-done-notice-host-runtime-boundary.md scripts/entry-manifest-audit.mjs src/bootstrap/home-guide-done-notice-host.ts src/entries/home-family-bootstrap.ts src/entries/home-family-shared.ts src/entries/play-runtime-scripts.ts tests/unit/bootstrap-home-guide-done-notice-host.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts
git commit -m "refactor: install home guide done notice host runtime from ts"
```

Expected: one focused Stage 1AO commit.

### Self-Review

- Spec coverage: registry guardrail, TS bootstrap, manifest retirement, docs, verification, and commit are covered.
- Placeholder scan: no TBD/TODO/fill-in placeholders are present.
- Type consistency: runtime names consistently use `HomeGuideDoneNoticeHost` / `coreHomeGuideDoneNoticeHostRuntimeUrl` / `CoreHomeGuideDoneNoticeHostRuntime`.
