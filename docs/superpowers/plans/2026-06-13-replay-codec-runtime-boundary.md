# Replay Codec Runtime TS Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Move `CoreReplayCodecRuntime` installation to a tested TypeScript bootstrap boundary and retire `js/core_replay_codec_runtime.js` from active entry manifests without deleting the legacy file.

**Architecture:** `src/core/replay-codec.ts` remains the pure TypeScript owner for replay128, board v4, compact log, ULEB128, CRC32, replay v1 encode/decode, and replay v1 mapping behavior. A new `src/bootstrap/replay-codec-runtime.ts` exposes the legacy `window.CoreReplayCodecRuntime` shape and preserves nullable-object tolerance where the legacy runtime accepted missing payloads. `entry-manifest-audit` blocks the legacy codec URL from active play/replay/home/capped manifests.

**Tech Stack:** TypeScript, Vite URL manifests, Vitest, Playwright smoke checks, Node audit scripts.

---

### Task 1: Guard Active Manifests Against Replay Codec Runtime

**Files:**
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`
- Modify: `scripts/entry-manifest-audit.mjs`

- [x] **Step 1: Write the failing audit registry test**

Add this test after the replay-execution retired-runtime test:

```ts
  it("tracks replay-codec runtime as a retired active-manifest script", () => {
    expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
      scriptPath: "core_replay_codec_runtime.js",
      symbolName: "coreReplayCodecRuntimeUrl"
    });
  });
```

- [x] **Step 2: Run the focused audit helper test to verify RED**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: FAIL because `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` does not yet include `core_replay_codec_runtime.js`.

- [x] **Step 3: Add the retired runtime registry entry**

Append this object after the replay-execution entry in `scripts/entry-manifest-audit.mjs`:

```js
  {
    scriptPath: "core_replay_codec_runtime.js",
    symbolName: "coreReplayCodecRuntimeUrl"
  }
```

- [x] **Step 4: Run the focused audit helper test to verify GREEN**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: PASS.

### Task 2: Install CoreReplayCodecRuntime From TypeScript

**Files:**
- Create: `tests/unit/bootstrap-replay-codec-runtime.spec.ts`
- Create: `src/bootstrap/replay-codec-runtime.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Write the failing bootstrap runtime test**

Create `tests/unit/bootstrap-replay-codec-runtime.spec.ts` with runtime shape, core parity, legacy fallback, install, no-overwrite, and null-target tests.

Run:

```bash
npx vitest run tests/unit/bootstrap-replay-codec-runtime.spec.ts
```

Expected: FAIL because `src/bootstrap/replay-codec-runtime.ts` does not exist.

- [x] **Step 2: Add the TypeScript bootstrap installer**

Create `src/bootstrap/replay-codec-runtime.ts` that imports all public codec constants/functions from `src/core/replay-codec.ts`, creates the legacy `CoreReplayCodecRuntime` object, normalizes nullable object payloads for `encodeReplayV1Rpl`, `appendCompactMoveCode`, `appendCompactPracticeAction`, and rule-set arguments, and installs it on a supplied or browser `window` target.

- [x] **Step 3: Install the runtime before legacy scripts load**

Modify `src/entries/home-family-bootstrap.ts`:

```ts
import { installReplayCodecRuntime } from "../bootstrap/replay-codec-runtime";
```

Call it in the replay runtime installer section before `installReplayControlRuntime()`:

```ts
  installReplayCodecRuntime();
  installReplayControlRuntime();
```

- [x] **Step 4: Run focused tests to verify GREEN**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-replay-codec.spec.ts tests/unit/bootstrap-replay-codec-runtime.spec.ts
```

Expected: PASS.

### Task 3: Remove Replay Codec Runtime From Active Manifests

**Files:**
- Modify: `src/entries/play-runtime-scripts.ts`
- Modify: `src/entries/replay-runtime-scripts.ts`
- Modify: `src/entries/home-family-shared.ts`

- [x] **Step 1: Run manifest audit to verify RED**

Run:

```bash
npm run audit:entry-manifest
```

Expected: FAIL because active manifests still reference `core_replay_codec_runtime.js` / `coreReplayCodecRuntimeUrl`.

- [x] **Step 2: Remove active manifest imports and exports**

Remove the `coreReplayCodecRuntimeUrl` import and every exported array entry from:

```ts
src/entries/play-runtime-scripts.ts
src/entries/replay-runtime-scripts.ts
src/entries/home-family-shared.ts
```

Do not delete `js/core_replay_codec_runtime.js`.

- [x] **Step 3: Run manifest audit to verify GREEN**

Run:

```bash
npm run audit:entry-manifest
```

Expected: PASS.

### Task 4: Document Evidence And Run Full Gates

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`
- Modify: `docs/superpowers/plans/2026-06-13-replay-codec-runtime-boundary.md`

- [x] **Step 1: Prepend architecture guardrail evidence**

Prepend a Stage-1AB section documenting the TypeScript codec bootstrap owner, active manifest retirement, audit guardrail, RED/GREEN commands, audits, build, smoke, and `verify:prepush`.

- [x] **Step 2: Prepend roadmap evidence with byte-safe tooling**

Use `perl -0pi` to prepend a Stage-1AB roadmap section to `docs/ROADMAP_MILESTONES.md`.

- [x] **Step 3: Run full local verification**

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

- [x] **Step 4: Commit Stage 1AB**

Run:

```bash
git status --short --branch
git diff --check
git add docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-13-replay-codec-runtime-boundary.md scripts/entry-manifest-audit.mjs src/bootstrap/replay-codec-runtime.ts src/entries/home-family-bootstrap.ts src/entries/home-family-shared.ts src/entries/play-runtime-scripts.ts src/entries/replay-runtime-scripts.ts tests/unit/bootstrap-replay-codec-runtime.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts
git commit -m "refactor: install replay codec runtime from ts"
```

Expected: one focused commit containing only Stage 1AB files.

### Self-Review

- Spec coverage: the plan covers registry guardrail, TS bootstrap installer, manifest retirement, docs, verification, and commit.
- Placeholder scan: no TBD/TODO/fill-in placeholders are present.
- Type consistency: runtime names, file names, and symbol names consistently use `ReplayCodec` / `coreReplayCodecRuntimeUrl` / `CoreReplayCodecRuntime`.
