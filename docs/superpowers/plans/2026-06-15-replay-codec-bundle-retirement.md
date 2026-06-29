# Replay Codec Bundle Retirement Implementation Plan
> **For agentic workers:** Use Trellis/Trellies as the default project workflow. Before implementation, debugging, review, or code modification, check for and follow `.trellis/`, `.trellis/spec/`, Trellis task files, Trellis skills, and Trellis commands when available. Do not use legacy Superpower Skill instructions. If old Superpower instructions conflict with Trellis/Trellies, Trellis/Trellies wins. Steps use checkbox syntax for tracking.

**Goal:** Retire `js/core_replay_codec_runtime.js` from the active Vite-generated home startup bundle while keeping the tested TypeScript `CoreReplayCodecRuntime` installer as the modern owner.

**Architecture:** `src/bootstrap/replay-codec-runtime.ts` already installs `CoreReplayCodecRuntime` before legacy game-manager scripts load, preserving replay codec behavior through TypeScript-owned `src/core/replay-codec.ts`. This stage extends the focused Vite bundled-runtime guard, removes the legacy runtime from `HOME_STANDARD_STARTUP_FILES`, and documents that the legacy JS file plus nomodule loader reference remain for compatibility.

**Tech Stack:** TypeScript, Vitest, Vite config, Playwright smoke, existing `entry-manifest-audit`.

---

### Task 1: Bundle Retirement Guard

**Files:**
- Modify: `scripts/entry-manifest-audit.mjs`
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`

- [x] **Step 1: Write the failing bundle guard test**

Add this assertion near the retired Vite bundled runtime script tests:

```ts
it("tracks replay-codec runtime as a retired Vite bundled runtime script", () => {
  expect(BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS).toContainEqual({
    scriptPath: "core_replay_codec_runtime.js"
  });
});
```

- [x] **Step 2: Verify RED**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: FAIL because `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` does not yet include `core_replay_codec_runtime.js`.

- [x] **Step 3: Add the bundled retired registry entry**

In `scripts/entry-manifest-audit.mjs`, add:

```js
{
  scriptPath: "core_replay_codec_runtime.js"
}
```

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
npm run audit:entry-manifest
```

Expected: Vitest passes, and `npm run audit:entry-manifest` FAILS while `vite.config.ts` still references `core_replay_codec_runtime.js`.

### Task 2: Remove Replay Codec Runtime From Active Bundle

**Files:**
- Modify: `vite.config.ts`

- [x] **Step 1: Remove the bundled legacy runtime**

Delete this entry from `HOME_STANDARD_STARTUP_FILES`:

```ts
"core_replay_codec_runtime.js",
```

Do not delete `js/core_replay_codec_runtime.js`. Do not remove the nomodule loader reference in `public/js/legacy_index_nomodule_loader.js`.

- [x] **Step 2: Verify GREEN**

Run:

```bash
npx vitest run tests/unit/bootstrap-replay-codec-runtime.spec.ts tests/unit/core-replay-codec.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts
npm run audit:entry-manifest
```

Expected: PASS.

### Task 3: Documentation, Gates, PR

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`
- Modify: `docs/superpowers/plans/2026-06-15-replay-codec-bundle-retirement.md`

- [x] **Step 1: Update docs with Stage-1CJ evidence**

Add Stage-1CJ entries stating `CoreReplayCodecRuntime` remains installed from `src/bootstrap/replay-codec-runtime.ts`, `js/core_replay_codec_runtime.js` is no longer included in the Vite home startup bundle, and legacy/nomodule references remain for separate policy work.

- [x] **Step 2: Run focused verification**

Run:

```bash
npx vitest run tests/unit/bootstrap-replay-codec-runtime.spec.ts tests/unit/core-replay-codec.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts
npm run audit:entry-manifest
npm run audit:game-manager
npm run audit:service-boundary
npm run audit:page-legacy-runtime-boundary
npm run build
PW_WEB_PORT=4298 npm run test:smoke:index-ui
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
git add scripts/entry-manifest-audit.mjs tests/unit/entry-manifest-audit-helpers.spec.ts vite.config.ts docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-15-replay-codec-bundle-retirement.md
git commit -m "refactor: retire replay codec runtime from bundle"
git push -u origin frontend-runtime-ts-boundary-stage1cj-replay-codec-bundle
gh pr create --draft --title "refactor: retire replay codec runtime from bundle" --body "<summary and test plan>"
```

Expected: PR opens against `main`; GitHub checks pass before merge.
