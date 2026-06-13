# Crypto Random Runtime Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install the legacy `CoreCryptoRandomRuntime` global from tested TypeScript and retire `js/core_crypto_random_runtime.js` from active home/play/replay/capped runtime manifests without deleting the legacy file.

**Architecture:** Extend `src/utils/crypto-random.ts` so it owns the complete legacy runtime shape: random value filling, integer/float helpers, seed/hex/base36/id generation, and a non-overwriting installer. `src/entries/home-family-bootstrap.ts` installs the runtime before legacy manifests are loaded, preserving the current script order contract for all downstream legacy scripts that read `CoreCryptoRandomRuntime`.

**Tech Stack:** TypeScript, Vitest, Vite URL runtime manifests, Playwright smoke, existing `entry-manifest-audit`.

---

### Task 1: TypeScript Runtime Shape

**Files:**
- Modify: `src/utils/crypto-random.ts`
- Create: `tests/unit/crypto-random.spec.ts`

- [x] **Step 1: Write the failing runtime installer test**

Add tests that import the public TS helpers plus `createCryptoRandomRuntime` and `installCryptoRandomRuntime`:

```ts
import { describe, expect, it } from "vitest";

import {
  createCryptoRandomRuntime,
  fillRandomValues,
  installCryptoRandomRuntime,
  randomBase36,
  randomHex,
  randomId,
  randomInt,
  randomSeed,
  randomUint32,
  randomUnitFloat,
  type CryptoRandomRuntime
} from "../../src/utils/crypto-random";

describe("crypto random runtime installer", () => {
  it("creates the legacy CoreCryptoRandomRuntime shape from TypeScript functions", () => {
    const runtime = createCryptoRandomRuntime();

    expect(runtime.fillRandomValues).toBe(fillRandomValues);
    expect(runtime.randomUint32).toBe(randomUint32);
    expect(runtime.randomUnitFloat).toBe(randomUnitFloat);
    expect(runtime.randomInt).toBe(randomInt);
    expect(runtime.randomSeed).toBe(randomSeed);
    expect(runtime.randomHex).toBe(randomHex);
    expect(runtime.randomBase36).toBe(randomBase36);
    expect(runtime.randomId).toBe(randomId);
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreCryptoRandomRuntime?: CryptoRandomRuntime } = {};

    const installed = installCryptoRandomRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreCryptoRandomRuntime);
    expect(installed?.randomHex).toBeTypeOf("function");
  });

  it("does not overwrite an existing crypto random runtime", () => {
    const existing = createCryptoRandomRuntime();
    const windowLike = { CoreCryptoRandomRuntime: existing };

    const installed = installCryptoRandomRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreCryptoRandomRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installCryptoRandomRuntime({ windowLike: null })).toBeNull();
  });
});
```

- [x] **Step 2: Verify RED**

Run:

```bash
npx vitest run tests/unit/crypto-random.spec.ts
```

Expected: FAIL because `createCryptoRandomRuntime`, `installCryptoRandomRuntime`, `randomSeed`, and `randomHex` are not exported yet.

- [x] **Step 3: Implement the runtime shape**

Update `src/utils/crypto-random.ts` so it exports:

```ts
export interface CryptoRandomOptions {
  requireCrypto?: boolean;
  length?: number;
}

export interface CryptoRandomRuntime {
  fillRandomValues: typeof fillRandomValues;
  randomUint32: typeof randomUint32;
  randomUnitFloat: typeof randomUnitFloat;
  randomInt: typeof randomInt;
  randomSeed: typeof randomSeed;
  randomHex: typeof randomHex;
  randomBase36: typeof randomBase36;
  randomId: typeof randomId;
}

export interface CryptoRandomRuntimeWindowLike {
  CoreCryptoRandomRuntime?: CryptoRandomRuntime;
}

export interface CryptoRandomRuntimeInstallOptions {
  windowLike?: CryptoRandomRuntimeWindowLike | null | undefined;
}
```

Also preserve legacy behavior:

