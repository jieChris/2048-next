# Architecture Realignment Implementation Plan

## Execution Rule

This is a cross-repository migration. Execute one stage at a time. A stage is not complete until its tests pass, its boundary checks pass, and obsolete frontend-owned authority for that stage has either been removed or explicitly marked as a temporary shim.

Before changing source code for a stage, read the relevant `.trellis/spec/` files in the repository being changed.

## Stage 0: Planning Baseline

- [x] Create `.trellis/spec/` in `2048-next`.
- [x] Create `.trellis/spec/` in `2048-game-api`.
- [x] Create `.trellis/spec/` in `2048-ranked`.
- [x] Create PRD at `2048-next-logo-work/.trellis/tasks/06-21-architecture-realignment/prd.md`.
- [x] Record that `2048-ranked` must be fully de-databased.
- [x] Record that a short maintenance window is acceptable for ranked persistent data migration.
- [x] Create design document for staged migration.

Validation:

```bash
cd /Users/a19/Documents/2048-Next/2048-next-logo-work
rg -n -f /tmp/trellis-empty-marker-patterns.txt .trellis/spec .trellis/tasks/06-21-architecture-realignment
```

Expected result: no empty-marker matches. Create `/tmp/trellis-empty-marker-patterns.txt` from the team's standard empty-marker list before running this check.

## Stage 1: Move Account Authority Into `2048-game-api`

Goal: the self-hosted `2048-game-api` backend owns account registration, login, password flows, current-user lookup, token signing, and token refresh compatibility if still needed.

Files to inspect first:

- `/Users/a19/Documents/2048-Next/2048-game-api/2048-game-api/.trellis/spec/backend-ownership.md`
- `/Users/a19/Documents/2048-Next/2048-game-api/2048-game-api/.trellis/spec/api-contracts-and-persistence.md`
- `/Users/a19/Documents/2048-Next/2048-game-api/2048-game-api/src/index.ts`
- `/Users/a19/Documents/2048-Next/2048-game-api/2048-game-api/src/server/app.ts`
- `/Users/a19/Documents/2048-Next/2048-game-api/2048-game-api/src/server/auth.ts`
- `/Users/a19/Documents/2048-Next/2048-game-api/2048-game-api/src/server/db.ts`
- `/Users/a19/Documents/2048-Next/2048-ranked/src/server/game/auth-endpoints.ts`
- `/Users/a19/Documents/2048-Next/2048-ranked/src/app/api/auth/token/route.ts`
- `/Users/a19/Documents/2048-Next/2048-ranked/src/app/api/auth/refresh/route.ts`
- `/Users/a19/Documents/2048-Next/2048-ranked/src/lib/auth/password.ts`
- `/Users/a19/Documents/2048-Next/2048-ranked/src/lib/auth/v2-token.ts`
- `/Users/a19/Documents/2048-Next/2048-ranked/src/lib/db/schema.ts`

Implementation tasks:

- [x] Add failing `2048-game-api` node route tests for the account contract consumed by both frontends:
  - `/api/login`
  - `/api/login/captcha`
  - `/api/register/check-nickname`
  - `/api/register/start`
  - `/api/register/verify`
  - `/api/register`
  - `/api/password/reset/start`
  - `/api/password/reset/verify`
  - `/api/password/change`
  - `/api/me`
  - `/api/user/me`
  - `/api/auth/refresh`.
- [x] Add Postgres migrations in `2048-game-api/migrations/postgres/` for account master tables and email verification/reset state.
- [x] Implement account data access in `2048-game-api/src/server/` using the existing Postgres pool abstraction.
- [x] Port password hash verification behavior from the ranked implementation into `2048-game-api`, including argon2 and legacy fallback support.
- [x] Implement token signing in `2048-game-api` using the existing v2 signature scope `2048-auth-token`.
- [x] Wire account routes into `2048-game-api/src/server/app.ts`.
- [x] Define account master users as `game_data.users` and keep `game_data.users_shadow` synchronized during login, current-user lookup, registration, and game auth flows.
- [x] Keep Worker code as compatibility reference only; do not make Worker the production account owner.

Current Stage 1 notes:

- `2048-game-api` now has self-hosted Node tests in `test/node/account-routes.spec.ts`.
- Production OTP email sending uses Resend REST configuration through `RESEND_API_KEY` and `RESEND_FROM_EMAIL`; non-production responses include `devCode` for local testing.
- `/api/user/:id` already existed before this stage and remains backed by `users_shadow`; revisit it during Stage 3/4 if public profile data must come from account master rows instead.

