# Client Record ID TypeScript Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move manager client record ID creation, assignment, and resolution behind a tested TypeScript boundary while preserving the existing legacy runtime script references for a later retirement stage.

**Architecture:** `src/core/game-manager-client-record-id.ts` owns the pure client-record-id helpers and uses `src/utils/crypto-random.ts` for random hex generation instead of reading legacy globals directly. `src/bootstrap/game-manager-client-record-id-runtime.ts` installs the legacy global function names before home/play/replay/capped scripts load, so existing JavaScript helpers can keep calling `createManagerClientRecordId`, `assignManagerClientRecordId`, and `resolveManagerClientRecordId` until their active manifests are retired.

**Tech Stack:** TypeScript, Vitest, Vite bootstrap, existing refactor audits, Playwright smoke.

---

### Task 1: Core Client Record ID Helpers

**Files:**
- Create: `src/core/game-manager-client-record-id.ts`
- Create: `tests/unit/core-game-manager-client-record-id.spec.ts`

- [x] **Step 1: Write the failing core helper tests**

Create `tests/unit/core-game-manager-client-record-id.spec.ts` with tests for:
- `createManagerClientRecordId` returns `rec_` + UUID without dashes when a random UUID provider succeeds.
- fallback IDs use `rec_<base36 date>_<24 lowercase hex chars>` when a hex provider is supplied.
- `assignManagerClientRecordId` trims supplied IDs and generates one when the supplied ID is blank.
- `resolveManagerClientRecordId` preserves an existing trimmed ID and assigns a generated ID when missing.

Run:

```bash
npx vitest run tests/unit/core-game-manager-client-record-id.spec.ts
```

Expected: FAIL because `src/core/game-manager-client-record-id.ts` does not exist.

- [x] **Step 2: Implement the TypeScript helpers**

Create `src/core/game-manager-client-record-id.ts` exporting:
- `createManagerClientRecordId(options?: ClientRecordIdOptions): string`
- `assignManagerClientRecordId(manager: ClientRecordIdManagerLike | null | undefined, nextId?: unknown, options?: ClientRecordIdOptions): string`
- `resolveManagerClientRecordId(manager: ClientRecordIdManagerLike | null | undefined, options?: ClientRecordIdOptions): string`

Implementation rules:
- Use `crypto.randomUUID()` when available and successful.
- Otherwise use `randomHex(12)` from `src/utils/crypto-random.ts`.
- Preserve legacy shapes: `rec_<uuidWithoutDashes>` or `rec_<Date.now base36>_<24 hex chars>`.
- Return `""` for nullish managers.

- [x] **Step 3: Verify GREEN**

Run:

```bash
npx vitest run tests/unit/core-game-manager-client-record-id.spec.ts
```

Expected: PASS.

### Task 2: Bootstrap Legacy Global Installer

**Files:**
- Create: `src/bootstrap/game-manager-client-record-id-runtime.ts`
- Create: `tests/unit/bootstrap-game-manager-client-record-id-runtime.spec.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Write the failing bootstrap installer tests**

Create `tests/unit/bootstrap-game-manager-client-record-id-runtime.spec.ts` with tests that:
- `createGameManagerClientRecordIdRuntime()` exposes the three core helper functions.
- `installGameManagerClientRecordIdRuntime({ windowLike })` installs `createManagerClientRecordId`, `assignManagerClientRecordId`, and `resolveManagerClientRecordId`.
- installer does not overwrite existing function properties.
- installer returns null when no window-like target is available.

Run:

```bash
npx vitest run tests/unit/bootstrap-game-manager-client-record-id-runtime.spec.ts
```

Expected: FAIL because the bootstrap installer does not exist.

- [x] **Step 2: Implement the bootstrap installer**

Create `src/bootstrap/game-manager-client-record-id-runtime.ts` exporting:
- `GameManagerClientRecordIdRuntime`
- `GameManagerClientRecordIdRuntimeWindowLike`
- `createGameManagerClientRecordIdRuntime()`
- `installGameManagerClientRecordIdRuntime(options?: GameManagerClientRecordIdRuntimeInstallOptions): GameManagerClientRecordIdRuntime | null`

Installer rule: fill missing legacy global function properties individually, and preserve existing function properties.

- [x] **Step 3: Install before legacy scripts load**

Modify `src/entries/home-family-bootstrap.ts`:
- import `installGameManagerClientRecordIdRuntime`
- call it after `installCryptoRandomRuntime()` and before legacy runtime scripts are loaded.

Do not remove `core_game_manager_client_record_id_runtime.js` from `vite.config.ts`, `src/entries/home-family-shared.ts`, `src/entries/play-runtime-scripts.ts`, or `src/entries/replay-runtime-scripts.ts` in this stage.

- [x] **Step 4: Verify GREEN**

Run:

```bash
npx vitest run tests/unit/core-game-manager-client-record-id.spec.ts tests/unit/bootstrap-game-manager-client-record-id-runtime.spec.ts tests/unit/core-game-manager-saved-state-runtime.spec.ts
npm run audit:entry-manifest
```

Expected: PASS.

### Task 3: Documentation, Gates, PR

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`
- Modify: `docs/superpowers/plans/2026-06-16-client-record-id-ts-boundary.md`

- [x] **Step 1: Update docs with Stage-1CW evidence**

Add Stage-1CW entries stating:
- `src/core/game-manager-client-record-id.ts` owns manager client record ID creation, assignment, and resolution.
- `src/bootstrap/game-manager-client-record-id-runtime.ts` installs legacy global function names before home/play/replay/capped legacy scripts load.
- active manifest and Vite bundle references to `js/core_game_manager_client_record_id_runtime.js` remain intentionally for the next retirement stage.

- [x] **Step 2: Run focused verification**

Run:

```bash
npx vitest run tests/unit/core-game-manager-client-record-id.spec.ts tests/unit/bootstrap-game-manager-client-record-id-runtime.spec.ts tests/unit/core-game-manager-saved-state-runtime.spec.ts
npm run audit:entry-manifest
npm run audit:game-manager
npm run audit:service-boundary
npm run audit:page-legacy-runtime-boundary
npm run build
PW_WEB_PORT=4313 npm run test:smoke:index-ui
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
git add src/core/game-manager-client-record-id.ts src/bootstrap/game-manager-client-record-id-runtime.ts src/entries/home-family-bootstrap.ts tests/unit/core-game-manager-client-record-id.spec.ts tests/unit/bootstrap-game-manager-client-record-id-runtime.spec.ts docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-16-client-record-id-ts-boundary.md
git commit -m "refactor: add client record id ts boundary"
git push -u origin frontend-runtime-ts-boundary-stage1cw-client-record-id
gh pr create --draft --base main --head frontend-runtime-ts-boundary-stage1cw-client-record-id --title "refactor: add client record id ts boundary" --body "<summary and test plan>"
```

Expected: PR opens against `main`; GitHub checks pass before merge.
