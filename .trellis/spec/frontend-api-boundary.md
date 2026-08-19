# Frontend API Boundary

## Ownership

`2048-next` owns the browser UI for the game, including account screens, register/login forms, profile pages, local history UI, game play flows, and API client code. It does not own account authority, password verification, token signing, database schema, leaderboard derivation, replay verification, ranked sessions, or server-side persistence.

Source-backed examples:

- Account UI exists in `src/pages/account-page.ts`, `src/pages/account-settings-page.ts`, `src/pages/register-page.ts`, `src/pages/password-page.ts`, and corresponding legacy page scripts under `js/`.
- All server calls should go through API-client style boundaries such as `src/services/api-client.ts` and `js/api_shared_utils.js`.
- Vite development proxy is centralized in `vite.config.ts`; it currently defaults `/api` to `http://127.0.0.1:3000`.

## API Calling Rules

Frontend code may:

- Render account, profile, leaderboard, admin rescue, relay, ranked, and replay UI.
- Store short-lived browser state needed for UX, such as local history, current auth token, pending form state, and local retry queues.
- Call `2048-game-api` through `/api/*` or a configured API base.
- Attach `Authorization: Bearer <token>` when a route requires authentication.

Frontend code must not:

- Read or write Postgres, D1, SQLite, Supabase, Drizzle, Prisma, or migration files.
- Sign or verify authoritative auth tokens.
- Hash or verify passwords.
- Calculate authoritative leaderboard placement.
- Accept replay, score, ranked session, or checkpoint data as trusted without backend verification.
- Add new same-origin API implementations inside this repository.

## Local Development

The local helper `scripts/dev-local.mjs` defaults `LOCAL_API_DIR` to `../2048-game-api/2048-game-api` and launches the backend with `npm run dev:server`. This is the required local development shape for the target architecture.

Do not add new code that assumes `2048-ranked` is the game API provider. New local examples and docs should name `2048-game-api` as the backend.

## Verification

Use these checks after boundary-sensitive changes:

- `npm run audit:service-boundary`
- `npm run verify:prepush`
- Targeted smoke tests for account, records, leaderboard, ranked session, and admin rescue flows when touched.

## Production CSS Build Rules

- Local `@import` URLs under `style/` must not carry query strings or fragments. Vite preserves cache-keyed CSS imports in the emitted bundle instead of resolving them, which rebases the URL under `/assets/` and produces a production-only 404.
- Put cache keys on the HTML stylesheet entry when needed. Keep nested local imports build-resolvable so their rules are inlined into the hashed production asset.
- Any globally rendered UI, including the achievement unlock toast, needs a build-output assertion or production smoke check in addition to source-mode styling checks.

## Scenario: Durable Authentication and Record Delivery

### 1. Scope / Trigger

- Trigger: login recovery, logout, terminal record persistence, automatic retry, manual retry, or chunked replay upload crosses the browser/API boundary.
- Affected client flows: `src/services/auth-session.ts`, `js/local_history_store.js`, `js/online_leaderboard_runtime.js`, account pages, history pages, and relay pages.
- This scenario governs completed game records. The browser preserves evidence and delivery state; `2048-game-api` remains authoritative for authentication, replay verification, record creation, and leaderboard eligibility.

### 2. Signatures

- Session restore: `POST <apiBase>/auth/refresh`, `credentials: "include"`; a still-valid legacy Bearer may be supplied once for migration.
- Logout: `POST <apiBase>/logout`, `credentials: "include"`.
- Normal record upload: `POST <apiBase>/records`.
- Large record upload:
  - `POST <apiBase>/records/uploads`
  - `GET <apiBase>/records/uploads/:taskId`
  - `PUT <apiBase>/records/uploads/:taskId/chunks/:index`
  - `POST <apiBase>/records/uploads/:taskId/complete`
