# Production Readiness Hardening

## Goal

Close the production-readiness defects found in the 2026-07-10 audit without opening the closed beta or sacrificing an in-progress ranked game.

## Requirements

- Final record submission must continue accepting a valid signed ranked session after its TTL expires.
- Session expiry, API failure, reload, or authentication recovery must not replace or clear an in-progress game. Only an explicit restart or terminal game-over may start the next session.
- User-submitted verified records without a ranked session may remain in history, but must not enter the competitive leaderboard. Backend-authorized admin/migration imports remain eligible.
- Per-IP auth throttles must not trust attacker-controlled forwarding headers.
- Production dependencies must have no known high-severity runtime vulnerability.
- A deployment must not run when the repository release gate is red.
- Failed production activation must roll back to the previous healthy release where the deployment shape supports rollback.
- Keep the closed-beta gate enabled.

## Acceptance Criteria

- Existing expired-session final-submit coverage remains green.
- New coverage proves a sessionless normal record cannot update `leaderboard_best` while trusted admin/migration imports remain eligible.
- New coverage proves Cloudflare IP precedence and safe fallback behavior.
- `npm audit --omit=dev` is clean for `2048-game-api`; `pnpm audit --prod` has no known vulnerable PostCSS version for `2048-ranked`.
- `2048-next` deploy runs `verify:release`, and `verify:release` passes locally.
- Three repositories pass their relevant typecheck, unit, build, and release checks.

## Out Of Scope

- Public launch or removal of the beta-access gate.
- Replacing the replay verifier or introducing a new anti-cheat service.
- Mainland ICP filing; production hosting is outside mainland China.
- Changing a running production environment or pushing commits without explicit approval.
