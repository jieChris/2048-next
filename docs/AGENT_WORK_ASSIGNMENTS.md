# Agent Work Assignment Doc

Purpose
- This is the single source of truth for assigning work to agents A-F.
- When an agent finishes a batch, they must update their section here with status, evidence, and next steps.
- All new work must be pulled from the Task Queue in this document.

Operating Rules
- One batch equals one deliverable with tests and doc evidence.
- Each batch must list: scope, dependencies, tests run, risks, and follow-up.
- If scope changes, update this document first, then execute.
- Keep this file updated at least once per batch.

Current Objective
- Replace remaining history legacy runtime dependencies (ModeCatalog/CoreGameSettingsStorageRuntime/LocalHistoryStore/ThemeManager) with TS modules without behavior changes.

Agent Roles
- A: Architecture lead. Owns boundaries and milestone sequencing. Approves scope.
- B: Core implementation. Owns core/contracts migration points.
- C: App/pages implementation. Owns page shell and UI migration.
- D: Platform/services. Owns audit gates, CI stability, deploy and scripts.
- E: Quality and gatekeeping. Owns test strategy and verification.
- F: Product and acceptance. Owns user-facing acceptance and release checks.

Current Cycle
- Cycle ID: WS4-04A
- Focus: history remaining legacy dependency replacement (ModeCatalog/CoreGameSettingsStorageRuntime/LocalHistoryStore/ThemeManager)
- Guardrails: no new legacy imports; replacement stays TS-only; history behavior unchanged
- Acceptance: history page runs without those legacy imports; history smoke + boundary audit pass

Task Queue
- T5: Create TS ModeCatalog adapter + data source for history (no wiring). Boundary: data/adapter only; no DOM or storage changes.
- T6: Wire history page runtime to TS ModeCatalog; remove `mode_catalog.js` import; update allowlist + history smoke.
- T7: Replace CoreGameSettingsStorageRuntime usage in history normalization with contracts-only logic; remove `core_game_settings_storage_runtime.js` import.
- T8: Add TS history store adapter using `src/storage/history-idb` (list/export/import/delete/clear/download); then wire history runtime to it and remove `local_history_store.js` import.
- T9: Replace `theme_manager.js` usage on history page with TS theme bootstrap (history-only); remove import.
- T10: After each removal, update allowlist + docs and run history smoke + boundary audit.

Assignments
- A: Approve T5-T9 boundaries and order; decide if theme_manager removal is per-page or global.
- B: Provide contracts-only normalization expectations for T7 and parity checks.
- C: Implement T5-T9 and update history runtime wiring.
- D: Maintain allowlist updates as legacy imports are removed.
- E: Define and run minimal test matrix for each task; validate boundary audit.
- F: Validate user-facing behavior and sign-off on history page after legacy removals.

Status By Agent
- A: Status = approved (T1-T4 complete). Next = approve WS4-04A T5-T9 order.
- B: Status = done (T1-T4 support). Next = review contracts-only normalization for T7.
- C: Status = done (T1-T4). Next = execute T5-T9 in WS4-04A.
- D: Status = in_progress. Next = prep allowlist removals for mode_catalog/core_game_settings_storage/local_history_store/theme_manager.
- E: Status = in_progress. Next = update test matrix for T5-T9 and rerun history smoke after each removal.
- F: Status = in_progress. Next = define acceptance checks for T5-T9 and sign-off after verification.

Verification Policy
- Unit: focused tests for mode catalog adapter, contracts-only normalization, and history store adapter.
- Smoke: history page system + history-records suite after each wiring change.
- Gate: page-legacy-runtime-boundary audit after each legacy import removal.

Evidence Log
- 2026-03-22: WS4-03E T1-T4 complete (per user confirmation; verification pending).
- 2026-03-22: WS4-04A drafted for history legacy dependency replacement (T5-T9).
- 2026-03-22: WS4-03D completed. history_page.js now loaded from entry, not from page shell. Smoke and audit passed.
- 2026-03-22: WS4-03E (C) completed T1-T3. Added TS modules + unit tests for filter/normalize/board preview.
- 2026-03-22: WS4-03E (T4) completed. TS runtime replaced legacy history_page.js; audit + unit + history smoke passed.
- 2026-03-22: Guardrails updated to record history_page.js removal from page shell.
- 2026-03-22: F sign-off = PASS (audit + history page system smoke + history-records suite all green).

