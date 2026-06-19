# Fallback Fresh Setup Seed Retirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development for behavior changes and superpowers:verification-before-completion before publishing.

**Goal:** Move fallback fresh setup seed mixing out of the legacy restart/setup runtime hotspot and into the tested TypeScript restart-game runtime boundary.

**Architecture:** Extend `src/core/restart-game.ts` with `createFallbackFreshSetupSeed`, a pure function that receives normalized timing/counter inputs and returns the same safe integer seed previously mixed in legacy JavaScript. The legacy restart/setup runtime continues to resolve `Date.now()`, `performance.now()`, and the per-manager counter, then delegates the seed calculation to `CoreRestartGameRuntime` when available.

**Tech Stack:** TypeScript core runtime, legacy VM bridge tests, Vitest, refactor closure audit.

---

### Task 1: Lock fallback seed mixing behavior

**Files:**
- Modify: `src/core/restart-game.ts`
- Modify: `js/core_game_manager_restart_setup_helpers_runtime.js`
- Modify: `tests/unit/core-restart-game.spec.ts`
- Modify: `tests/unit/core-game-manager-restart-seed.spec.ts`

- [x] **Step 1: Write TypeScript seed mixing test**
  - Verify deterministic fallback seed output for fixed `nowMs`, `performanceNowMicros`, and `counter`.
  - Verify the restart runtime factory/installer exposes `createFallbackFreshSetupSeed`.
  - Evidence: failed with `TypeError: createFallbackFreshSetupSeed is not a function`.

- [x] **Step 2: Write legacy bridge test**
  - Inject `CoreRestartGameRuntime.createFallbackFreshSetupSeed` into the restart/setup VM harness.
  - Verify legacy `createFallbackFreshSetupSeed(manager)` delegates normalized `{ nowMs, performanceNowMicros, counter }`.
  - Evidence: failed by returning the old locally mixed seed instead of the injected runtime value.

- [x] **Step 3: Implement runtime bridge**
  - Add `createFallbackFreshSetupSeed` to `src/core/restart-game.ts`.
  - Add a compact legacy fallback and delegate to the TypeScript runtime when installed.

- [x] **Step 4: Verify**
  - `npx vitest run tests/unit/core-restart-game.spec.ts tests/unit/core-game-manager-restart-seed.spec.ts`: 2 files passed, 20 tests passed.
  - `node scripts/refactor-closure-audit.mjs`: expected non-zero while long-term hotspots remain; hotspot count decreased to 16 and `createFallbackFreshSetupSeed` is no longer listed.
