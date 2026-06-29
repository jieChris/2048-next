# Timer Interval Runtime Boundary Implementation Plan
> **For agentic workers:** Use Trellis/Trellies as the default project workflow. Before implementation, debugging, review, or code modification, check for and follow `.trellis/`, `.trellis/spec/`, Trellis task files, Trellis skills, and Trellis commands when available. Do not use legacy Superpower Skill instructions. If old Superpower instructions conflict with Trellis/Trellies, Trellis/Trellies wins. Steps use checkbox syntax for tracking.

**Goal:** Retire `js/core_timer_interval_runtime.js` from entry runtime manifests by installing `CoreTimerIntervalRuntime` from tested TypeScript before legacy game-manager scripts load.

**Architecture:** Keep `src/core/timer-interval.ts` as the pure logic owner, add a small bootstrap installer that exposes the existing runtime global shape, and guard the manifest against reintroducing the retired script. The legacy JS file remains on disk during this stage; Stage 1D only removes it from active runtime script chains.

**Tech Stack:** TypeScript, Vite `?url` script manifests, Vitest, existing entry manifest audit.

---

### Task 1: Guard Retired Runtime Script Manifests

**Files:**
- Modify: `scripts/entry-manifest-audit.mjs`
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`

- [x] **Step 1: Write the failing test**

Add a test that calls `ensureRetiredRuntimeScriptAbsent(...)` with module content containing `coreTimerIntervalRuntimeUrl` and `core_timer_interval_runtime.js?url`, expecting a retirement error.

- [x] **Step 2: Run RED**

Run: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`
Expected: FAIL because `ensureRetiredRuntimeScriptAbsent` is not exported yet.

- [x] **Step 3: Implement the helper and audit calls**

Implement `ensureRetiredRuntimeScriptAbsent(moduleContent, moduleName, retiredScript)` in `scripts/entry-manifest-audit.mjs`, export it, and call it for `src/entries/play-runtime-scripts.ts` and `src/entries/home-family-shared.ts`.

- [x] **Step 4: Run GREEN**

Run: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`
Expected: PASS.

### Task 2: Install Timer Interval Runtime From TypeScript

**Files:**
- Create: `src/bootstrap/timer-interval-runtime.ts`
- Create: `tests/unit/bootstrap-timer-interval-runtime.spec.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Write the failing installer test**

Add tests that import `createTimerIntervalRuntime` and `installTimerIntervalRuntime`, assert the runtime exposes the four timer functions, returns existing runtime objects without overwriting, and returns `null` when no window-like object exists.

- [x] **Step 2: Run RED**

Run: `npx vitest run tests/unit/bootstrap-timer-interval-runtime.spec.ts`
Expected: FAIL because `src/bootstrap/timer-interval-runtime.ts` does not exist yet.

- [x] **Step 3: Implement the installer**

Create `src/bootstrap/timer-interval-runtime.ts` that imports the four functions from `src/core/timer-interval.ts`, returns them from `createTimerIntervalRuntime()`, and installs them on `windowLike.CoreTimerIntervalRuntime` only when missing.

- [x] **Step 4: Wire bootstrap order**

Import `installTimerIntervalRuntime` in `src/entries/home-family-bootstrap.ts` and call it after `installAdminRescueClientServiceBoundary()` but before `loadLegacyScriptsSequentially(...)`.

- [x] **Step 5: Run GREEN**

Run: `npx vitest run tests/unit/bootstrap-timer-interval-runtime.spec.ts tests/unit/core-timer-interval.spec.ts`
Expected: PASS.

### Task 3: Remove Legacy Script From Active Manifests

**Files:**
- Modify: `src/entries/play-runtime-scripts.ts`
- Modify: `src/entries/home-family-shared.ts`

- [x] **Step 1: Remove import and array entries**

Delete `coreTimerIntervalRuntimeUrl` imports and remove `coreTimerIntervalRuntimeUrl` from `playLegacyScripts`, `homeCoreScripts`, and `cappedCoreScripts`.

- [x] **Step 2: Run manifest audit**

Run: `npm run audit:entry-manifest`
Expected: PASS with no retired runtime reference.

### Task 4: Verify Stage 1D

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`

- [x] **Step 1: Run focused checks**

Run: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-timer-interval.spec.ts tests/unit/bootstrap-timer-interval-runtime.spec.ts`
Expected: PASS.

- [x] **Step 2: Run audits and build**

Run: `npm run audit:entry-manifest && npm run audit:game-manager && npm run audit:service-boundary && npm run build`
Expected: PASS.

- [x] **Step 3: Run runtime smoke**

Run: `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
Expected: PASS.

- [x] **Step 4: Run prepush gate**

Run: `npm run verify:prepush`
Expected: PASS.

- [x] **Step 5: Document and commit**

Update guardrail and roadmap notes with Stage 1D evidence, then commit with `refactor: install timer interval runtime from ts`.
