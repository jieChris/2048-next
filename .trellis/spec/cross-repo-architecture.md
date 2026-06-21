# Cross-Repo Architecture

## Target Shape

The three repositories must be treated as separate modules:

- `2048-game-api`: the only backend, API authority, database access layer, account system, token issuer/verifier, game-data service, replay verifier, ranked-session service, and admin API.
- `2048-next`: the game frontend. It keeps the complete account user experience but calls `2048-game-api` for all account and data authority.
- `2048-ranked`: the leaderboard, ranking, management, and content frontend. It calls `2048-game-api` for identity, game data, leaderboard, records, replay, ranked session, and admin game-data actions.

## Current Known Drift

The current codebase does not yet match the target shape:

- `2048-next` local API development has been moved to `2048-game-api`; keep future local docs and scripts aligned with that backend.
- `2048-ranked` currently contains backend code under `src/server/game/*`, API routes under `src/app/api/game/[[...path]]/route.ts`, auth API routes under `src/app/api/auth/*`, Drizzle schema and migrations, and direct database access under `src/lib/db/*`.
- `2048-game-api` contains a self-hosted backend under `src/server/*`, but its self-hosted route set is not yet the complete account + data authority expected by the target boundary.

These drift points are not patterns to copy. They are migration targets.

## Boundary Rules

New work should move authority toward `2048-game-api`, not add more server authority to either frontend.

When a feature needs persisted state, account authority, password logic, token logic, replay verification, ranked-session lifecycle, admin rescue persistence, or leaderboard derivation, implement the authoritative behavior in `2048-game-api` first. Frontends should consume it through explicit HTTP contracts.

When a frontend needs a new view, keep the frontend responsible for rendering, input state, optimistic UI, loading/error states, and API client integration only.

## Deployment Rule

Production `/api/*` for the game domain must resolve to `2048-game-api` after the architecture归位. Any proxy to `2048-ranked` for game API paths is a temporary migration state and should be documented as such.
