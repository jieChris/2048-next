# Implementation Plan

1. Preserve the current expired ranked-session finalization path and restrict competitive leaderboard derivation to records linked to a ranked session.
2. Prefer `CF-Connecting-IP`; use the nearest trusted proxy hop from `X-Forwarded-For` only as a fallback. Upgrade Hono and add regression tests.
3. Move the recent NO X persistence helpers into the existing TypeScript runtime so the game-manager size gate passes without raising its budget. Make deployment run the full release gate.
4. Add post-activation health checks and conservative rollback to deploy workflows. Patch the ranked PostCSS dependency path.
5. Correct stale Trellis architecture maps and run repository-wide verification.

## Validation

- API: `npm run typecheck`, `npm run test:node`, `npm audit --omit=dev`
- Main: targeted unit/smoke tests, `npm run verify:release`, `npm run build`
- Ranked: `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build`, `pnpm audit --prod`
