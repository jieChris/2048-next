# Execution Notes

- Persist one-time achievement unlocks returned by login across the beta-login redirect.
- Install the existing global achievement toast on direct pages and show login unlocks immediately on account login pages.
- Render `beta_pioneer` with the standard “成就达成 / Achievement Unlocked” heading.

## Validation

- OpenAPI generated types are current
- Login storage/toast Smoke: 3 tests passed
- `npm run verify:release` (41 critical Smoke tests passed)
- `npm run verify:release-ready`
- `git diff --check`

## Route Deviation

- `.trellis/scripts/get_context.py` and `.trellis/spec/guides/index.md` are absent in this repository. Used the repository's existing `.trellis/spec/index.md`, frontend API boundary, cross-repo architecture, and smoke-testing contract directly.
