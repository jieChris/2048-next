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

## Mobile Client Diagnostics Boundary

- The Android client may call anonymous `POST /client-diagnostics` only after the current privacy choice is online and the automatic diagnostics setting is enabled. The request never carries `Authorization` or account identity.
- A diagnostic created while privacy is offline or automatic diagnostics are disabled is stored with `uploadPolicy: never` and must not be retroactively uploaded after consent or re-enabling.
- Uploads contain only event/category/severity/time plus error type, redacted stack, App version/build number, Android version, and WebView version. Before local storage and upload, redact emails, Bearer/JWT-like values, credential-shaped key/value pairs, URL queries/fragments, and local OS usernames.
- Do not add board state, replay data, move sequences, nickname, email, Token, user ID, device identifiers, navigation analytics, or gameplay analytics to this contract.
- Manual export may include the same local technical fields and upload status, but must omit local `ownerKey`. Android export uses only the dedicated `diagnostic-share/` cache subtree and removes the temporary file after the system share/save panel returns.

## Scenario: Pending Score Uploads After Expired Auth

### 1. Scope / Trigger

- Trigger: Browser-side game result submission touches both local retry queues and authenticated backend APIs.
- Affected client flows: `/score`, `/records`, and stone-2k submission retries from `js/online_leaderboard_runtime.js`.

### 2. Signatures

- Record upload: `POST <apiBase>/records`
- Score upload: `POST <apiBase>/score`
- Stone-2k upload: `POST <apiBase>/stone-2k`
- Auth header: `Authorization: Bearer <token>`
- Pending storage keys:
  - `online_pending_score_submit_v1`
  - `online_pending_record_submit_signature_v1`
  - `online_pending_stone_2k_submit_v1`

### 3. Contracts

- Terminal `/records` payloads must be persisted to `online_pending_record_submit_signature_v1` before the code checks whether an auth token is currently present. A ranked-session 401 can clear auth immediately before game-over submit hooks run; the terminal payload must survive that ordering.
- Terminal payload persistence must finish synchronously before the first async retry/upload boundary. Once that durable copy exists, retire the matching active ranked session while preserving any distinct prefetched session, so refresh cannot reuse the completed seed/token.
- A pre-auth pending write is only a durability step. It must not be counted as a network upload attempt for retry/backoff purposes when the same call will immediately submit the payload.
- On authenticated upload success, the matching pending key may be cleared.
- On permanent non-auth validation errors, the matching pending key may be cleared only when the backend has definitively rejected the payload.
- On `401`, `403`, `UNAUTHORIZED`, or equivalent expired-session upload errors, clear only the auth session keys and keep the pending payload so the user can re-login and retry.
- Manual logout may clear both auth session keys and pending upload state.

### 4. Validation & Error Matrix

- `2xx success:true` -> clear matching pending payload.
- `401/403` or `code: "UNAUTHORIZED"` -> clear token/user/nickname only; keep pending payload.
- Transient network/server error -> keep pending payload and retry later.
- Backend payload validation failure -> do not retry the same invalid payload indefinitely.

### 5. Good/Base/Bad Cases

- Good: User finishes a game with an expired token, record upload receives 401, pending record remains in local storage, auth token is removed, and re-login can replay the pending upload.
- Good: Ranked-session startup clears an expired auth token before `maybeSubmitRecordOnGameOver()` runs; the terminal record payload is still written to pending storage and is retried after login returns.
- Base: User finishes a game while logged in with a valid token, backend accepts the record, and pending storage is cleared.
- Bad: Upload receives 401 and the frontend calls full `clearAuth()`, deleting pending results before the user has a chance to re-login.
- Bad: Pending is written once before token validation and then the same pending state is reused for immediate upload, causing `retryCount` to increment before the first network attempt and doubling the transient retry delay.

### 6. Tests Required