Validation commands:

```bash
cd /Users/a19/Documents/2048-Next/2048-game-api/2048-game-api
npm run typecheck
npm run test:node
npm run test
```

Rollback:

- Revert additive account routes and migrations before any frontend is pointed at them.
- If migrations have been applied to a shared database, leave additive tables in place but disable new routes through deployment rollback.

## Stage 2: Point `2048-next` At `2048-game-api`

Goal: `2048-next` keeps its full account/game UI while all backend behavior comes from `2048-game-api`.

Files to inspect first:

- `/Users/a19/Documents/2048-Next/2048-next-logo-work/.trellis/spec/frontend-api-boundary.md`
- `/Users/a19/Documents/2048-Next/2048-next-logo-work/.trellis/spec/cross-repo-architecture.md`
- `/Users/a19/Documents/2048-Next/2048-next-logo-work/scripts/dev-local.mjs`
- `/Users/a19/Documents/2048-Next/2048-next-logo-work/vite.config.ts`
- `/Users/a19/Documents/2048-Next/2048-next-logo-work/src/services/api-client.ts`
- `/Users/a19/Documents/2048-Next/2048-next-logo-work/js/api_shared_utils.js`
- `/Users/a19/Documents/2048-Next/2048-next-logo-work/src/bootstrap/ranked-session.ts`

Implementation tasks:

- [x] Add or update a boundary test proving `scripts/dev-local.mjs` no longer defaults to `../2048-ranked`.
- [x] Change `LOCAL_API_DIR` default to `/Users/a19/Documents/2048-Next/2048-game-api/2048-game-api` relative path `../2048-game-api/2048-game-api`.
- [x] Normalize all documented local API examples to `2048-game-api`.
- [ ] Run and adjust account/current-user and ranked-session smoke tests against the `2048-game-api` contract.
- [ ] Preserve browser-side account UX and storage keys unless a contract mismatch requires a compatibility adapter.

Current Stage 2 notes:

- `scripts/dev-local.mjs` now launches `2048-game-api` with `npm run dev:server` and passes `HTTP_PORT`.
- `README.md` local API development instructions now name `2048-game-api`.
- `tests/unit/dev-local-api-boundary.spec.ts` guards the local API directory and command boundary.
- Verified with `npm run test:unit -- tests/unit/dev-local-api-boundary.spec.ts`, `npm run audit:service-boundary`, and `npm run verify:prepush`.

Validation commands:

```bash
cd /Users/a19/Documents/2048-Next/2048-next-logo-work
npm run audit:service-boundary
npm run verify:prepush
```

Rollback:

- Revert API target changes if account/game smoke tests fail against `2048-game-api`.

## Stage 3: Move Game Backend Authority Out Of `2048-ranked`

Goal: game records, replay storage, leaderboard derivation, ranked sessions, ranked checkpoints, relay, stone-2k, rescue, and admin game APIs are served by `2048-game-api`.

Files to inspect first:

- `/Users/a19/Documents/2048-Next/2048-ranked/.trellis/spec/server-code-retirement.md`
- `/Users/a19/Documents/2048-Next/2048-ranked/src/server/game/app.ts`
- `/Users/a19/Documents/2048-Next/2048-ranked/src/server/game/auth.ts`
- `/Users/a19/Documents/2048-Next/2048-ranked/src/server/game/replay-storage.ts`
- `/Users/a19/Documents/2048-Next/2048-ranked/src/server/game/entry-sync.ts`
- `/Users/a19/Documents/2048-Next/2048-ranked/src/server/replay_verify.ts`
- `/Users/a19/Documents/2048-Next/2048-ranked/src/app/api/game/[[...path]]/route.ts`
- `/Users/a19/Documents/2048-Next/2048-game-api/2048-game-api/src/server/app.ts`
- `/Users/a19/Documents/2048-Next/2048-game-api/2048-game-api/src/replay_verify.ts`

Implementation tasks:

- [x] Build a route matrix comparing ranked `src/server/game/*` routes to `2048-game-api/src/server/app.ts`.
- [x] Add missing `2048-game-api` node tests for any route currently only covered in `2048-ranked`.
- [x] Migrate or reconcile missing route implementations into `2048-game-api`.
- [x] Replace `2048-ranked` local game route handling with calls to `2048-game-api`.
- [x] Keep only temporary proxy shims needed for deployment routing, with comments naming their removal condition.
- [x] Remove direct `2048-ranked` imports of replay verifier and game backend internals after equivalent API calls exist.

