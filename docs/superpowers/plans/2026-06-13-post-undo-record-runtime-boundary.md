# Post Undo Record Runtime Boundary Implementation Plan
> **For agentic workers:** Use Trellis/Trellies as the default project workflow. Before implementation, debugging, review, or code modification, check for and follow `.trellis/`, `.trellis/spec/`, Trellis task files, Trellis skills, and Trellis commands when available. Do not use legacy Superpower Skill instructions. If old Superpower instructions conflict with Trellis/Trellies, Trellis/Trellies wins. Steps use checkbox syntax for tracking.

**Goal:** Retire `js/core_post_undo_record_runtime.js` from active runtime manifests by installing `CorePostUndoRecordRuntime` from tested TypeScript before legacy game-manager scripts load.

**Architecture:** Keep `src/core/post-undo-record.ts` as the pure decision owner. Add a bootstrap installer that exposes the legacy global runtime shape and delegates to the TypeScript owner without changing existing undo recording behavior.

**Tech Stack:** TypeScript, Vite `?url` script manifests, Vitest, existing entry manifest audit.

---

### Task 1: Guard Post-Undo-Record Runtime Manifest Retirement

**Files:**
- Modify: `scripts/entry-manifest-audit.mjs`
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`

- [x] **Step 1: Write RED**

Add a test requiring `{ scriptPath: "core_post_undo_record_runtime.js", symbolName: "corePostUndoRecordRuntimeUrl" }` in `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

- [x] **Step 2: Run RED**

Run: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`

Expected: FAIL until the retired registry includes post-undo-record.

- [x] **Step 3: Implement registry entry**

Add `core_post_undo_record_runtime.js` / `corePostUndoRecordRuntimeUrl` to `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

### Task 2: Install Post-Undo-Record Runtime From TypeScript

**Files:**
- Create: `src/bootstrap/post-undo-record-runtime.ts`
- Create: `tests/unit/bootstrap-post-undo-record-runtime.spec.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Write RED**

Create tests that require `createPostUndoRecordRuntime()` to expose `computePostUndoRecord`; match `src/core/post-undo-record.ts`; install on `CorePostUndoRecordRuntime`; avoid overwriting an existing runtime; and return `null` for a null target.

- [x] **Step 2: Run RED**

Run: `npx vitest run tests/unit/bootstrap-post-undo-record-runtime.spec.ts`

Expected: FAIL because `src/bootstrap/post-undo-record-runtime.ts` does not exist.

- [x] **Step 3: Implement installer**

Create `src/bootstrap/post-undo-record-runtime.ts` with a runtime object delegating `computePostUndoRecord` to `src/core/post-undo-record.ts`.

- [x] **Step 4: Install before legacy scripts**

Import and call `installPostUndoRecordRuntime()` in `src/entries/home-family-bootstrap.ts` before legacy game-manager scripts load.

### Task 3: Remove Legacy Script From Active Manifests

**Files:**
- Modify: `src/entries/play-runtime-scripts.ts`
- Modify: `src/entries/replay-runtime-scripts.ts`
- Modify: `src/entries/home-family-shared.ts`

- [x] **Step 1: Remove import and array entries**

Delete `corePostUndoRecordRuntimeUrl` imports and remove `corePostUndoRecordRuntimeUrl` from play, replay, home, and capped runtime script arrays.

- [x] **Step 2: Run manifest audit**

Run: `npm run audit:entry-manifest`

Expected: PASS after every active manifest reference has been removed.

### Task 4: Verify and Document Stage 1N

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`

- [x] **Step 1: Run focused GREEN checks**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-post-undo-record.spec.ts tests/unit/bootstrap-post-undo-record-runtime.spec.ts
```

Expected: PASS.

- [x] **Step 2: Run audits, build, smoke, and prepush**

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

- [x] **Step 3: Document evidence**

Prepend Stage 1N evidence to `docs/ARCHITECTURE_GUARDRAILS.md` and `docs/ROADMAP_MILESTONES.md`.
