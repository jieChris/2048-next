# Game Manager Common Shell Retirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire `core_game_manager_common_runtime.js` from modern active manifests and the Vite home startup bundle while preserving the legacy nomodule compatibility path.

**Architecture:** `js/core_game_manager_common_runtime.js` is now an empty compatibility shell; modern pages should no longer import or bundle it. The entry manifest audit will track it as a retired active-manifest script and as a retired Vite bundled script, while `public/js/legacy_index_nomodule_loader.js` remains the only active legacy-browser reference.

**Tech Stack:** TypeScript entry manifests, Vite bundle config, Node audit scripts, Vitest, Playwright smoke tests.

---

### Task 1: Add Audit Coverage

**Files:**
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`
- Verify: `scripts/entry-manifest-audit.mjs`

- [x] **Step 1: Write the failing retired-reference tests**

Add these tests next to the existing retired game-manager/base-helper assertions and bundled retired runtime assertions:

```ts
it("tracks common game-manager shell as a retired active-manifest script", () => {
  expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
    scriptPath: "core_game_manager_common_runtime.js",
    symbolName: "coreGameManagerCommonRuntimeUrl"
  });
});

it("tracks common game-manager shell as a retired Vite bundled runtime script", () => {
  expect(BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS).toContainEqual({
    scriptPath: "core_game_manager_common_runtime.js"
  });
});
```

- [x] **Step 2: Run the focused test and confirm RED**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: FAIL because `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` and `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` do not yet include `core_game_manager_common_runtime.js`.

### Task 2: Retire Modern Active References

**Files:**
- Modify: `scripts/entry-manifest-audit.mjs`
- Modify: `src/entries/home-family-shared.ts`
- Modify: `src/entries/play-runtime-scripts.ts`
- Modify: `src/entries/replay-runtime-scripts.ts`
- Modify: `vite.config.ts`
- Preserve: `js/core_game_manager_common_runtime.js`
- Preserve: `public/js/legacy_index_nomodule_loader.js`

- [x] **Step 1: Register the shell as retired in audit rules**

Add this object to `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`:

```js
{
  scriptPath: "core_game_manager_common_runtime.js",
  symbolName: "coreGameManagerCommonRuntimeUrl"
}
```

Add this object to `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS`:

```js
{
  scriptPath: "core_game_manager_common_runtime.js"
}
```

- [x] **Step 2: Remove active manifest imports and array entries**

Remove `coreGameManagerCommonRuntimeUrl` import and array entries from:

```text
src/entries/home-family-shared.ts
src/entries/play-runtime-scripts.ts
src/entries/replay-runtime-scripts.ts
```

Keep the surrounding order unchanged:

```text
coreGameManagerSessionInitHelpersRuntimeUrl
coreGameManagerReplayHelpersRuntimeUrl
```

- [x] **Step 3: Remove the Vite startup bundle item**

Remove this item from `HOME_STANDARD_STARTUP_FILES` in `vite.config.ts`:

```ts
"core_game_manager_common_runtime.js",
```

- [x] **Step 4: Run the focused test and confirm GREEN**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: PASS.

### Task 3: Verify Runtime Boundaries

**Files:**
- Verify: `scripts/entry-manifest-audit.mjs`
- Verify: `scripts/game-manager-audit.mjs`
- Verify: `scripts/service-boundary-audit.mjs`
- Verify: `scripts/page-legacy-runtime-boundary-audit.mjs`

- [x] **Step 1: Run focused architecture audits**

Run:

```bash
npm run audit:entry-manifest
npm run audit:game-manager
npm run audit:service-boundary
npm run audit:page-legacy-runtime-boundary
```

Expected: all PASS. If `audit:game-manager` fails because it still models the legacy script chain, inspect the failure before changing rules; Stage 1DH does not remove the legacy nomodule chain.

- [x] **Step 2: Build the project**

Run:

```bash
npm run build
```

Expected: PASS.

- [x] **Step 3: Run smoke checks**

Run:

```bash
PW_WEB_PORT=4333 npm run test:smoke:index-ui
npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts
```

Expected: PASS. If a default port is occupied or stale, rerun with the next explicit `PW_WEB_PORT` and document the port.

- [x] **Step 4: Run prepush verification**

Run:

```bash
npm run verify:prepush
```

Expected: PASS. If Playwright/Vite reports a stale default-port state, rerun once with an explicit fresh `PW_WEB_PORT` and record the exact command.

### Task 4: Update Refactor Evidence

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`
- Modify: `docs/superpowers/plans/2026-06-17-game-manager-common-shell-retirement.md`

- [x] **Step 1: Update architecture guardrails**

Add a top entry saying Stage 1DH retired `core_game_manager_common_runtime.js` from modern active manifests and the Vite home startup bundle, while preserving the legacy nomodule compatibility reference.

- [x] **Step 2: Update roadmap milestones**

Use a byte-safe top insertion for `docs/ROADMAP_MILESTONES.md` because the file contains non-UTF-8 bytes. Add the same Stage 1DH summary and verification commands.

- [x] **Step 3: Mark this plan with evidence**

Check off completed steps and add the exact passing commands under an `Evidence` section.

## Evidence

- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed with 2 expected missing-reference assertions for `core_game_manager_common_runtime.js`.
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` passed 115 tests.
- `npm run audit:entry-manifest`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4333 npm run test:smoke:index-ui` passed 9 tests.
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts` passed 8 tests.
- `npm run verify:prepush` passed all refactor gates.

### Task 5: Ship Stage 1DH

**Files:**
- Commit all Stage 1DH changes.
- Push branch `frontend-runtime-common-shell-stage1dh-retirement`.
- Open PR titled `[codex] retire common game manager shell runtime`.

- [ ] **Step 1: Inspect git diff**

Run:

```bash
git status --short
git diff --check
git diff --stat
```

Expected: only Stage 1DH files changed and no whitespace errors.

- [ ] **Step 2: Commit**

Run:

```bash
git add scripts/entry-manifest-audit.mjs src/entries/home-family-shared.ts src/entries/play-runtime-scripts.ts src/entries/replay-runtime-scripts.ts vite.config.ts tests/unit/entry-manifest-audit-helpers.spec.ts docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-17-game-manager-common-shell-retirement.md
git commit -m "refactor: retire common game manager shell runtime"
```

Expected: commit succeeds.

- [ ] **Step 3: Push and open PR**

Run:

```bash
git push -u origin frontend-runtime-common-shell-stage1dh-retirement
gh pr create --title "[codex] retire common game manager shell runtime" --body-file /tmp/stage1dh-pr-body.md
```

Expected: PR is created.

- [ ] **Step 4: Wait for CI and merge**

Run:

```bash
gh pr checks --watch
gh pr merge --squash --delete-branch
git checkout main
git pull --ff-only
```

Expected: CI is green, PR merges, local `main` is synchronized.
