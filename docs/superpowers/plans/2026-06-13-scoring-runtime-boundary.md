# Scoring Runtime Boundary Implementation Plan
> **For agentic workers:** Use Trellis/Trellies as the default project workflow. Before implementation, debugging, review, or code modification, check for and follow `.trellis/`, `.trellis/spec/`, Trellis task files, Trellis skills, and Trellis commands when available. Do not use legacy Superpower Skill instructions. If old Superpower instructions conflict with Trellis/Trellies, Trellis/Trellies wins. Steps use checkbox syntax for tracking.

**Goal:** Retire `js/core_scoring_runtime.js` from active runtime manifests by installing `CoreScoringRuntime` from tested TypeScript before legacy game-manager scripts load.

**Architecture:** Keep `src/core/scoring.ts` as the pure scoring owner, add a bootstrap installer for the legacy global shape, and extend entry manifest audit retired-runtime registry to block scoring runtime from returning to active manifests.

**Tech Stack:** TypeScript, Vite `?url` script manifests, Vitest, existing entry manifest audit.

---

### Task 1: Guard Scoring Runtime Manifest Retirement

**Files:**
- Modify: `scripts/entry-manifest-audit.mjs`
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`

- [x] **Step 1: Write RED**

Add a test requiring `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` to include `{ scriptPath: "core_scoring_runtime.js", symbolName: "coreScoringRuntimeUrl" }`.

- [x] **Step 2: Implement registry**

Export `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` and have `runEntryManifestAudit()` check play, replay, and home-family shared runtime manifest modules against every retired runtime reference.

- [x] **Step 3: Verify guard**

Run `npm run audit:entry-manifest` before manifest removal and confirm it fails on `core_scoring_runtime.js`.

### Task 2: Install Scoring Runtime From TypeScript

**Files:**
- Create: `src/bootstrap/scoring-runtime.ts`
- Create: `tests/unit/bootstrap-scoring-runtime.spec.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Write RED**

Add tests for `createScoringRuntime()` and `installScoringRuntime()`, covering global shape, install, idempotence, and null target handling.

- [x] **Step 2: Implement installer**

Create `src/bootstrap/scoring-runtime.ts`, import `computePostMoveScore`, expose it under the `CoreScoringRuntime` shape, and install it before legacy scripts load.

- [x] **Step 3: Verify GREEN**

Run `npx vitest run tests/unit/bootstrap-scoring-runtime.spec.ts tests/unit/core-scoring.spec.ts`.

### Task 3: Remove Legacy Script From Active Manifests

**Files:**
- Modify: `src/entries/play-runtime-scripts.ts`
- Modify: `src/entries/replay-runtime-scripts.ts`
- Modify: `src/entries/home-family-shared.ts`

- [x] **Step 1: Remove import and array entries**

Delete `coreScoringRuntimeUrl` imports and remove it from play, replay, home, and capped runtime script arrays.

- [x] **Step 2: Verify manifest**

Run `npm run audit:entry-manifest`.

### Task 4: Verify Stage 1E

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`

- [x] **Step 1: Run focused tests**

Run `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-scoring.spec.ts tests/unit/bootstrap-scoring-runtime.spec.ts`.

- [x] **Step 2: Run audits and build**

Run `npm run audit:entry-manifest`, `npm run audit:game-manager`, `npm run audit:service-boundary`, `npm run audit:page-legacy-runtime-boundary`, and `npm run build`.

- [x] **Step 3: Run runtime smoke**

Run `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`.

- [x] **Step 4: Run prepush gate**

Run `npm run verify:prepush`.
