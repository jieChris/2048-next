# Migration Checklist

Status: Active | Updated: 2026-03-15

## Conventions
- Status: ✅ Done | 🔄 In Progress | ⏳ Planned | ❌ Blocked
- Each task has DoD (Definition of Done) and rollback condition

---

## P0: Baseline Governance

| ID | Task | Status | DoD | Rollback |
|----|------|--------|-----|----------|
| P0-1 | Architecture diagram & baseline docs | ✅ | `docs/baseline/` populated with arch overview, complexity & resource reports | Delete `docs/baseline/` |
| P0-2 | Migration checklist (this file) | ✅ | This file exists with all tasks, DoDs, risk register | Delete this file |

## P1: Core Boundary Consolidation

| ID | Task | Status | DoD | Rollback |
|----|------|--------|-----|----------|
| P1-1 | Define unified Engine API | ✅ | `src/core/engine.ts` has full API (init/move/undo/replay/export/import), contract tests pass | Revert engine.ts to shell |
| P1-2 | Runtime helper de-business-ification | ✅ | Runtime helpers delegate to core; no business logic in runtime layer | Revert runtime files |

## P2: Data Contracts & Storage Upgrade

| ID | Task | Status | DoD | Rollback |
|----|------|--------|-----|----------|
| P2-1 | Contract centralization | ✅ | `src/contracts/` has unified schemas for Replay, History, Session, Submit payloads | Delete `src/contracts/` |
| P2-2 | IndexedDB history storage | ✅ | `src/storage/history-idb.ts` with DAO, migration from localStorage, cursor pagination | Feature flag back to localStorage |

## P3: Entry & Bootstrap Convergence

| ID | Task | Status | DoD | Rollback |
|----|------|--------|-----|----------|
| P3-1 | Manifest-driven entry deps | ✅ | `src/entries/runtime-manifest.ts` replaces manual arrays, validator checks file existence | Revert to manual arrays |
| P3-2 | Unified page bootstrap template | ✅ | `src/bootstrap/page-bootstrap.ts` template, pages use capability config | Revert entry files |

## P4: Performance & Resource Governance

| ID | Task | Status | DoD | Rollback |
|----|------|--------|-----|----------|
| P4-1 | Resource budget & compression | ✅ | Font subsetted, SVGs optimized, build budget check in place | Restore original assets |
| P4-2 | Unified refresh scheduler | ✅ | `src/utils/refresh-scheduler.ts` with visibility + backoff, pages migrated | Revert to per-page scheduling |

## P5: Test & Release Governance

| ID | Task | Status | DoD | Rollback |
|----|------|--------|-----|----------|
| P5-1 | Test tiering | ✅ | `tests/tier-*.txt` manifests, npm scripts for tier-1 quick set | Remove tier files |
| P5-2 | Gate strategy upgrade | ✅ | Audit reports multi-metric (complexity, duplication, coupling), explanatory output | Revert audit scripts |

---

## Risk Register

| ID | Risk | Likelihood | Impact | Mitigation | Status |
|----|------|------------|--------|------------|--------|
| R1 | Replay format incompatibility during contract migration | Medium | High | Schema version + backward compat tests | Mitigated by contract tests |
| R2 | IndexedDB not available in some environments | Low | Medium | Feature flag, localStorage fallback preserved | Mitigated by fallback |
| R3 | Large font removal breaks CJK display | Medium | Medium | Subset to used chars only, test visually | Mitigated by subsetting |
| R4 | Manifest refactor breaks page loading | Medium | High | Smoke tests cover all pages | Mitigated by smoke tests |
| R5 | Dual-stack divergence during migration | Medium | High | Runtime contract tests, golden replay | Ongoing monitoring |
