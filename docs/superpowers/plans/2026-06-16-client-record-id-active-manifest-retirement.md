# Client Record ID Active Manifest Retirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire `core_game_manager_client_record_id_runtime.js` from active home/play/replay/capped manifests while keeping the Vite home startup bundle and legacy JS file intact for the next bundle-retirement stage.

**Architecture:** `src/bootstrap/game-manager-client-record-id-runtime.ts` already installs the legacy global client-record-id helpers from the new TypeScript core. This stage removes the active manifest references from `src/entries/home-family-shared.ts`, `src/entries/play-runtime-scripts.ts`, and `src/entries/replay-runtime-scripts.ts`, while intentionally leaving `vite.config.ts` and `public/js/legacy_index_nomodule_loader.js` untouched so the bundle and legacy-browser retirement stages stay separate.

**Tech Stack:** TypeScript, Vitest, Vite entry manifests, existing refactor audits, Playwright smoke.

---

### Task 1: Active Manifest Retirement Guard

**Files:**
- Modify: `scripts/entry-manifest-audit.mjs`
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`

- [x] **Step 1: Write the failing active-manifest guard test**

Add this assertion near the other retired active-manifest script tests:

```ts
it("tracks client-record-id runtime as a retired active-manifest script", () => {
  expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
    scriptPath: "core_game_manager_client_record_id_runtime.js",
    symbolName: "coreGameManagerClientRecordIdRuntimeUrl"
  });
});
```

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: FAIL because `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` does not yet include `core_game_manager_client_record_id_runtime.js`.

- [x] **Step 2: Add the retired manifest registry entry**

In `scripts/entry-manifest-audit.mjs`, add:

```js
{
  scriptPath: "core_game_manager_client_record_id_runtime.js",
  symbolName: "coreGameManagerClientRecordIdRuntimeUrl"
}
```

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
npm run audit:entry-manifest
```

Expected: Vitest passes, and `npm run audit:entry-manifest` fails while active manifests still reference `core_game_manager_client_record_id_runtime.js`.

### Task 2: Remove Client Record ID Runtime From Active Manifests

**Files:**
- Modify: `src/entries/home-family-shared.ts`
- Modify: `src/entries/play-runtime-scripts.ts`
- Modify: `src/entries/replay-runtime-scripts.ts`

- [x] **Step 1: Remove the active-manifest imports and array entries**

Delete the `coreGameManagerClientRecordIdRuntimeUrl` import and array entries from:
- `src/entries/home-family-shared.ts`
- `src/entries/play-runtime-scripts.ts`
- `src/entries/replay-runtime-scripts.ts`

Do not change `vite.config.ts`, `public/js/legacy_index_nomodule_loader.js`, or `src/bootstrap/game-manager-client-record-id-runtime.ts` in this stage.

- [x] **Step 2: Verify GREEN**

Run:

```bash
npx vitest run tests/unit/bootstrap-game-manager-client-record-id-runtime.spec.ts tests/unit/core-game-manager-client-record-id.spec.ts tests/unit/core-game-manager-saved-state-runtime.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts
npm run audit:entry-manifest
```

Expected: PASS.

### Task 3: Documentation, Gates, PR

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`
- Modify: `docs/superpowers/plans/2026-06-16-client-record-id-active-manifest-retirement.md`

- [x] **Step 1: Update docs with Stage-1CX evidence**

Add Stage-1CX entries stating:
- `core_game_manager_client_record_id_runtime.js` is no longer referenced by active home/play/replay/capped manifests.
- `src/bootstrap/game-manager-client-record-id-runtime.ts` still installs the legacy helper names.
- `vite.config.ts` and `public/js/legacy_index_nomodule_loader.js` still reference the legacy runtime intentionally for later bundle/browser policy work.

- [x] **Step 2: Run focused verification**

Run:

```bash
npx vitest run tests/unit/bootstrap-game-manager-client-record-id-runtime.spec.ts tests/unit/core-game-manager-client-record-id.spec.ts tests/unit/core-game-manager-saved-state-runtime.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts
npm run audit:entry-manifest
npm run audit:game-manager
npm run audit:service-boundary
npm run audit:page-legacy-runtime-boundary
npm run build
PW_WEB_PORT=4314 npm run test:smoke:index-ui
npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts
```

Expected: all commands pass.

- [x] **Step 3: Run full prepush gate**

Run:

```bash
npm run verify:prepush
```

Expected: all gates pass.

- [x] **Step 4: Commit, push, PR**

Run:

```bash
git add scripts/entry-manifest-audit.mjs tests/unit/entry-manifest-audit-helpers.spec.ts src/entries/home-family-shared.ts src/entries/play-runtime-scripts.ts src/entries/replay-runtime-scripts.ts docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-16-client-record-id-active-manifest-retirement.md
git commit -m "refactor: retire client record id runtime from active manifests"
git push -u origin frontend-runtime-ts-boundary-stage1cx-client-record-id-manifest
gh pr create --draft --base main --head frontend-runtime-ts-boundary-stage1cx-client-record-id-manifest --title "refactor: retire client record id runtime from active manifests" --body "<summary and test plan>"
```

Expected: PR opens against `main`; GitHub checks pass before merge.