Current Stage 3 notes:

- Route parity comparison found one missing self-hosted `2048-game-api` endpoint: `POST /api/admin/rescue-offers/from-replay`.
- `2048-game-api` now includes rescue replay derivation in `src/replay_verify.ts`, a database-backed `super_admin` admin check, nickname target resolution, sanitized rescue timer rows, and the `from-replay` admin route.
- `2048-game-api` account responses now include role data, and nickname updates are exposed through `PATCH /api/me`, `POST /api/me/nickname`, `POST /api/user/me/nickname`, and `POST /api/user/nickname`.
- `2048-ranked` now proxies `/api/game/*`, `/api/auth/token`, `/api/auth/refresh`, and `/api/health` to `2048-game-api`.
- `2048-ranked` NextAuth credentials and auth server actions now call `2048-game-api` instead of local users, OTP, password, token, audit, or game backend helpers.
- Runtime scans over `2048-ranked/src/app` and `2048-ranked/src/lib` no longer find local game backend, replay verifier, password verifier, email OTP, or v2 token signer authority. Remaining `src/lib/db/*` usage is Stage 4 ranked product persistence.

Stage 3 validation run:

```bash
cd /Users/a19/Documents/2048-Next/2048-game-api/2048-game-api
npm run typecheck
npm run test:node

cd /Users/a19/Documents/2048-Next/2048-ranked
npm run typecheck
npm run test
```

Observed result: all listed Stage 3 commands passed. `2048-game-api npm run test` remains excluded from the Stage 3 pass claim because legacy Worker tests still assert pre-migration Worker route behavior.

Validation commands:

```bash
cd /Users/a19/Documents/2048-Next/2048-game-api/2048-game-api
npm run typecheck
npm run test:node
npm run test

cd /Users/a19/Documents/2048-Next/2048-ranked
npm run typecheck
npm run test
```

Rollback:

- Restore ranked route shim to previous deployed behavior if `2048-game-api` route parity fails.

## Stage 4: Move Ranked Product Persistence Into `2048-game-api`

Goal: boards, entries, players, posts, invites, permissions, audit logs, and admin review workflows are backend-owned by `2048-game-api`.

Files to inspect first:

- `/Users/a19/Documents/2048-Next/2048-ranked/src/lib/db/schema.ts`
- `/Users/a19/Documents/2048-Next/2048-ranked/src/lib/db/queries.ts`
- `/Users/a19/Documents/2048-Next/2048-ranked/src/lib/audit.ts`
- `/Users/a19/Documents/2048-Next/2048-ranked/src/app/_actions/boards.ts`
- `/Users/a19/Documents/2048-Next/2048-ranked/src/app/_actions/entries.ts`
- `/Users/a19/Documents/2048-Next/2048-ranked/src/app/_actions/review.ts`
- `/Users/a19/Documents/2048-Next/2048-ranked/src/app/_actions/users.ts`
- `/Users/a19/Documents/2048-Next/2048-ranked/src/app/boards/page.tsx`
- `/Users/a19/Documents/2048-Next/2048-ranked/src/app/boards/[slug]/page.tsx`
- `/Users/a19/Documents/2048-Next/2048-ranked/src/app/hall-of-fame/page.tsx`
- `/Users/a19/Documents/2048-Next/2048-ranked/src/app/me/page.tsx`

Implementation tasks:

- [x] Add `2048-game-api` migrations for ranked content tables based on the ranked Drizzle schema.
- [x] Add API tests for public board list/detail reads.
- [ ] Add API tests for entry submission, review, edit, delete, import dedupe, and audit emission.
- [ ] Add API tests for invite creation/consumption and permission management.
- [ ] Implement read endpoints for `2048-ranked` public pages.
- [ ] Implement admin mutation endpoints with token-authenticated role and board-permission checks.
- [ ] Create a typed `2048-ranked` API client module for server components and server actions.
- [ ] Convert public pages from direct DB queries to API calls.
- [ ] Convert admin server actions from direct DB mutations to API calls.
- [x] Convert auth/profile/password/nickname flows to `2048-game-api` endpoints.
- [ ] Remove `2048-ranked` direct DB imports from migrated pages/actions.

