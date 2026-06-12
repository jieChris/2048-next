# Frontend Legacy Retirement Design

Date: 2026-06-12
Scope: `2048-next-logo-work` frontend repository
Status: approved for implementation planning

## Goal

Refactor the frontend toward a durable, extensible architecture by retiring legacy runtime dependencies incrementally, without changing the user-facing UI or replacing the current Vite multi-page application stack.

The first-stage objective is measurable: `src/pages/*` legacy imports must only decrease, service/storage direct-access exceptions must only decrease, and every boundary shrink must be backed by unit or smoke coverage.

## Current Context

The frontend already has an active platformization track:

- Page entries are manifest-managed through `src/entries/runtime-manifest.ts`.
- Direct page startup exists through `src/app/bootstrap-direct-page.ts`.
- Page capability descriptors exist in `src/bootstrap/page-bootstrap.ts`.
- Guardrails already block new page legacy imports through `scripts/page-legacy-runtime-boundary-audit.mjs`.
- Service/storage direct access is audited through `scripts/service-boundary-audit.mjs`.

The remaining risk is not entry discovery. The remaining risk is that page shells, runtime helpers, and core game flow still depend on `js/*` legacy modules and `window.game_manager`.

## Architecture Boundaries

The refactor keeps the existing Vite MPA model and strengthens ownership boundaries:

- `src/entries`: choose the page and start the bootstrap flow only. No business logic.
- `src/app`: application assembly, route-to-page wiring, standalone navigation, and shared startup composition.
- `src/pages`: page-level orchestration. Pages can call `features`, `services`, and `storage`, but must not directly import `js/*`.
- `src/features`: reusable product capabilities such as history, account, replay, leaderboard, and PKU workflows.
- `src/ui`: presentation and interaction components only. No rule, protocol, storage, or network ownership.
- `src/core`: the only owner of game rules and state computation.
- `src/contracts`: the only owner of persisted, replayed, submitted, or synchronized data structures.
- `src/storage`: browser persistence ownership and compatibility migration.
- `src/services`: remote API protocol ownership and request helpers.

The immediate architecture rule is: page-level legacy imports are transitional debt, not a supported extension mechanism.

## Migration Approach

Use four ordered batches. Each batch should produce small, independently reviewable changes.

### Batch 1: Page Shell Legacy Retirement

Remove direct `../../js/*.js` imports from `src/pages/*` page shells by moving owned behavior into TypeScript boundaries.

Recommended order:

1. `src/pages/modes-page.ts`
   - Current debt is small and centered on `theme_manager.js`.
   - Use as the next minimal allowlist-shrink sample.
2. `src/pages/history-page.ts`
   - Already has `history-page-controller.ts` and `history-page-runtime.ts`.
   - Continue moving `theme_manager`, `mode_catalog`, settings, and local history dependencies behind TS owners.
3. `src/pages/palette-page.ts`
   - Extract theme and palette behavior into settings/theme feature ownership.
4. Account and operational pages
   - Move `register`, `password`, `account`, `account-settings`, `user-profile`, `relay-5x5`, `admin`, and `stone-2k-monitor` dependencies into `features`, `services`, and `storage` owners.

Acceptance:

- `PAGE_LEGACY_IMPORT_ALLOWLIST` shrinks.
- `node scripts/page-legacy-runtime-boundary-audit.mjs` passes.
- The relevant page unit tests and smoke tests pass.

### Batch 2: Service And Storage Owner Closure

Convert current `service-boundary-audit` exceptions into explicit owners instead of permanent page-level exceptions.

Expected owners:

- `src/services/api-client.ts`
- `src/services/admin-rescue.ts`
- `src/services/stone-2k-monitor.ts`
- `src/storage/browser-storage.ts`
- `src/storage/session-access.ts`

Acceptance:

- `DIRECT_SERVICE_USAGE_ALLOWLIST` shrinks.
- Pages do not directly call `fetch`, `localStorage`, or `sessionStorage` for business behavior.
- `npm run audit:service-boundary` passes.

### Batch 3: Legacy Runtime Hotspot Retirement

Replace large `js/*` runtime hotspots by creating TypeScript owners first, then reducing legacy files to compatibility bridges, then deleting bridges when no longer needed.

Priority hotspots:

- `js/core_game_manager_replay_helpers_runtime.js`
- `js/online_leaderboard_runtime.js`
- `js/theme_manager.js`
- `js/replay_ui.js`
- `js/local_history_store.js`

Acceptance:

- New behavior lands in `src/features`, `src/bootstrap`, `src/storage`, `src/services`, `src/core`, or `src/contracts`.
- Legacy files do not accumulate new product logic.
- Existing replay, history, leaderboard, and theme smoke coverage remains green.

### Batch 4: Engine Main Flow Takeover

After page and service boundaries are stable, move the main game flow away from `window.game_manager` as the real state owner.

Required design constraints:

- Extend `createEngineSession()` only around real move, undo, replay, import, export, and saved-state needs.
- Upgrade `src/bootstrap/engine-facade-host.ts` from facade registration to session ownership where appropriate.
- Keep `GameManager` as a compatibility shell during migration, not the long-term source of truth.

Acceptance:

- Main play, undo, practice, replay, and saved-session flows call through the Engine boundary.
- Smoke tests prove behavior is unchanged.
- Legacy manager helpers shrink instead of gaining new responsibilities.

## Testing And Gates

Every small batch must run the relevant architecture gates:

```bash
npm run audit:entry-manifest
npm run audit:page-legacy-runtime-boundary
npm run audit:service-boundary
npm run test:unit
```

For page behavior changes, add targeted smoke coverage:

```bash
npm run test:smoke:runtime-contract
npm run test:smoke:play-replay
npm run test:smoke:history
npm run test:smoke:pages
```

Before merging a larger batch:

```bash
npm run verify:prepush
npm run build
```

## Risk Controls

1. Shrink one boundary at a time. Do not combine legacy retirement with UI redesign, copy changes, or unrelated product work.
2. Treat allowlists as progress ledgers. `PAGE_LEGACY_IMPORT_ALLOWLIST` and `DIRECT_SERVICE_USAGE_ALLOWLIST` may shrink, but should not grow without an explicit architecture decision.
3. Keep bridges temporary. A legacy bridge may delegate to a TS owner, but it must not become the place for new logic.
4. Defer core game ownership changes until page and service boundaries are stable.
5. Update architecture docs when a batch changes the migration state.

## Documentation Updates

Each completed batch should update the relevant records:

- `docs/ROADMAP_MILESTONES.md`
- `docs/ARCHITECTURE_GUARDRAILS.md`
- `docs/EXECUTION_LOG.md` when verification evidence or release risk changes

## First-Stage Definition Of Done

The first stage is complete when:

- `src/pages/*` no longer directly imports `../../js/*.js`, or the remaining allowlist is explicitly justified and close to zero.
- Page code no longer directly owns business storage or business API protocol calls.
- New frontend behavior lands in explicit owners under `features`, `services`, `storage`, `core`, or `contracts`.
- `npm run verify:prepush` and `npm run build` pass for the final batch.
- Legacy runtime files are compatibility surfaces, not the default location for new logic.

