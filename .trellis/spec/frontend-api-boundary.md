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
