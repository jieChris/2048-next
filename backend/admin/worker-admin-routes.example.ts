type D1DatabaseLike = {
  prepare(sql: string): {
    bind(...values: unknown[]): D1PreparedStatementLike;
    all<T = unknown>(): Promise<{ results?: T[] }>;
    first<T = unknown>(): Promise<T | null>;
    run(): Promise<unknown>;
  };
};

type D1PreparedStatementLike = {
  all<T = unknown>(): Promise<{ results?: T[] }>;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<unknown>;
};

type AdminEnv = {
  DB: D1DatabaseLike;
  ADMIN_USER_IDS?: string;
  RESCUE_SIGNING_SECRET?: string;
};

type AuthUser = {
  id: number;
  email?: string;
  nickname?: string;
};

const ADMIN_TABLE_ALLOWLIST = [
  "_cf_KV",
  "image_captchas",
  "login_attempt_counters",
  "mode_scores",
  "password_reset_verifications",
  "ranked_checkpoints",
  "registration_captchas",
  "registration_rate_limits",
  "registration_verifications",
  "relay_cases",
  "scores",
  "sqlite_sequence",
  "user_records",
  "users",
  "admin_rescue_offers"
];

function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      ...(init.headers || {})
    }
  });
}

function parseAdminIds(value: string | undefined): Set<number> {
  return new Set(
    String(value || "")
      .split(",")
      .map((part) => Math.floor(Number(part.trim())))
      .filter((value) => Number.isInteger(value) && value > 0)
  );
}

function isSafeReadOnlySql(sql: string): boolean {
  const normalized = sql.trim().replace(/;\s*$/, "");
  if (!normalized || normalized.includes(";")) return false;
  if (/^select\b/i.test(normalized)) return true;
  if (/^with\b/i.test(normalized)) return true;
  if (/^pragma\s+table_info\s*\(\s*[A-Za-z_][A-Za-z0-9_]*\s*\)\s*$/i.test(normalized)) return true;
  return false;
}

function assertAllowedTable(tableName: string): string {
  const normalized = String(tableName || "").trim();
  if (!ADMIN_TABLE_ALLOWLIST.includes(normalized)) {
    throw new Error("table_not_allowed");
  }
  return normalized;
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeBoard(value: unknown): number[][] | null {
  if (!Array.isArray(value) || value.length !== 4) return null;
  const board = value.map((row) => Array.isArray(row) ? row.map((cell) => Math.floor(Number(cell) || 0)) : []);
  if (board.some((row) => row.length !== 4 || row.some((cell) => cell < 0))) return null;
  return board;
}

async function createRescueSignature(env: AdminEnv, payload: Record<string, unknown>): Promise<string> {
  const secret = env.RESCUE_SIGNING_SECRET || "replace-me";
  return sha256Hex(`${secret}:${JSON.stringify(payload)}`);
}

// Replace this function with the production JWT/session verifier already used by your Worker.
async function authenticateUser(request: Request, env: AdminEnv): Promise<AuthUser | null> {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  // Example fallback for local testing only: Authorization: Bearer admin-user-488
  const match = token.match(/^admin-user-(\d+)$/);
  if (match) return { id: Number(match[1]) };

  // Production should verify the real token and return the user id.
  void env;
  return null;
}

async function requireAdmin(request: Request, env: AdminEnv): Promise<AuthUser | Response> {
  const user = await authenticateUser(request, env);
  if (!user) return json({ success: false, error: "unauthorized" }, { status: 401 });
  if (!parseAdminIds(env.ADMIN_USER_IDS).has(user.id)) {
    return json({ success: false, error: "forbidden" }, { status: 403 });
  }
  return user;
}

async function listTables(env: AdminEnv): Promise<Response> {
  const result = await env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
  ).all<{ name: string }>();
  const rows = (result.results || []).filter((row) => ADMIN_TABLE_ALLOWLIST.includes(row.name));
  return json({ success: true, rows });
}