- Durable browser APIs:
  - `LocalHistoryStore.prepareRecordSubmitAsync(recordId, payload)`
  - `LocalHistoryStore.updateRecordAsync(recordId, patch)`
  - `LocalHistoryStore.listSyncCandidatesAsync(options)`
- Legacy migration key: `online_pending_record_submit_signature_v1`; it is an import source, not the primary outbox.

### 3. Contracts

- Terminal order is fixed: build the complete envelope, persist it to IndexedDB, read it back and verify `client_record_id` plus replay integrity, then retire the consumed active game/session, then attempt the network upload.
- IndexedDB is the record evidence and outbox. Queue entries reference that record; they must not keep a second full replay copy. A legacy localStorage pending record is removed only after successful import into IndexedDB.
- Local persistence or read-back failure is `LOCAL_PERSIST_FAILED`: keep the active game evidence, do not upload, and present an export/retry action.
- Record ownership is explicit. A guest record cannot be assigned to the current account or uploaded until the player confirms the ownership transfer. Switching accounts never rewrites or deletes the prior account's records.
- A record becomes `synced` only when the response is successful **and** contains a stable server record ID (`id`, `record_id`, or `server_record_id`). `success: true` without an ID becomes `SERVER_RECORD_ID_MISSING` and keeps the evidence.
- Session clearing is driven only by stable authentication machine codes such as `TOKEN_EXPIRED`, `SESSION_REVOKED`, `INVALID_TOKEN`, or `ACCOUNT_INACTIVE`. An unclassified HTTP `401`, `403`, `410`, or `419` is not sufficient to clear the account session.
- `TOKEN_EXPIRED` may remove the obsolete local Bearer and trigger one cookie-first restore/retry. Network errors, `AUTH_STATE_UNAVAILABLE`, and unrelated business errors preserve authentication display state and every local record.
- Manual logout revokes the device session and clears only authentication state. It must preserve local history, IndexedDB delivery state, and legacy pending record evidence.
- Normal and chunked uploads share `client_record_id` idempotency. A retry or duplicate success must return the existing server record ID before local evidence is marked synced.
- Large replay chunks may be resumed, but `/complete` is the only operation allowed to create the visible record. The current implementation still constructs the complete replay string during completion; do not describe it as unbounded streaming.

### 4. Validation & Error Matrix

| Result | Authentication action | Record action |
| --- | --- | --- |
| `2xx`, `success: true`, stable server record ID | keep | write ID and `synced` |
| `2xx`, `success: true`, no stable server record ID | keep | `needs_action`, `SERVER_RECORD_ID_MISSING` |
| stable terminal auth code | clear only auth state | `waiting_auth`; keep evidence |
| unclassified `401/403/410/419` | keep | preserve evidence and surface the returned business error |
| network error, timeout, `429`, or `5xx` | keep | `retry_wait` with bounded backoff |
| `413`, `PAYLOAD_TOO_LARGE`, or `REPLAY_TOO_LARGE` on normal upload | keep | switch to resumable upload; keep evidence on failure |
| replay/mode definitively invalid | keep | `invalid`; retain and allow export |
| owner mismatch or same ID with different replay | keep | `needs_action`; never overwrite or delete |
| IndexedDB write/read-back failure | keep | keep active evidence, do not send |

### 5. Good/Base/Bad Cases

- Good: The token expires at game over; the record is read-back verified in IndexedDB, cookie-first restore succeeds, and the same `client_record_id` receives a server record ID.
- Good: The browser closes offline after terminal persistence; reopening scans `pending`/`retry_wait`, retries, and writes the server record ID without duplicating the result.
- Good: A large `5×5` replay resumes only missing chunks and completes to one server record.
- Base: A valid signed-in player finishes a small game; normal `/records` succeeds and the history badge changes to synced.
- Bad: Treating every 401 as logout lets a session-specific business error erase an otherwise valid login.
- Bad: Treating `success: true` as durable success clears the outbox even though the server did not identify any stored record.
- Bad: Logout, account switch, retry exhaustion, or local quota failure deletes the only replay evidence.
- Bad: Guest history silently adopts whichever account signs in next.

