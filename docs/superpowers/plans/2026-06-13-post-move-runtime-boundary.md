# Post-Move Runtime Boundary Implementation Plan
> **For agentic workers:** Use Trellis/Trellies as the default project workflow. Before implementation, debugging, review, or code modification, check for and follow `.trellis/`, `.trellis/spec/`, Trellis task files, Trellis skills, and Trellis commands when available. Do not use legacy Superpower Skill instructions. If old Superpower instructions conflict with Trellis/Trellies, Trellis/Trellies wins. Steps use checkbox syntax for tracking.

**Goal:** Retire `js/core_post_move_runtime.js` from active runtime manifests by installing `CorePostMoveRuntime` from tested TypeScript before legacy game-manager scripts load.

**Architecture:** Keep `src/core/post-move.ts` as the pure post-move lifecycle owner, add a bootstrap installer for the legacy global shape, and extend the retired-runtime manifest registry to block post-move runtime reintroduction.

**Tech Stack:** TypeScript, Vite `?url` script manifests, Vitest, existing entry manifest audit.

---

### Task 1: Guard Post-Move Runtime Manifest Retirement

**Files:**
- Modify: `scripts/entry-manifest-audit.mjs`
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`

- [x] **Step 1: Write RED**

Add a test requiring `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` to include `{ scriptPath: "core_post_move_runtime.js", symbolName: "corePostMoveRuntimeUrl" }`.

- [x] **Step 2: Implement registry entry**

Add post-move to the retired runtime registry and verify `npm run audit:entry-manifest` fails before manifest removal.

### Task 2: Install Post-Move Runtime From TypeScript

**Files:**
- Create: `src/bootstrap/post-move-runtime.ts`
- Create: `tests/unit/bootstrap-post-move-runtime.spec.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Write RED**

Add tests for `createPostMoveRuntime()` and `installPostMoveRuntime()`, covering global shape, install, idempotence, and null target handling.

- [x] **Step 2: Implement installer**

Create `src/bootstrap/post-move-runtime.ts`, import `computePostMoveLifecycle`, expose it under the `CorePostMoveRuntime` shape, and install it before legacy scripts load.

### Task 3: Remove Legacy Script From Active Manifests

**Files:**
- Modify: `src/entries/play-runtime-scripts.ts`
- Modify: `src/entries/replay-runtime-scripts.ts`
- Modify: `src/entries/home-family-shared.ts`

- [x] **Step 1: Remove import and array entries**

Delete `corePostMoveRuntimeUrl` imports and remove it from play, replay, home, and capped runtime script arrays.

### Task 4: Verify Stage 1F

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`

- [x] **Step 1: Run focused tests**

Run `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-post-move.spec.ts tests/unit/bootstrap-post-move-runtime.spec.ts`.

- [x] **Step 2: Run audits, build, smoke, and prepush**

Run `npm run audit:entry-manifest`, `npm run audit:game-manager`, `npm run audit:service-boundary`, `npm run audit:page-legacy-runtime-boundary`, `npm run build`, `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`, and `npm run verify:prepush`.