Current Stage 4 notes:

- Added `2048-game-api/migrations/postgres/0003_ranked_product_content.sql` for `players`, `boards`, `entries`, `board_permissions`, `invites`, `audit_logs`, and `daily_briefs` under `game_data`.
- Added `2048-game-api` public ranked content tests in `test/node/ranked-content-routes.spec.ts`.
- Added `GET /api/ranked/boards`, `GET /api/ranked/boards/:slug`, and `GET /api/ranked/boards/:slug/entries` to `2048-game-api`.
- Added public ranked post reads to `2048-game-api`: `GET /api/ranked/posts/latest` and `GET /api/ranked/posts`.
- Added public ranked player reads to `2048-game-api`: `GET /api/ranked/players/:id`, `GET /api/ranked/players/:id/entries`, and `GET /api/ranked/players/:id/game-milestones`.
- Added authenticated current-user submissions read to `2048-game-api`: `GET /api/ranked/me/submissions`.
- Added ranked invite and permission reads/writes to `2048-game-api`: `GET /api/ranked/invites/:token`, `POST /api/ranked/invites/:token/consume`, and `GET /api/ranked/me/permissions`.
- Added ranked admin invite management to `2048-game-api`: `GET /api/ranked/admin/invites`, `POST /api/ranked/admin/invites`, and `DELETE /api/ranked/admin/invites/:id`, with token-authenticated `super_admin` checks and audit writes.
- Added ranked admin read APIs to `2048-game-api`: `GET /api/ranked/admin/users`, `GET /api/ranked/admin/board-permissions`, and `GET /api/ranked/admin/boards`.
- Added ranked admin user mutation APIs to `2048-game-api`: `PATCH /api/ranked/admin/users/:id/role` and `PATCH /api/ranked/admin/users/:id/active`, with `super_admin` checks, self/super-admin guards, board-permission cleanup on player downgrade, and audit writes.
- Added ranked admin permission mutation APIs to `2048-game-api`: `PUT /api/ranked/admin/board-permissions` and `PATCH /api/ranked/admin/users/:id/post-permissions`, with `super_admin` checks and audit writes.
- Added ranked admin audit read APIs to `2048-game-api`: `GET /api/ranked/admin/audit` and `GET /api/ranked/admin/audit/actions`.
- Added `2048-ranked/src/lib/game-api-client.ts` for server-side `game-api` calls.
- Added `2048-ranked/src/lib/ranked-content-client.ts` for public boards, entries, posts, players, game milestones, invites, permissions, and authenticated current-user submissions reads.
- Replaced `2048-ranked/src/app/_actions/auth.ts` with a thin `game-api` adapter for register, reset, login, change password, and change nickname.
- Replaced `2048-ranked/src/lib/auth/config.ts` credentials authorization with `game-api /api/login` and token-backed `/api/me` refresh.
- Deleted `2048-ranked/src/lib/auth/v2-token.ts` and its local signer test because token signing now belongs to `2048-game-api`.
- Converted `2048-ranked` public board, board detail, leaderboard entries, posts/briefs, player profile, player entries, player game milestones, hall-of-fame, `/me` submissions, and sitemap reads to `game-api` API-backed clients.
- Converted `2048-ranked` invite consume page and invite consume action to `game-api` API-backed clients.
- Converted `2048-ranked` admin invite create, revoke, and list flows to `game-api` API-backed clients; `2048-ranked` still sends the invite email after receiving the backend-owned raw invite token.
- Converted `2048-ranked/src/app/admin/users/page.tsx` user, board-permission, and admin-board reads to `game-api` API-backed clients.
- Converted `2048-ranked/src/app/admin/users/invite/page.tsx` and `2048-ranked/src/app/admin/permissions/page.tsx` board/user/permission reads to `game-api` API-backed clients.
- Converted `2048-ranked` admin user role and active-state actions to `game-api` API-backed clients.
- Converted `2048-ranked` admin board-permission and post-permission actions to `game-api` API-backed clients.
- Converted `2048-ranked/src/app/admin/audit/page.tsx` audit log and action reads to `game-api` API-backed clients.
- Converted `2048-ranked/src/lib/auth/permissions.ts` board/post permission checks and display-name resolution away from direct DB reads.
- Stage 4 public/admin conversion is not complete: admin board/entry/review/post pages/actions and several board/entry/review/post mutation workflows still contain direct DB imports for boards, entries, players, audit logs, and posts.