### 6. Tests Required

- Auth unit: stable terminal codes clear auth; unclassified 401/403 and `AUTH_STATE_UNAVAILABLE` do not; concurrent refreshes share one request; an expired access token retries once after cookie restore.
- Terminal persistence unit: IndexedDB save and read-back complete before active state cleanup or upload; failure retains active state and reports `LOCAL_PERSIST_FAILED`.
- Delivery unit: normal and legacy paths require a server record ID; missing ID keeps pending evidence as `SERVER_RECORD_ID_MISSING`.
- Ownership unit: guest records require explicit confirmation, and owner mismatch never uploads or deletes.
- Retry unit: transient errors keep one stable `client_record_id`; only due candidates run automatically.
- Chunk unit/integration: create/resume, duplicate chunks, byte/hash mismatch, missing chunks, complete idempotency, and final server record ID.
- UI unit/smoke: history shows sync state and manual retry; logout preserves records; admin diagnostics expose no token hashes.
- Release check: compare record/player/leaderboard counts before any production migration; an unapproved decrease blocks release.

### 7. Wrong vs Correct

#### Wrong

```js
if (response.status === 401 || response.status === 403) clearAuth();
if (result.success) clearPendingRecord();
```

#### Correct

```js
if (TERMINAL_AUTH_CODES.has(result.code)) clearAuthSessionOnly();
if (result.success && resolveRecordServerId(result)) markRecordSynced(result);
else keepRecordEvidence(result.code || "SERVER_RECORD_ID_MISSING");
```

#### Wrong

```js
clearActiveGame();
await saveLocalRecord(payload);
```

#### Correct

```js
const saved = await saveAndReadBack(payload);
if (!saved) return showLocalPersistFailure();
clearActiveGame();
await submitSavedRecord(saved);
```

## Scenario: Replay Timing Integrity Across Active-Game Restore

### Scope

This contract applies whenever an ongoing game that may produce leaderboard metrics is restored from a local save, compact checkpoint, cloud checkpoint, or rescue payload.

### Contracts

- Restoring a V1 replay must preserve its root and all existing records as an exact prefix, including initial tiles, start time, directions, spawns, `deltaMs`, undo records, checkpoints, and extensions.
- Replaying historical actions to reconstruct the board is an internal restore operation. It must not enter live input capture, achievements, terminal submission, checkpoint saving, dialogs, or other user-action side effects.
- The page timer, replay cumulative `deltaMs`, submitted duration, and target-tile times must use one elapsed-time source. At a real action boundary, replay cumulative time must equal the page timer elapsed time for that boundary.
- The first effective move establishes the timer origin and records `deltaMs = 0`. Ineffective inputs neither start the timer nor create replay records.
- After restore, let `Ecp` be the sum of timed records already in the checkpoint and `Tnext` the existing timer runtime's elapsed value at the next real action. The next record must use `max(0, Tnext - Ecp)`.
- A timed restore that cannot preserve the V1 prefix or reconcile timer state must fail closed while retaining the original checkpoint. Formats without per-action time must not be rewritten into leaderboard speed evidence.
- Server-side speed integrity is target-specific. A confirmed timing fault for one target must not hide the record, its normal score, its replay, or unrelated target metrics. Missing fields on historical records do not by themselves mean the records are untrusted.

### Required Tests

- Unit: serialize immediately before and after restore and compare the V1 lineage as `identical`.
- Unit: restore, advance the timer, make one real move, and assert the old records are unchanged and the new `deltaMs` bridges the same timer timeline.
- Unit: assert internal restore actions cause no submit, achievement, checkpoint-save, or terminal side effects.
- Integration: verify public speed leaderboard, personal best, and speed achievements apply the same target-specific exclusion rule while the normal score leaderboard remains unchanged.
- Built-in browser smoke: refresh an ongoing game, continue it, finish it, and compare the visible timer with server-derived target times.
