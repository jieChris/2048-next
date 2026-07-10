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
