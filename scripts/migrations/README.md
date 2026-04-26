# Migration Scripts

This directory is for lightweight, credential-free helpers and templates used by the Cloudflare D1 / COS to Postgres / local replay migration.

Current files:

- `migration-manifest.example.json`: example manifest shape for export, replay download, import, and verification batches.
- `verify-migration-manifest.mjs`: local validator for migration manifests. It checks required fields, duplicate replay hashes, missing files, file size, and sha256 where files are available locally.

The scripts do not call production Cloudflare, COS, or Postgres services. Real export, download, and import commands should be run from a controlled migration host with production credentials provided outside the repository.

Recommended migration artifacts:

- `d1-export.sql` or table-level `*.jsonl`
- `d1-export.schema.sql`
- `d1-schema-inventory.json`
- `d1-export.manifest.json`
- `cos-replays.manifest.json`
- `cos-replays.errors.jsonl`
- `data-cleanup-report.json`
- `postgres-import-report.json`
- `leaderboard-rebuild-report.json`

Current source API repo inventory:

- API repo: `G:\2048\2048undo\2048-game-api\2048-game-api`
- Worker name: `2048-game-api`
- Wrangler config: `wrangler.jsonc`
- D1 binding: `_2048_scores`
- D1 database: `2048_scores`
- COS replay key pattern: `replays/v1/<mode_bucket>/<yyyy>/<mm>/<dd>/<record_id>.json`
- Frontend local runner: `scripts/dev-local.mjs` starts that repo through `wrangler dev` on port `8787`.
