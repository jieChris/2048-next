# Home Runtime Contract Boundary Implementation Plan
> **For agentic workers:** Use Trellis/Trellies as the default project workflow. Before implementation, debugging, review, or code modification, check for and follow `.trellis/`, `.trellis/spec/`, Trellis task files, Trellis skills, and Trellis commands when available. Do not use legacy Superpower Skill instructions. If old Superpower instructions conflict with Trellis/Trellies, Trellis/Trellies wins. Steps use checkbox syntax for tracking.

**Goal:** Retire `js/core_home_runtime_contract_runtime.js` from active play/home runtime manifests by installing `CoreHomeRuntimeContractRuntime` from the tested TypeScript bootstrap boundary.

**Architecture:** `src/bootstrap/home-runtime-contract.ts` already owns the runtime dependency contract resolver for home page startup. This phase adds the legacy global runtime shape, installs it during home-family bootstrap before legacy scripts load, and blocks the retired script from active manifests through `entry-manifest-audit`.

**Tech Stack:** TypeScript bootstrap modules, Vitest unit tests, Vite URL manifests, Playwright smoke tests, existing manifest audit scripts.

---

### Task 1: Add RED Tests for Installer and Retired Registry

**Files:**
- Modify: `tests/unit/bootstrap-home-runtime-contract.spec.ts`
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`

- [x] **Step 1: Add failing installer assertions**

Update `tests/unit/bootstrap-home-runtime-contract.spec.ts` imports:

```ts
import {
  createHomeRuntimeContractRuntime,
  installHomeRuntimeContractRuntime,
  resolveHomeRuntimeContracts,
  type HomeRuntimeContractRuntime
} from "../../src/bootstrap/home-runtime-contract";
```

Add these tests at the start of `describe("bootstrap home runtime contract", ...)`:

```ts
it("creates the legacy CoreHomeRuntimeContractRuntime shape from TypeScript functions", () => {
  const runtime = createHomeRuntimeContractRuntime();

  expect(runtime.resolveHomeRuntimeContracts).toBe(resolveHomeRuntimeContracts);
});

it("installs the runtime on a supplied window-like object", () => {
  const windowLike: { CoreHomeRuntimeContractRuntime?: HomeRuntimeContractRuntime } = {};

  const installed = installHomeRuntimeContractRuntime({ windowLike });

  expect(installed).toBe(windowLike.CoreHomeRuntimeContractRuntime);
  expect(installed?.resolveHomeRuntimeContracts).toBeTypeOf("function");
});

it("does not overwrite an existing runtime contract", () => {
  const existing = createHomeRuntimeContractRuntime();
  const windowLike = { CoreHomeRuntimeContractRuntime: existing };

  const installed = installHomeRuntimeContractRuntime({ windowLike });

  expect(installed).toBe(existing);
  expect(windowLike.CoreHomeRuntimeContractRuntime).toBe(existing);
});

it("returns null when no window-like target is available", () => {
  expect(installHomeRuntimeContractRuntime({ windowLike: null })).toBeNull();
});
```

- [x] **Step 2: Add failing retired registry assertion**

Add this test after the home-page-host retired registry assertion:

```ts
it("tracks home-runtime-contract runtime as a retired active-manifest script", () => {
  expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
    scriptPath: "core_home_runtime_contract_runtime.js",
    symbolName: "coreHomeRuntimeContractRuntimeUrl"
  });
});
```

- [x] **Step 3: Run RED tests**

Run:

```bash
npx vitest run tests/unit/bootstrap-home-runtime-contract.spec.ts
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Observed: first command failed because installer exports did not exist; second command failed because the retired registry entry was missing.

### Task 2: Install `CoreHomeRuntimeContractRuntime` from TypeScript

**Files:**
- Modify: `src/bootstrap/home-runtime-contract.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Add runtime interfaces and installer**

Add to `src/bootstrap/home-runtime-contract.ts`:

```ts
export interface HomeRuntimeContractRuntime {
  resolveHomeRuntimeContracts: typeof resolveHomeRuntimeContracts;
}

export interface HomeRuntimeContractRuntimeWindowLike {
  CoreHomeRuntimeContractRuntime?: HomeRuntimeContractRuntime;
}

export interface HomeRuntimeContractRuntimeInstallOptions {
  windowLike?: HomeRuntimeContractRuntimeWindowLike | null | undefined;
}

export function createHomeRuntimeContractRuntime(): HomeRuntimeContractRuntime {
  return {
    resolveHomeRuntimeContracts
  };
}

