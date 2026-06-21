# Architecture Realignment PRD

## Goal

Realign the 2048 ecosystem into three isolated modules:

- `2048-game-api` is the only backend and the only database access layer.
- `2048-next` is the game frontend and keeps the full account user experience through API calls.
- `2048-ranked` is the leaderboard, ranking, management, and content frontend through API calls.

## User Value

The project should be easier to maintain long-term because account authority, persistence, game records, replay verification, ranked sessions, leaderboard derivation, and admin data are owned by one backend instead of being duplicated across frontends.

## Confirmed Facts

- `2048-next` currently has account-facing UI in pages such as `src/pages/account-page.ts`, `src/pages/register-page.ts`, `src/pages/account-settings-page.ts`, and `src/pages/password-page.ts`.
- `2048-next` currently calls API routes through helpers such as `src/services/api-client.ts` and `js/api_shared_utils.js`.
- `2048-next/scripts/dev-local.mjs` now defaults local API development to `../2048-game-api/2048-game-api`, matching the target boundary.
- `2048-game-api/src/index.ts` contains the legacy Cloudflare Worker implementation with account routes and game-data routes.
- `2048-game-api/src/server/*` contains the self-hosted Node + Hono + PostgreSQL implementation, but its current route set is primarily game-data oriented and does not yet expose the full account API contract.
- `2048-ranked` currently contains Next.js pages plus backend authority: `src/server/game/*`, `src/app/api/game/[[...path]]/route.ts`, `src/app/api/auth/*`, Drizzle schema, migrations, and direct database access.
- `.trellis/spec/` now exists in all three repositories and records the target ownership boundaries.

## Requirements

- `2048-game-api` must own all authoritative database reads/writes.
- `2048-game-api` must own account registration, login, password reset/change, nickname checks, current-user lookup, token signing, and token verification.
- `2048-game-api` must own game records, replay storage, replay verification, ranked sessions, ranked checkpoints, leaderboard derivation, relay, stone-2k, admin rescue, and audit APIs.
- `2048-next` must keep full account UI and game UI, but it must access all backend behavior through `2048-game-api`.
- `2048-ranked` must keep ranking/leaderboard/management UI, but it must access all backend behavior through `2048-game-api`.
- Frontend repositories must not keep direct DB credentials, schema migrations, token-signing authority, password hashing authority, replay verification authority, or backend-owned route implementations after migration.
- `2048-ranked` must also be fully de-databased: boards, entries, posts, invites, permissions, audit logs, and other persisted ranking/management data must move to `2048-game-api`.

## Acceptance Criteria

- Production `/api/*` routes for the game domain resolve to `2048-game-api`.
- Local `2048-next` development targets `2048-game-api`, not `2048-ranked`.
- `2048-ranked` no longer needs direct database credentials to run as a frontend.
- `2048-ranked` no longer serves authoritative game/account API routes.
- `2048-ranked` no longer owns Drizzle schema, migrations, or direct database access for boards, entries, posts, invites, permissions, audit logs, users, game records, or admin workflows.
- `2048-game-api` has tests for the account and game API contracts consumed by both frontends.
- Both frontends have tests or smoke checks proving they use the external backend API rather than local database/server authority.
- Documentation in all three repositories describes the same module boundary.

## Out Of Scope For First Implementation Plan

- Visual redesign of either frontend.
- Changing game rules or leaderboard formulas unless required by API migration.
- Historical data cleanup beyond what is required to move authority to `2048-game-api`.

## Confirmed Scope Decision

`2048-ranked` should not keep any local database-backed content system. Every persisted object, including boards, entries, posts, invites, permissions, and audit logs, must move to `2048-game-api`.

## Confirmed Migration Strategy

Use a staged cutover. Each stage must remove one category of local frontend-owned backend responsibility before the next stage begins. Compatibility or proxy shims are allowed only as temporary migration scaffolding, not as a permanent architecture layer.

Recommended stage order:

1. Move account authority into `2048-game-api` self-hosted backend.
2. Point `2048-next` account and game-data calls at `2048-game-api`.
3. Move game-data and ranked-session authority out of `2048-ranked` and into `2048-game-api`.
4. Move `2048-ranked` content, boards, entries, invites, permissions, posts, and audit persistence into `2048-game-api`.
5. Remove `2048-ranked` local database, migrations, token signing, game API routes, and direct DB imports.

## Confirmed Operational Decision

- A short maintenance window is acceptable for migrating `2048-ranked` persistent data into `2048-game-api`.
- During the migration window, freeze `2048-ranked` admin and backend writes.
- Keep public read-only pages available during migration if feasible; if preserving read-only access adds meaningful risk, prioritize data correctness and a clean cutover.

## Open Questions

- None.