C Batch: WS4-03E (T1-T4)
- Scope: history filter state module, history record normalize module, history board preview DOM renderer module, history runtime wired to TS controller (history_page.js removed).
- Dependencies: legacy runtime remains source of truth for ModeCatalog/CoreGameSettingsStorageRuntime/LocalHistoryStore.
- Files changed: `src/features/history/history-filter-state.ts`, `src/features/history/history-record-normalize.ts`, `src/features/history/history-board-preview.ts`, `src/pages/history-page-controller.ts`, `tests/unit/history-filter-state.spec.ts`, `tests/unit/history-record-normalize.spec.ts`, `tests/unit/history-board-preview.spec.ts`.
- Tests run: `npx vitest run tests/unit/history-filter-state.spec.ts tests/unit/history-record-normalize.spec.ts tests/unit/history-board-preview.spec.ts`.
- Risk: low. TS modules mirror legacy logic; TS controller wired in T4.
- Follow-up: execute WS4-04A T5-T9 to remove remaining history legacy imports.

D Update (history legacy dependency shrink impact)
- Current history allowlist entries: `../../js/theme_manager.js`, `../../js/mode_catalog.js`, `../../js/core_game_settings_storage_runtime.js`, `../../js/local_history_store.js`, `../../js/refactor_cutover_migration.js`, `../../js/history_page.js`, `../../js/core_i18n_runtime.js`.
- Expected removals as TS replacements land: `history_page.js` (T4), `local_history_store.js` (T8), `core_game_settings_storage_runtime.js` (T7), `mode_catalog.js` (T6), `theme_manager.js` (T9).
- Guardrail impact: allowlist shrink is the enforcement mechanism; update allowlist + docs + evidence in the same batch as each removal.

E Update (WS4-03E minimal test matrix)
- T1: Unit tests for filter-state module; history smoke subset for filters.
- T2: Unit tests for view-model normalization; history smoke subset for view models and export.
- T3: Unit tests for board preview DOM renderer; history smoke subset for toolbar events.
- T4: History smoke suite + boundary audit after removing history_page.js.

E Update (WS4-04A minimal test matrix)
- Unit: 1-2 unit tests per replacement module (ModeCatalog adapter, contracts-only normalization, history store adapter).
- Smoke: `tests/smoke/pages-history-page-system.smoke.spec.ts`, `tests/smoke/pages-local-history-autosave.smoke.spec.ts`, `tests/smoke/history-records-*.smoke.spec.ts`.
- Smoke (ModeCatalog path): `tests/smoke/pages-modes-page-system.smoke.spec.ts`.
- Gate: `node scripts/page-legacy-runtime-boundary-audit.mjs` after each legacy import removal.

B Section
- Scope: contracts/core reuse mapping for history record view-model normalization.
- Reuse Map: use `normalizeHistoryOwnerMetaLike`, `normalizeHistoryDiagnosticsIndexEntriesLike`, `normalizeHistoryRecordLike` from contracts.
- Dependencies: `src/contracts/index.ts`, `src/bootstrap/pretty-time.ts`.
- Risks: UI label formatting and replay fallback must remain identical; keep label formatting in UI layer.
- Next: C to implement T7 using contracts-only normalization and verify parity.

F Section
- Scope: history page legacy removal acceptance checklist.
- Acceptance: history page loads from navigation without blank screen or console error.
- Acceptance: empty state copy and layout match legacy behavior.
- Acceptance: records list count/order unchanged; record fields match legacy display.
- Acceptance: owner labels and timestamps match legacy format.
- Acceptance: filters return same record sets as legacy.
- Acceptance: replay/export/delete actions work; error states visible and consistent.
- Evidence Required: history smoke suite + boundary audit.
- Sign-off Result: PASS (for T1-T4). Next sign-off after T5-T9 verification.

Main Batch: WS4-03E (T4)
- Scope: replace legacy history_page.js with TS runtime controller and remove legacy loader in entry.
- Files changed: `src/pages/history-page-runtime.ts`, `src/pages/history-page.ts`, `src/entries/history.ts`.
- Tests run: `node scripts/page-legacy-runtime-boundary-audit.mjs`, `npx vitest run tests/unit/history-entry-bootstrap.spec.ts`, history smoke suite.
- Risk: medium. Logic ported from legacy; keep parity checks via history smoke suite.
- Follow-up: update guardrails to record history_page.js removal; F sign-off completed (PASS).

Change Log
- 2026-03-22: Document created.
- 2026-03-22: WS4-04A drafted for remaining history legacy dependency removal.