Stage 4 partial validation run:

```bash
cd /Users/a19/Documents/2048-Next/2048-game-api/2048-game-api
npm run typecheck
npm run test:node

cd /Users/a19/Documents/2048-Next/2048-ranked
npm run typecheck
npm run test
```

Observed result after the latest Stage 4 public-read migration:

- `2048-game-api npm run typecheck` passed.
- `2048-game-api npm run test:node` passed: 7 files / 34 tests.
- `2048-ranked npm run typecheck` passed.
- `2048-ranked npm run test` passed: 26 files / 124 tests.
- `2048-ranked npm run lint` still fails on pre-existing issues outside this Stage 4 slice: `src/components/color-scheme-toggle.tsx` React hook set-state-in-effect and `src/server/game/auth.ts` `prefer-const`; this run also reports existing warnings in scripts/server legacy files.

Validation commands:

```bash
cd /Users/a19/Documents/2048-Next/2048-game-api/2048-game-api
npm run typecheck
npm run test:node
npm run test

cd /Users/a19/Documents/2048-Next/2048-ranked
npm run typecheck
npm run lint
npm run test
npm run e2e
```

Rollback:

- Keep old ranked deployment and database snapshot until public reads and admin writes pass verification against `2048-game-api`.

## Stage 5: Data Migration, Production Cutover, And Removal

Goal: production data and traffic use `2048-game-api`; frontend-owned backend/database code is deleted.

Implementation tasks:

- [ ] Write export/import scripts or one migration command for ranked persistent data.
- [ ] Dry-run migration against a copied database.
- [ ] Verify row counts for users, boards, players, entries, posts, invites, permissions, audit logs, and game linkage tables.
- [ ] Verify uniqueness constraints for board slugs, invite token hashes, entry import dedupe keys, and user identifiers.
- [ ] Freeze `2048-ranked` admin/backend writes for the maintenance window.
- [ ] Keep public read-only pages available if the read path is already stable against migrated data.
- [ ] Run production migration.
- [ ] Switch production API routing so `/api/*` game/account/ranked-content traffic resolves to `2048-game-api`.
- [ ] Verify online `/api/health` and `/api/game/health` identify `2048-game-api` rather than `2048-ranked`.
- [ ] Delete obsolete `2048-ranked` backend/database authority:
  - `src/server/game/*`
  - `src/server/replay_verify.ts`
  - `src/app/api/game/[[...path]]/route.ts`
  - `src/app/api/auth/token/route.ts`
  - `src/app/api/auth/refresh/route.ts`
  - local token signing/password verification authority that is no longer used
  - `src/lib/db/*`
  - `drizzle/*`
  - `migrations/postgres/*`
  - `db:*` package scripts
- [ ] Run final cross-repo verification.

Validation commands:

```bash
cd /Users/a19/Documents/2048-Next/2048-game-api/2048-game-api
npm run typecheck
npm run test:node
npm run test

cd /Users/a19/Documents/2048-Next/2048-next-logo-work
npm run audit:service-boundary
npm run verify:prepush

cd /Users/a19/Documents/2048-Next/2048-ranked
npm run typecheck
npm run lint
npm run test
npm run e2e
```

Boundary scan:

```bash
cd /Users/a19/Documents/2048-Next/2048-ranked
rg -n "src/server/game|@/lib/db|from ['\\\"].*lib/db|drizzle|DATABASE_URL|signV2Token|verifyPassword|replay_verify" src package.json
```

Expected result: no authoritative DB/token/password/game-server matches. Non-authoritative documentation or test fixture matches must be reviewed and explained before completion.

Rollback:

- If cutover validation fails before deletion, restore the previous `2048-ranked` deployment and database snapshot.
- If cutover validation fails after route switch but before code deletion, switch `/api/*` routing back to the previous provider and keep writes frozen until data consistency is understood.

## Final Completion Criteria

- `2048-game-api` is the only service with production DB credentials.
- `2048-game-api` owns all account, game-data, ranked-session, ranked-content, admin, and audit persistence.
- `2048-next` keeps account UI but has no backend/database authority.
- `2048-ranked` keeps ranking/admin/content UI but has no backend/database authority.
- Both frontends authenticate against the same `2048-game-api` token/account contract.
- All three repositories document the same boundaries in `.trellis/spec/`.
- Production health checks prove the live backend is `2048-game-api`.