async function readTable(url: URL, env: AdminEnv, tableName: string): Promise<Response> {
  const table = assertAllowedTable(tableName);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 50, 1), 200);
  const page = Math.max(Number(url.searchParams.get("page")) || 1, 1);
  const offset = (page - 1) * limit;
  const result = await env.DB.prepare(`SELECT * FROM ${table} LIMIT ? OFFSET ?`).bind(limit, offset).all();
  return json({ success: true, table, limit, page, rows: result.results || [] });
}

async function runReadOnlyQuery(request: Request, env: AdminEnv): Promise<Response> {
  const body = await request.json().catch(() => null) as { sql?: string } | null;
  const sql = String(body?.sql || "").trim();
  if (!isSafeReadOnlySql(sql)) return json({ success: false, error: "readonly_sql_only" }, { status: 400 });
  const result = await env.DB.prepare(sql.replace(/;\s*$/, "")).all();
  return json({ success: true, rows: result.results || [] });
}

async function listRescueOffers(url: URL, env: AdminEnv): Promise<Response> {
  const userId = Math.floor(Number(url.searchParams.get("user_id")) || 0);
  const statement = userId > 0
    ? env.DB.prepare("SELECT * FROM admin_rescue_offers WHERE user_id = ? ORDER BY created_at DESC LIMIT 100").bind(userId)
    : env.DB.prepare("SELECT * FROM admin_rescue_offers ORDER BY created_at DESC LIMIT 100");
  const result = await statement.all();
  return json({ success: true, rows: result.results || [] });
}

async function createRescueOffer(request: Request, env: AdminEnv, admin: AuthUser): Promise<Response> {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return json({ success: false, error: "invalid_json" }, { status: 400 });
  const userId = Math.floor(Number(body.user_id) || 0);
  const modeKey = String(body.mode_key || "").trim();
  const modeBucket = String(body.mode_bucket || "").trim();
  const board = normalizeBoard(body.board);
  const score = Math.max(0, Math.floor(Number(body.score) || 0));
  const durationMs = Math.max(0, Math.floor(Number(body.duration_ms) || 0));
  const reason = String(body.reason || "").trim();
  const expiresInHours = Math.min(Math.max(Math.floor(Number(body.expires_in_hours) || 168), 1), 720);
  if (!userId || !modeKey || !modeBucket || !board) {
    return json({ success: false, error: "invalid_rescue_payload" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInHours * 3600 * 1000).toISOString();
  const boardJson = JSON.stringify(board);
  const signaturePayload = { id, user_id: userId, mode_key: modeKey, mode_bucket: modeBucket, board, score, duration_ms: durationMs, expires_at: expiresAt };
  const signature = await createRescueSignature(env, signaturePayload);

  await env.DB.prepare(
    `INSERT INTO admin_rescue_offers
      (id, user_id, mode_bucket, mode_key, board_json, score, duration_ms, reason, status, created_by, expires_at, signature, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`
  ).bind(id, userId, modeBucket, modeKey, boardJson, score, durationMs, reason, admin.id, expiresAt, signature, now.toISOString()).run();

  return json({ success: true, data: { ...signaturePayload, reason, status: "pending", signature } });
}

export async function handleAdminApi(request: Request, env: AdminEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/admin/")) return null;
  if (request.method === "OPTIONS") return json({ success: true });

  const adminOrResponse = await requireAdmin(request, env);
  if (adminOrResponse instanceof Response) return adminOrResponse;

  try {
    if (request.method === "GET" && url.pathname === "/api/admin/me") {
      return json({ success: true, is_admin: true, user: adminOrResponse });
    }
    if (request.method === "GET" && url.pathname === "/api/admin/tables") return listTables(env);
    if (request.method === "GET" && url.pathname.startsWith("/api/admin/table/")) {
      return readTable(url, env, decodeURIComponent(url.pathname.slice("/api/admin/table/".length)));
    }
    if (request.method === "POST" && url.pathname === "/api/admin/query") return runReadOnlyQuery(request, env);
    if (request.method === "GET" && url.pathname === "/api/admin/rescue-offers") return listRescueOffers(url, env);
    if (request.method === "POST" && url.pathname === "/api/admin/rescue-offers") {
      return createRescueOffer(request, env, adminOrResponse);
    }
    return json({ success: false, error: "admin_route_not_found" }, { status: 404 });
  } catch (error) {
    return json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