```ts
export function randomSeed(options?: CryptoRandomOptions): number {
  const values = new Uint32Array(2);
  fillRandomValues(values, options);
  return ((values[0] & 0x1fffff) * 4294967296) + (values[1] >>> 0);
}

export function randomHex(byteCount: number, options?: CryptoRandomOptions): string {
  const count = Math.max(0, Math.floor(Number(byteCount) || 0));
  if (!count) return "";
  const bytes = new Uint8Array(count);
  fillRandomValues(bytes, options);
  let out = "";
  for (let i = 0; i < bytes.length; i += 1) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}
```

Make `randomId(prefix, options)` accept the legacy `{ length }` options object while keeping the previous numeric overload.

- [x] **Step 4: Verify GREEN**

Run:

```bash
npx vitest run tests/unit/crypto-random.spec.ts
```

Expected: PASS.

### Task 2: Manifest Retirement

**Files:**
- Modify: `src/entries/home-family-bootstrap.ts`
- Modify: `src/entries/home-family-shared.ts`
- Modify: `src/entries/play-runtime-scripts.ts`
- Modify: `src/entries/replay-runtime-scripts.ts`
- Modify: `scripts/entry-manifest-audit.mjs`
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`

- [x] **Step 1: Write the failing manifest audit test**

Add an assertion to `tests/unit/entry-manifest-audit-helpers.spec.ts` requiring:

```ts
expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toEqual(
  expect.arrayContaining([
    expect.objectContaining({
      scriptPath: "core_crypto_random_runtime.js",
      symbolName: "coreCryptoRandomRuntimeUrl"
    })
  ])
);
```

- [x] **Step 2: Verify RED**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: FAIL because the retired runtime registry does not include `core_crypto_random_runtime.js`.

- [x] **Step 3: Install and retire**

Import and call `installCryptoRandomRuntime()` in `src/entries/home-family-bootstrap.ts` before legacy runtime scripts are loaded. Remove `coreCryptoRandomRuntimeUrl` imports and array entries from `home-family-shared.ts`, `play-runtime-scripts.ts`, and `replay-runtime-scripts.ts`. Add the retired registry entry in `scripts/entry-manifest-audit.mjs`.

- [x] **Step 4: Verify GREEN**

Run:

```bash
npx vitest run tests/unit/crypto-random.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts
npm run audit:entry-manifest
```

Expected: both Vitest files pass and the manifest audit reports no active `core_crypto_random_runtime.js` references.

### Task 3: Documentation And Gates

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`
- Modify: `docs/superpowers/plans/2026-06-14-crypto-random-runtime-boundary.md`

- [x] **Step 1: Update docs with Stage-1BK evidence**

Add Stage-1BK entries that state `CoreCryptoRandomRuntime` is installed from `src/utils/crypto-random.ts`, active manifests no longer reference `js/core_crypto_random_runtime.js`, and the legacy file remains in place.

- [x] **Step 2: Run focused verification**

Run:

```bash
npx vitest run tests/unit/crypto-random.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts
npm run audit:entry-manifest
npm run audit:game-manager
npm run audit:service-boundary
npm run audit:page-legacy-runtime-boundary
npm run build
npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts
```

Expected: all commands pass.

- [x] **Step 3: Run full prepush gate**

Run:

```bash
npm run verify:prepush
```

Expected: all refactor gates, smoke, and build pass.

- [ ] **Step 4: Commit, push, PR**

Run:

```bash
git add src/utils/crypto-random.ts src/entries/home-family-bootstrap.ts src/entries/home-family-shared.ts src/entries/play-runtime-scripts.ts src/entries/replay-runtime-scripts.ts scripts/entry-manifest-audit.mjs tests/unit/crypto-random.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-14-crypto-random-runtime-boundary.md
git commit -m "refactor: install crypto random runtime from ts"
git push -u origin frontend-runtime-ts-boundary-stage1bk-crypto-random
gh pr create --title "refactor: install crypto random runtime from ts" --body-file <generated-body-file>
```

Expected: PR opens against `main`; GitHub checks pass before merge.
