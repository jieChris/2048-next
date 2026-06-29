# Game Manager Env Helpers Boundary Implementation Plan
> **For agentic workers:** Use Trellis/Trellies as the default project workflow. Before implementation, debugging, review, or code modification, check for and follow `.trellis/`, `.trellis/spec/`, Trellis task files, Trellis skills, and Trellis commands when available. Do not use legacy Superpower Skill instructions. If old Superpower instructions conflict with Trellis/Trellies, Trellis/Trellies wins. Steps use checkbox syntax for tracking.

**Goal:** Move the legacy game-manager environment helper globals from `js/core_game_manager_env_helpers_runtime.js` into a tested TypeScript boundary and install them before active legacy game-manager scripts load.

**Architecture:** Add `src/core/game-manager-env-helpers.ts` as the TypeScript owner for safe window/document/storage/method helpers. Add `src/bootstrap/game-manager-env-helpers-runtime.ts` to install the same legacy global names that active JavaScript helpers call. This stage intentionally keeps `core_game_manager_env_helpers_runtime.js` in active manifests, `HOME_STANDARD_STARTUP_FILES`, and `public/js/legacy_index_nomodule_loader.js`; retirement is later.

**Tech Stack:** TypeScript, Vitest, Playwright smoke, existing home-family bootstrap installer pattern.

---

### Task 1: RED Core Env Helper Coverage

**Files:**
- Create: `tests/unit/core-game-manager-env-helpers.spec.ts`
- Create: `src/core/game-manager-env-helpers.ts`

- [x] **Step 1: Add failing core helper tests**

Create `tests/unit/core-game-manager-env-helpers.spec.ts` with tests covering:
- inaccessible storage returns `null`
- manager document resolution prefers `manager.getWindowLike().document`
- element lookup rejects empty IDs and missing document APIs
- storage read/write capability checks
- window and namespace method resolution/calls bind the correct receiver
- `requestAnimationFrameByManager` uses `requestAnimationFrame` when present and falls back to immediate callback

- [x] **Step 2: Run RED**

Run:

```bash
npx vitest run tests/unit/core-game-manager-env-helpers.spec.ts
```

Expected: FAIL because `src/core/game-manager-env-helpers.ts` does not yet export the helpers.

Actual: FAIL because the imported helper names were not functions while `src/core/game-manager-env-helpers.ts` only exported an empty module.

### Task 2: GREEN Core Env Helper Boundary

**Files:**
- Modify: `src/core/game-manager-env-helpers.ts`

- [x] **Step 1: Implement TypeScript helpers**

Port the legacy behavior from `js/core_game_manager_env_helpers_runtime.js`:
- `getWebStorageByName`
- `getWindowLike`
- `resolveManagerDocumentLike`
- `resolveManagerElementById`
- `canReadFromStorage`
- `canWriteToStorage`
- `resolveWindowMethod`
- `callWindowMethod`
- `resolveWindowNamespaceMethod`
- `callWindowNamespaceMethod`
- `requestAnimationFrameByManager`

- [x] **Step 2: Run GREEN**

Run:

```bash
npx vitest run tests/unit/core-game-manager-env-helpers.spec.ts
```

Expected: PASS.

Actual: PASS, 7 tests.

### Task 3: RED/GREEN Runtime Installer

**Files:**
- Create: `src/bootstrap/game-manager-env-helpers-runtime.ts`
- Create: `tests/unit/bootstrap-game-manager-env-helpers-runtime.spec.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Add failing installer tests**

Create `tests/unit/bootstrap-game-manager-env-helpers-runtime.spec.ts` asserting:
- `createGameManagerEnvHelpersRuntime()` returns every legacy helper function from `src/core/game-manager-env-helpers.ts`
- `installGameManagerEnvHelpersRuntime({ windowLike })` installs missing functions
- existing functions are preserved

- [x] **Step 2: Run installer RED**

Run:

```bash
npx vitest run tests/unit/bootstrap-game-manager-env-helpers-runtime.spec.ts
```

Expected: FAIL because the installer does not exist yet.

Actual: FAIL because `../../src/bootstrap/game-manager-env-helpers-runtime` could not be resolved.

- [x] **Step 3: Implement installer and bootstrap wiring**

Add `src/bootstrap/game-manager-env-helpers-runtime.ts` following the `game-manager-base-helpers-runtime.ts` pattern. Import and call `installGameManagerEnvHelpersRuntime()` in `src/entries/home-family-bootstrap.ts` immediately after `installGameManagerBaseHelpersRuntime()`.

- [x] **Step 4: Run installer GREEN**

Run:

```bash
npx vitest run tests/unit/bootstrap-game-manager-env-helpers-runtime.spec.ts tests/unit/core-game-manager-env-helpers.spec.ts
```

Expected: PASS.

Actual: PASS, 11 tests across the core and installer specs.

### Task 4: Documentation And Verification

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`
- Modify: `docs/superpowers/plans/2026-06-17-game-manager-env-helpers-boundary.md`

- [x] **Step 1: Document Stage-1DE**

Document that TypeScript now owns game-manager env helpers and installs their legacy global names before active game-manager scripts load. Note that active manifest, Vite bundle, legacy JS file, and nomodule references remain intentionally in place for later retirement stages.

- [x] **Step 2: Run full verification**

Run:

```bash
npx vitest run tests/unit/bootstrap-game-manager-env-helpers-runtime.spec.ts tests/unit/core-game-manager-env-helpers.spec.ts
npm run audit:entry-manifest
npm run audit:game-manager
npm run audit:service-boundary
npm run audit:page-legacy-runtime-boundary
npm run build
PW_WEB_PORT=4324 npm run test:smoke:index-ui
npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts
npm run verify:prepush
```

Expected: all commands exit 0.

Actual: all commands exited 0 after a TypeScript build failure exposed that function namespaces needed an explicit indexable scope type in `src/core/game-manager-env-helpers.ts`.

Verification evidence:
- `npx vitest run tests/unit/bootstrap-game-manager-env-helpers-runtime.spec.ts tests/unit/core-game-manager-env-helpers.spec.ts`: PASS, 11 tests.
- `npm run audit:entry-manifest`: PASS.
- `npm run audit:game-manager`: PASS.
- `npm run audit:service-boundary`: PASS, `violations=0`.
- `npm run audit:page-legacy-runtime-boundary`: PASS, `legacyImports=0`.
- `npm run build`: PASS after the namespace scope type fix.
- `PW_WEB_PORT=4324 npm run test:smoke:index-ui`: PASS, 9 tests.
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`: PASS, 8 tests.
- `npm run verify:prepush`: PASS, all refactor gates passed.

### Task 5: Commit And PR

**Files:**
- Commit all files modified in this plan.

- [x] **Step 1: Commit**

Run:

```bash
git status --short
git add src/core/game-manager-env-helpers.ts src/bootstrap/game-manager-env-helpers-runtime.ts src/entries/home-family-bootstrap.ts tests/unit/core-game-manager-env-helpers.spec.ts tests/unit/bootstrap-game-manager-env-helpers-runtime.spec.ts docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-17-game-manager-env-helpers-boundary.md
git commit -m "refactor: add game manager env helpers boundary"
```

Expected: commit succeeds on `frontend-runtime-boundary-stage1de-env-helpers`.

Actual: commit `4668c16` created with message `refactor: add game manager env helpers boundary`.