export function installHomeRuntimeContractRuntime(
  options: HomeRuntimeContractRuntimeInstallOptions = {}
): HomeRuntimeContractRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined"
      ? null
      : (window as unknown as HomeRuntimeContractRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreHomeRuntimeContractRuntime) {
    windowLike.CoreHomeRuntimeContractRuntime = createHomeRuntimeContractRuntime();
  }
  return windowLike.CoreHomeRuntimeContractRuntime || null;
}
```

- [x] **Step 2: Install during home-family bootstrap**

Import and call the installer in `src/entries/home-family-bootstrap.ts`:

```ts
import { installHomeRuntimeContractRuntime } from "../bootstrap/home-runtime-contract";
```

```ts
installHomeRuntimeContractRuntime();
```

- [x] **Step 3: Run GREEN installer tests**

Run:

```bash
npx vitest run tests/unit/bootstrap-home-runtime-contract.spec.ts
```

Observed: PASS, 7 tests.

### Task 3: Retire the Legacy Script from Active Manifests

**Files:**
- Modify: `scripts/entry-manifest-audit.mjs`
- Modify: `src/entries/home-family-shared.ts`

- [x] **Step 1: Add retired registry entry**

Append to `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`:

```js
{
  scriptPath: "core_home_runtime_contract_runtime.js",
  symbolName: "coreHomeRuntimeContractRuntimeUrl"
}
```

- [x] **Step 2: Run retired registry GREEN**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Observed: PASS, 64 tests.

- [x] **Step 3: Run manifest audit RED**

Run:

```bash
npm run audit:entry-manifest
```

Observed: FAIL while `core_home_runtime_contract_runtime.js` remained in `src/entries/home-family-shared.ts`.

- [x] **Step 4: Remove active manifest references**

Remove the `coreHomeRuntimeContractRuntimeUrl` import and array entry from:

```ts
src/entries/home-family-shared.ts
```

Do not delete `js/core_home_runtime_contract_runtime.js`.

- [x] **Step 5: Run manifest audit GREEN**

Run:

```bash
npm run audit:entry-manifest
```

Observed: PASS.

### Task 4: Update Evidence and Run Full Gates

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`
- Modify: `docs/superpowers/plans/2026-06-14-home-runtime-contract-boundary.md`

- [x] **Step 1: Update architecture guardrails**

Add a top entry recording:

```md
# Guardrail Delta (2026-06-14, Stage-1BE Home-Runtime-Contract TS Boundary)

## Batch Impact
- `CoreHomeRuntimeContractRuntime` is now installed from `src/bootstrap/home-runtime-contract.ts` before home-family legacy scripts load.
- The installer preserves the legacy runtime global shape: `resolveHomeRuntimeContracts`.
- `js/core_home_runtime_contract_runtime.js` was retired from active play/home runtime manifests without deleting the legacy file.
- `entry-manifest-audit` blocks `core_home_runtime_contract_runtime.js` / `coreHomeRuntimeContractRuntimeUrl` through `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.
```

- [x] **Step 2: Update roadmap**

Prepend roadmap evidence for `WS-runtime-54` / Stage 1BE with the focused and full gate commands run in this phase.

- [x] **Step 3: Run full verification gates**

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

Expected: all commands exit 0. Known `/api/leaderboard` `ECONNREFUSED` warnings in Playwright output are acceptable only if the command exits 0.

- [ ] **Step 4: Commit and open PR**

Run:

```bash
git status --short
git add src/bootstrap/home-runtime-contract.ts src/entries/home-family-bootstrap.ts src/entries/home-family-shared.ts scripts/entry-manifest-audit.mjs tests/unit/bootstrap-home-runtime-contract.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-14-home-runtime-contract-boundary.md
git commit -m "refactor: install home runtime contract from ts"
git push -u origin frontend-runtime-ts-boundary-stage1be-home-runtime-contract
```

Create a draft PR, mark ready after local gates pass, observe GitHub checks, and merge only after CI is green.

---

## Self-Review

- Spec coverage: This plan moves one active home runtime contract legacy runtime out of manifests while preserving the global runtime contract through TS bootstrap installation.
- Placeholder scan: No TBD/TODO/implement-later placeholders remain.
- Type consistency: Runtime names consistently use `HomeRuntimeContract` / `coreHomeRuntimeContractRuntimeUrl` / `CoreHomeRuntimeContractRuntime`.