- Unit test: simulate `/records` returning 401 and assert pending record payload remains while auth token is removed.
- Unit test: remove auth before game-over submit runs and assert a terminal pending record is written without calling `/records`.
- Unit test: hold `/records` upload open and assert the pending payload is already stored, the completed active ranked session is gone, and the prefetched next session remains.
- Unit coverage for score and stone-2k uploads should follow the same assertion pattern when those paths change.
- Smoke test: persisted pending record is replayed after auth/session recovery.
- Smoke test: transient `/records` failures retry after the expected first backoff interval; pre-auth pending durability writes must not advance `retryCount` for the first network attempt.

### 7. Wrong vs Correct

#### Wrong

```js
if (isUnauthorizedSubmitErrorText(errorText)) {
  clearPendingRecordSubmitSignature();
  clearAuth();
  return;
}
```

#### Correct

```js
if (isUnauthorizedSubmitErrorText(errorText)) {
  clearAuthSessionOnly();
  return;
}
```

#### Wrong

```js
writePendingRecordSubmitSignature(signature, pendingState, payload);
pendingState = readPendingRecordSubmitState();
if (!getAuthToken()) return;
// The immediate upload below now treats the durability write as a previous attempt.
writePendingRecordSubmitSignature(signature, pendingState, payload);
```

#### Correct

```js
writePendingRecordSubmitSignature(signature, pendingState, payload);
if (!getAuthToken()) return;
// The first real upload still records retryCount as the first network attempt.
writePendingRecordSubmitSignature(signature, pendingState, payload);
```

## Scenario: Exactly-Once Record Submission Across Lifecycle and Pages

### 1. Scope / Trigger

- Trigger: a terminal record can be observed by startup polling, a wrapped game-manager method, `pagehide`/`beforeunload`, or another same-origin game page during reload or duplicate-page recovery.
- Affected state: the active pending record, the queued pending records, the last handled signature, the in-memory upload lock, and the shared backend `client_record_id` idempotency contract.

### 2. Stable Identity

- A non-empty `client_record_id` is the primary browser-side identity of a terminal record. Current pending state, queued state, last-handled state, and lifecycle retries must compare it before any legacy derived signature.
- Replay fingerprints, score, mode, seed, and move count are only a compatibility fallback for old payloads that do not contain `client_record_id`; they must not create a second identity for a modern record.
- Success or permanent rejection must remove every current/queued state with the same `client_record_id`. Authentication and transient failures keep the durable state.

### 3. Initialization and Lifecycle Ordering

- Online submit hooks must bind when `GameManager` is created even if the online runtime initialized first; DOM readiness is not a valid prerequisite for terminal persistence.
- Online polling may start before `DOMContentLoaded` when the page is eligible for online autoload, so a terminal game present during reload is not left unobserved.
- `pagehide`/`beforeunload` must not upload a terminal record that is already durable pending state. A newly observed terminal record may still use keepalive after first being persisted.
- A scheduler wake received while its callback is running must be latched and rerun immediately after the callback settles. The normal interval/backoff reschedule must not overwrite that wake.

### 4. Cross-Page Serialization

- The in-memory upload lock prevents re-entry only inside one page. When native Web Locks are available, record retry must additionally take one same-origin exclusive lock and re-read pending storage inside the lock before sending.
- If Web Locks are unavailable, the backend `client_record_id` uniqueness contract remains the authoritative duplicate barrier; the browser must still preserve one durable payload and must never mutate its ID between retries.
- A page acquiring the lock after another page completed the upload must observe cleared pending storage and make no second request.

### 5. Tests Required

- Unit: manager creation after online-runtime load binds terminal hooks immediately.
- Unit: eligible polling starts before `DOMContentLoaded`.
- Unit: wake during an active refresh causes an immediate second callback.
- Unit: legacy signatures with the same `client_record_id` collapse to one current/queued item and one request.
- Unit: two page runtimes sharing storage and a Web Lock issue one `/records` request.
- Smoke: reload/lifecycle retry clears pending state and writes last-handled state; repeat the scenario enough times to expose ordering races.
