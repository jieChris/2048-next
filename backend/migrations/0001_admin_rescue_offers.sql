-- Admin rescue offers for user-confirmed compensation restores.
-- Apply to Cloudflare D1 with:
-- npx wrangler d1 execute <db-name> --remote --file backend/migrations/0001_admin_rescue_offers.sql

CREATE TABLE IF NOT EXISTS admin_rescue_offers (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  mode_bucket TEXT NOT NULL,
  mode_key TEXT NOT NULL,
  board_json TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_by INTEGER,
  accepted_at TEXT,
  rejected_at TEXT,
  consumed_at TEXT,
  expires_at TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  signature TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_admin_rescue_offers_user_status
  ON admin_rescue_offers(user_id, status, expires_at);

CREATE INDEX IF NOT EXISTS idx_admin_rescue_offers_created_at
  ON admin_rescue_offers(created_at);
