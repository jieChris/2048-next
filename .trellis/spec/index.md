# 2048-next Trellis Specs

This repository owns the 2048 game frontend experience. It must not become a backend or persistence owner.

Read these specs before changing API, account, leaderboard, replay, ranked session, or deployment behavior:

- `frontend-api-boundary.md` - frontend responsibilities and API access rules.
- `cross-repo-architecture.md` - required boundaries between `2048-next`, `2048-game-api`, and `2048-ranked`.
- `smoke-testing.md` - deterministic Playwright smoke-test setup, synchronization, and assertion rules.
- `visual-validation.md` - committed visual baselines, critical viewport coverage, and AI maintenance rules.
