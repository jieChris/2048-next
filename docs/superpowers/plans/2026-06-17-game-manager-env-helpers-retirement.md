# Game Manager Env Helpers Retirement Implementation Plan
> **For agentic workers:** Use Trellis/Trellies as the default project workflow. Before implementation, debugging, review, or code modification, check for and follow `.trellis/`, `.trellis/spec/`, Trellis task files, Trellis skills, and Trellis commands when available. Do not use legacy Superpower Skill instructions. If old Superpower instructions conflict with Trellis/Trellies, Trellis/Trellies wins. Steps use checkbox syntax for tracking.

**Goal:** Retire `core_game_manager_env_helpers_runtime.js` from modern active manifests and the Vite home startup bundle while preserving the legacy nomodule compatibility path.

**Architecture:** `src/bootstrap/game-manager-env-helpers-runtime.ts` installs the migrated env-helper globals before any active home-family legacy scripts load. The legacy `js/core_game_manager_env_helpers_runtime.js` file stays available for the separate nomodule path, but active manifests and the Vite startup bundle should no longer import or ship it.

**Tech Stack:** TypeScript entry manifests, Vite bundle config, Node audit scripts, Vitest, Playwright smoke tests.

---

### Task 1: Add Audit Coverage

**Files:**
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`
- Verify: `scripts/entry-manifest-audit.mjs`

- [x] **Step 1: Write the failing retired-reference tests**

Add these tests next to the existing retired game-manager helper assertions:

```ts
it("tracks env-helpers runtime as a retired active-manifest script", () => {
  expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
    scriptPath: "core_game_manager_env_helpers_runtime.js",
    symbolName: "coreGameManagerEnvHelpersRuntimeUrl"
  });
});

it("tracks env-helpers runtime as a retired Vite bundled runtime script", () => {
  expect(BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS).toContainEqual({
    scriptPath: "core_game_manager_env_helpers_runtime.js"
  });
});
```

- [x] **Step 2: Run the focused test and confirm RED**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: FAIL because `core_game_manager_env_helpers_runtime.js` is not yet listed in either retired-reference collection.

### Task 2: Retire Modern Active References

**Files:**
- Modify: `scripts/entry-manifest-audit.mjs`
- Modify: `src/entries/home-family-shared.ts`
- Modify: `src/entries/play-runtime-scripts.ts`
- Modify: `src/entries/replay-runtime-scripts.ts`
- Modify: `vite.config.ts`
- Preserve: `js/core_game_manager_env_helpers_runtime.js`
- Preserve: `public/js/legacy_index_nomodule_loader.js`

- [x] **Step 1: Register env helpers as retired in audit rules**

Add this object to `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`:

```js
{
  scriptPath: "core_game_manager_env_helpers_runtime.js",
  symbolName: "coreGameManagerEnvHelpersRuntimeUrl"
}
```

Add this object to `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS`:

```js
{
  scriptPath: "core_game_manager_env_helpers_runtime.js"
}
```

- [x] **Step 2: Remove active manifest imports and array entries**

Remove `coreGameManagerEnvHelpersRuntimeUrl` import and array entries from:

```text
src/entries/home-family-shared.ts
src/entries/play-runtime-scripts.ts
src/entries/replay-runtime-scripts.ts
```

Keep the surrounding order unchanged:

```text
localHistoryStoreUrl
coreGameManagerRuntimeCallHelpersRuntimeUrl
```

- [x] **Step 3: Remove the Vite startup bundle item**

Remove this item from `HOME_STANDARD_STARTUP_FILES` in `vite.config.ts`:

```ts
"core_game_manager_env_helpers_runtime.js",
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

Expected: all PASS. If `audit:game-manager` fails due to a legacy-chain expectation, inspect the failure before changing rules because Stage 1DI does not remove the legacy nomodule chain.

- [x] **Step 2: Build the project**

Run:

```bash
npm run build
```

Expected: PASS.

- [x] **Step 3: Run smoke checks**

Run:

```bash
PW_WEB_PORT=4334 npm run test:smoke:index-ui
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
- Modify: `docs/superpowers/plans/2026-06-17-game-manager-env-helpers-retirement.md`

- [x] **Step 1: Update architecture guardrails**

Add a top entry saying Stage 1DI retired `core_game_manager_env_helpers_runtime.js` from modern active manifests and the Vite home startup bundle, while preserving the legacy nomodule compatibility reference.

- [x] **Step 2: Update roadmap milestones**

Use a byte-safe top insertion for `docs/ROADMAP_MILESTONES.md` because the file contains non-UTF-8 bytes. Add the same Stage 1DI summary and verification commands.

- [x] **Step 3: Mark this plan with evidence**

Check off completed steps and add the exact passing commands under an `Evidence` section.

## Evidence

- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed with 2 expected missing-reference assertions for `core_game_manager_env_helpers_runtime.js`.
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` passed 117 tests.
- `npm run audit:entry-manifest`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4334 npm run test:smoke:index-ui` passed 9 tests.
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts` passed 8 tests.
- `npm run verify:prepush` passed all refactor gates.

### Task 5: Ship Stage 1DI

**Files:**
- Commit all Stage 1DI changes.
- Push branch `frontend-runtime-env-helpers-stage1di-retirement`.
- Open PR titled `[codex] retire env game manager helpers runtime`.

- [ ] **Step 1: Inspect git diff**

Run:

```bash
git status --short
git diff --check
git diff --stat
```

Expected: only Stage 1DI files changed and no whitespace errors.

- [ ] **Step 2: Commit**

Run:

```bash
git add scripts/entry-manifest-audit.mjs src/entries/home-family-shared.ts src/entries/play-runtime-scripts.ts src/entries/replay-runtime-scripts.ts vite.config.ts tests/unit/entry-manifest-audit-helpers.spec.ts docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-17-game-manager-env-helpers-retirement.md
git commit -m "refactor: retire env game manager helpers runtime"
```

Expected: commit succeeds.

- [ ] **Step 3: Push and open PR**

Run:

```bash
git push -u origin frontend-runtime-env-helpers-stage1di-retirement
gh pr create --title "[codex] retire env game manager helpers runtime" --body-file /tmp/stage1di-pr-body.md
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
