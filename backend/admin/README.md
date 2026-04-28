# Admin API for Cloudflare Worker / D1

This repository does not contain the production Cloudflare Worker source. The admin page calls the following API contract under `/api`:

- `GET /admin/me`
- `GET /admin/tables`
- `GET /admin/table/:name?limit=50&page=1`
- `POST /admin/query` with `{ "sql": "SELECT ..." }`
- `GET /admin/rescue-offers?user_id=<user_id>`
- `POST /admin/rescue-offers`

Security requirements:

1. Authenticate with the same `Authorization: Bearer <token>` account token used by the site.
2. Authorize only explicit admins. Do not rely on the admin page being hidden.
3. Keep `/admin/query` read-only. Accept only a single `SELECT`, `WITH`, or `PRAGMA table_info(...)` statement.
4. Use allow-listed table names for table browsing.
5. Route writes through typed endpoints such as `/admin/rescue-offers`.
6. Log admin actions in Worker logs or a dedicated audit table before production use.

Apply the D1 migration first:

```bash
npx wrangler d1 execute 2048_scores --remote --file backend/migrations/0001_admin_rescue_offers.sql
```

Then adapt `backend/admin/worker-admin-routes.example.ts` into the production Worker.
