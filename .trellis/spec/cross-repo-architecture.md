# Cross-Repo Architecture

## Target Shape

The three repositories must be treated as separate modules:

- `2048-game-api`: the only backend, API authority, database access layer, account system, token issuer/verifier, game-data service, replay verifier, ranked-session service, and admin API.
- `2048-next`: the game frontend. It keeps the complete account user experience but calls `2048-game-api` for all account and data authority.
- `2048-ranked`: the leaderboard, ranking, management, and content frontend. It calls `2048-game-api` for identity, game data, leaderboard, records, replay, ranked session, and admin game-data actions.

## Current State

The repositories now match the authority boundary:

- `2048-next` calls `2048-game-api` and keeps only browser state and UI behavior.
- `2048-ranked` has removed local game/account persistence and authority. Its remaining `/api/game/*` and `/api/auth/*` handlers are compatibility proxies.
- `2048-game-api/src/server/*` owns the complete production account, game-data, ranked-product, token, replay, and persistence route set.

Keep compatibility proxies thin and remove them when callers no longer depend on their paths.

## Boundary Rules

New work should move authority toward `2048-game-api`, not add more server authority to either frontend.

When a feature needs persisted state, account authority, password logic, token logic, replay verification, ranked-session lifecycle, admin rescue persistence, or leaderboard derivation, implement the authoritative behavior in `2048-game-api` first. Frontends should consume it through explicit HTTP contracts.

When a frontend needs a new view, keep the frontend responsible for rendering, input state, optimistic UI, loading/error states, and API client integration only.

## Deployment Rule

Production `/api/*` for the game domain must resolve to `2048-game-api` after the architecture归位. Any proxy to `2048-ranked` for game API paths is a temporary migration state and should be documented as such.
