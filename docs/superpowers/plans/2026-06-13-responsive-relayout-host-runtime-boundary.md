# Responsive Relayout Host Runtime TS Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Move `CoreResponsiveRelayoutHostRuntime` installation to a tested TypeScript bootstrap boundary and retire `js/core_responsive_relayout_host_runtime.js` from active entry manifests without deleting the legacy file.

**Architecture:** `src/bootstrap/responsive-relayout-host.ts` remains the TypeScript owner for responsive relayout host orchestration. The module exposes the legacy `window.CoreResponsiveRelayoutHostRuntime` shape before home-family legacy scripts load. `entry-manifest-audit` blocks the legacy responsive relayout host URL from active play/home manifests.

**Tech Stack:** TypeScript, Vite URL manifests, Vitest, Playwright smoke checks, Node audit scripts.

---

### Task 1: Guard Active Manifests Against Responsive Relayout Host Runtime

**Files:**
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`
- Modify: `scripts/entry-manifest-audit.mjs`

- [x] **Step 1: Write the failing audit registry test**

Added a test expecting `{ scriptPath: "core_responsive_relayout_host_runtime.js", symbolName: "coreResponsiveRelayoutHostRuntimeUrl" }` in `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

- [x] **Step 2: Run RED**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: FAIL before the retired-runtime registry entry exists.

- [x] **Step 3: Add registry entry and run GREEN**

Added the entry to `scripts/entry-manifest-audit.mjs`, then reran the same Vitest command. Expected: PASS.

### Task 2: Install CoreResponsiveRelayoutHostRuntime From TypeScript

**Files:**
- Modify: `tests/unit/bootstrap-responsive-relayout-host.spec.ts`
- Modify: `src/bootstrap/responsive-relayout-host.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Write the failing bootstrap runtime test**

Extended the existing host test file with installer tests covering runtime shape, supplied window installation, no overwrite, and null target.

- [x] **Step 2: Run RED**

Run:

```bash
npx vitest run tests/unit/bootstrap-responsive-relayout-host.spec.ts
```

Expected: FAIL before `createResponsiveRelayoutHostRuntime()` / `installResponsiveRelayoutHostRuntime()` exist.

- [x] **Step 3: Add TypeScript bootstrap installer and home-family install call**

Exported `ResponsiveRelayoutHostRuntime`, `ResponsiveRelayoutHostRuntimeWindowLike`, `ResponsiveRelayoutHostRuntimeInstallOptions`, `createResponsiveRelayoutHostRuntime()`, and `installResponsiveRelayoutHostRuntime()` from `src/bootstrap/responsive-relayout-host.ts`. Imported and called `installResponsiveRelayoutHostRuntime()` in `src/entries/home-family-bootstrap.ts` before legacy scripts load.

- [x] **Step 4: Run focused GREEN**

Run:

```bash
npx vitest run tests/unit/bootstrap-responsive-relayout-host.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: PASS.

### Task 3: Remove Responsive Relayout Host Runtime From Active Manifests

**Files:**
- Modify: `src/entries/play-runtime-scripts.ts`
- Modify: `src/entries/home-family-shared.ts`

- [x] **Step 1: Run manifest audit RED**

Run:

```bash
npm run audit:entry-manifest
```

Expected: FAIL because active manifests still reference `core_responsive_relayout_host_runtime.js` / `coreResponsiveRelayoutHostRuntimeUrl`.

- [x] **Step 2: Remove active manifest imports and exports**

Removed the `coreResponsiveRelayoutHostRuntimeUrl` import and array entries from active manifest modules. Did not delete `js/core_responsive_relayout_host_runtime.js`.

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
- Modify: `docs/superpowers/plans/2026-06-13-responsive-relayout-host-runtime-boundary.md`

- [x] **Step 1: Prepend guardrail and roadmap evidence**

Document that Stage 1AL moved `CoreResponsiveRelayoutHostRuntime` installation to TypeScript, retired its active manifest URL, and preserved the legacy JS file as inactive compatibility source.

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
git add docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-13-responsive-relayout-host-runtime-boundary.md scripts/entry-manifest-audit.mjs src/bootstrap/responsive-relayout-host.ts src/entries/home-family-bootstrap.ts src/entries/home-family-shared.ts src/entries/play-runtime-scripts.ts tests/unit/bootstrap-responsive-relayout-host.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts
git commit -m "refactor: install responsive relayout host runtime from ts"
```

Expected: one focused Stage 1AL commit.

### Self-Review

- Spec coverage: registry guardrail, TS bootstrap, manifest retirement, docs, verification, and commit are covered.
- Placeholder scan: no TBD/TODO/fill-in placeholders are present.
- Type consistency: runtime names consistently use `ResponsiveRelayoutHost` / `coreResponsiveRelayoutHostRuntimeUrl` / `CoreResponsiveRelayoutHostRuntime`.
