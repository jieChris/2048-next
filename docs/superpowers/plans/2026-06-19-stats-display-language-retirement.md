# Stats Display Language Retirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire the legacy stats display language resolver hotspot by delegating it to the tested TypeScript stats panel copy runtime.

**Architecture:** Reuse `src/core/stats-panel-copy.ts` as the TypeScript language normalization boundary. Keep `js/core_game_manager_stats_display_helpers_runtime.js` as a compatibility shell that collects legacy sources, delegates to `CoreStatsPanelCopyRuntime.resolveStatsPanelLanguage` when installed, and keeps a compact fallback for standalone legacy execution.

**Tech Stack:** Legacy browser VM tests, TypeScript stats panel copy runtime, Vitest, refactor closure audit.

---

### Task 1: Lock legacy stats display language delegation

**Files:**
- Create: `tests/unit/core-game-manager-stats-display-runtime.spec.ts`
- Modify: `js/core_game_manager_stats_display_helpers_runtime.js`
- Modify: this plan document with validation evidence.

- [x] **Step 1: Write the failing legacy VM test**
  - Load `js/core_game_manager_stats_display_helpers_runtime.js` in a VM context.
  - Inject `CoreStatsPanelCopyRuntime.resolveStatsPanelLanguage`.
  - Verify `resolveStatsDisplayLanguage(manager)` passes i18n, storage, and document language sources into the TypeScript runtime and returns the runtime result.
  - Run `npx vitest run tests/unit/core-game-manager-stats-display-runtime.spec.ts`.
  - Expected: FAIL before implementation because the legacy resolver still handles language directly.
  - Evidence: failed with `expected 'en' to be 'zh'`, proving the legacy resolver returned directly from UII18N instead of delegating.

- [x] **Step 2: Delegate with compact fallback**
  - Add a compact `resolveCoreStatsPanelCopyRuntime` resolver to `js/core_game_manager_stats_display_helpers_runtime.js`.
  - Add a compact source collector for i18n, storage, and document language values.
  - Make `resolveStatsDisplayLanguage` call `runtime.resolveStatsPanelLanguage(sources)` when available.
  - Keep the direct legacy normalization fallback for standalone script execution.

- [x] **Step 3: Verify the target test is green**
  - Run `npx vitest run tests/unit/core-game-manager-stats-display-runtime.spec.ts`.
  - Expected: PASS.
  - Evidence: 1 file passed, 1 test passed.

- [x] **Step 4: Verify audit impact and publish**
  - Run `node scripts/refactor-closure-audit.mjs`.
  - Expected: still non-zero while long-term hotspots remain, but `resolveStatsDisplayLanguage` is no longer listed.
  - Run `npm run verify:prepush`.
  - Commit as `refactor: retire stats display language runtime`.
  - Create a draft PR, wait for GitHub CI, then squash merge when green.
  - Evidence:
    - `node scripts/refactor-closure-audit.mjs`: expected non-zero while long-term hotspots remain; hotspot count decreased to 22 and `resolveStatsDisplayLanguage` is no longer listed.
    - `npx vitest run tests/unit/core-game-manager-stats-display-runtime.spec.ts tests/unit/core-stats-panel-copy.spec.ts tests/unit/core-game-manager-stats-ui-runtime.spec.ts tests/unit/home-family-bootstrap-ranked-session.spec.ts`: 4 files passed, 6 tests passed.
    - `npm run verify:prepush`: exit 0, all refactor gates passed.
