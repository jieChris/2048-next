# Execution Notes

## Decisions

- Expiry is a limit on starting/checkpointing a session, not on finalizing a game that already started. The final `/api/records` path intentionally parses and resolves the signed session with `allowExpired: true`.
- Unranked normal submissions are retained as user history instead of rejected. They are excluded only from competitive leaderboard derivation; backend-authorized admin/migration imports remain eligible.
- The active ranked session remains authoritative on reload even after expiration; a separately prefetched session is not promoted until explicit restart or terminal completion.
- Nested local CSS imports stay free of query-string cache keys so Vite resolves them into the hashed production bundle.
- A record-triggered achievement unlock must be caused by the submitted ranked record itself. Historical achievement grants remain an explicit backfill operation.
- The user-profile "all modes" summary breaks equal-play-count ties with the existing `parseDateTs` helper so summary rendering cannot abort the parallel record request and leave the list loading indefinitely.

## Completed Checks

- `2048-game-api`: typecheck, 137 Node tests, and production dependency audit passed.
- `2048-next`: full release gate passed, including 290 unit files / 1790 tests, 41 critical browser smoke tests, audits, and build; production dependency audit passed.
- `2048-ranked`: typecheck, 136 unit tests, lint, build, production dependency audit, and 6 live read-only Playwright tests passed.
- Achievement follow-up: API typecheck, 138 Node tests, and production dependency audit passed; main release gate, production build, dependency audit, and 4 built-preview achievement-toast browser checks passed.
- User-profile all-modes follow-up: the equal-play-count regression smoke test and production build passed.

## Environment Follow-Up

- Push these changes before enabling required-check branch protection; the API CI workflow and updated deploy workflows do not exist remotely yet.
- Restrict origin ingress to Cloudflare/trusted reverse proxies so `CF-Connecting-IP` cannot be forged by direct-to-origin traffic.
- Choose one Cloudflare crawler policy and disable the conflicting managed `robots.txt`/AI crawler rule.
- Disable Cloudflare Web Analytics injection or add its beacon origins to every effective CSP; the current injection is intentionally not allowlisted here.
- Confirm the production backup timer is enabled, the latest offsite dump exists, and a restore drill succeeds.

## Route Deviation

- The frontend release switch could not use `systemctl reload nginx` because production serves this site from the `site-2048-next` Docker container. The container's bind mount had resolved the previous `current` symlink target at creation time, so the conservative fallback was to validate the new release in a temporary container and then recreate only `site-2048-next`, with the prior release retained for rollback.
