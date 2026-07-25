import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), "..");
const TERMINAL_3X3_REPLAY =
  "REPLAY_v1RPL_B64_UlBMMTMACQARAhMEFQYXCIMBFmJvYXJkXzN4M19wb3cyX25vX3VuZG+DAgRwb3cyhP9abz8=";

function fail(message) {
  throw new Error(`[verify:backend-ready] ${message}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

export function normalizeBackendReadyBase(value, kind) {
  let url;
  try {
    url = new URL(String(value || "").trim());
  } catch {
    fail(`${kind} must be an absolute URL`);
  }
  assert(url.protocol === "http:" || url.protocol === "https:", `${kind} must use HTTP(S)`);
  assert(!url.username && !url.password, `${kind} must not include credentials`);
  assert(!url.search && !url.hash, `${kind} must not include a query or fragment`);
  const pathname = url.pathname.replace(/\/+$/u, "") || "/";
  if (kind === "api-base") assert(pathname === "/api", "api-base path must be exactly /api");
  if (kind === "web-base") assert(pathname === "/", "web-base must point to the site root");
  url.pathname = pathname;
  return url.href.replace(/\/$/u, "");
}

export function parseBackendReadyArgs(argv) {
  const values = {};
  for (const arg of argv) {
    const match = /^--([a-z-]+)=(.+)$/u.exec(arg);
    if (!match) fail(`invalid argument: ${arg}`);
    const [, key, value] = match;
    if (!["api-base", "web-base", "expect-api-env", "expect-api-version"].includes(key)) {
      fail(`unknown argument: --${key}`);
    }
    values[key] = value;
  }
  assert(values["api-base"], "--api-base is required");
  assert(values["web-base"], "--web-base is required");
  return {
    apiBase: normalizeBackendReadyBase(values["api-base"], "api-base"),
    webBase: normalizeBackendReadyBase(values["web-base"], "web-base"),
    expectedApiEnv: String(values["expect-api-env"] || "").trim(),
    expectedApiVersion: String(values["expect-api-version"] || "").trim(),
  };
}

export function assertIsolatedHealth(health, expected = {}) {
  assert(health && health.success === true, "API health did not report success");
  assert(health.service === "2048-game-data-api", "unexpected API service identity");
  assert(health.database === "ok", "API database health is not ok");
  assert(typeof health.env === "string" && health.env.trim(), "API environment is missing");
  assert(typeof health.version === "string" && health.version.trim(), "API version is missing");
  assert(!/(?:^|[-_])(prod|production|live)(?:$|[-_])/iu.test(health.env), "refusing to create a test account in a production environment");
  if (expected.env) assert(health.env === expected.env, `API environment mismatch: ${health.env}`);
  if (expected.version) assert(health.version === expected.version, `API version mismatch: ${health.version}`);
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    redirect: "manual",
    signal: AbortSignal.timeout(10000),
  });
  assert(response.status < 300 || response.status >= 400, `redirect refused: ${url}`);
  return response;
}

async function jsonRequest(url, options = {}) {
  const response = await request(url, options);
  const body = await response.json().catch(() => fail(`invalid JSON response: ${url}`));
  return { response, body };
}

async function postJson(url, body, token) {
  return jsonRequest(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

function expectStatus(result, status, label) {
  assert(result.response.status === status, `${label} returned ${result.response.status}, expected ${status}`);
  return result.body;
}

async function verifyMobileBuildBase() {
  const manifestPath = path.join(projectRoot, "dist-app", "mobile-build-flags.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8").catch(() => fail("run npm run build:app before this verifier")));
  assert(manifest.schema === 2, "mobile build-flags schema mismatch");
  assert(manifest.mode === "production", "dist-app is not a production-mode build");
  assert(manifest.apiBase === "https://2048next.cn/api", "release API base is not frozen to https://2048next.cn/api");
  assert(manifest.allowApiBaseOverride === false, "release build permits API base override");
  assert(manifest.allowDebugLoopbackHttp === false, "release build permits loopback HTTP");
}

async function verifyOpenApi(webBase) {
  const local = await readFile(path.join(projectRoot, "openapi", "2048next.v1.yaml"), "utf8");
  const response = await request(`${webBase}/openapi/2048next.v1.yaml`);
  assert(response.status === 200, `OpenAPI returned ${response.status}`);
  const remote = await response.text();
  assert(remote === local, "served OpenAPI contract does not match the source-controlled contract");
  const version = /^\s{2}version:\s*([^\s]+)\s*$/mu.exec(remote)?.[1];
  assert(version, "OpenAPI info.version is missing");
  return version;
}

async function verifyPublicPages(webBase) {
  const pages = [
    ["privacy.html", ["data-policy-kind=\"privacy\"", "data-policy-version"]],
    ["terms.html", ["data-policy-kind=\"terms\"", "data-policy-version"]],
    ["account-deletion.html", ["data-deletion-form", "72 小时"]],
  ];
  for (const [page, markers] of pages) {
    const response = await request(`${webBase}/${page}`);
    assert(response.status === 200, `${page} returned ${response.status}`);
    const text = await response.text();
    for (const marker of markers) assert(text.includes(marker), `${page} is missing ${marker}`);
  }
}

async function verifyCors(apiBase) {
  for (const origin of ["https://localhost", "http://localhost"]) {
    const response = await request(`${apiBase}/replay/version`, { headers: { origin } });
    assert(response.status === 200, `CORS GET failed for ${origin}`);
    assert(response.headers.get("access-control-allow-origin") === origin, `CORS GET did not echo ${origin}`);
    const preflight = await request(`${apiBase}/replay/version`, {
      method: "OPTIONS",
      headers: { origin, "access-control-request-method": "GET" },
    });
    assert(preflight.status === 204, `CORS preflight failed for ${origin}`);
    assert(preflight.headers.get("access-control-allow-origin") === origin, `CORS preflight did not echo ${origin}`);
  }
  const unknown = await request(`${apiBase}/replay/version`, {
    headers: { origin: "https://unknown.invalid" },
  });
  assert(!unknown.headers.has("access-control-allow-origin"), "CORS accepted an unknown origin");
}

async function runAccountFlow(apiBase) {
  const suffix = `${Date.now().toString(36)}${randomUUID().slice(0, 6)}`.toLowerCase();
  const email = `backend-ready-${suffix}@example.test`;
  const password = `BackendReady!${suffix}A9`;
  const nickname = `BReady${suffix.slice(-4)}`;
  let token = "";
  let deletionRequested = false;
  try {
    const started = expectStatus(
      await postJson(`${apiBase}/register/start`, { email, password, nickname }),
      200,
      "register/start",
    );
    assert(/^\d{6}$/u.test(String(started.devCode || "")), "isolated registration did not return devCode");

    const registered = expectStatus(
      await postJson(`${apiBase}/register/verify`, { email, code: started.devCode }),
      200,
      "register/verify",
    );
    token = String(registered.token || "");
    assert(token, "registration did not return a token");

    const refreshed = expectStatus(
      await postJson(`${apiBase}/auth/refresh`, { token }),
      200,
      "auth/refresh",
    );
    const refreshedToken = String(refreshed.token || "");
    assert(refreshedToken, "refresh did not return a token");

    const clientRecordId = `backend-ready-${suffix}`;
    const recordPayload = {
      mode_key: "board_3x3_pow2_no_undo",
      client_record_id: clientRecordId,
      end_reason: "game_over",
      ended_at: new Date().toISOString(),
      replay_string: TERMINAL_3X3_REPLAY,
    };
    const firstRecord = expectStatus(
      await postJson(`${apiBase}/records`, recordPayload, refreshedToken),
      200,
      "records first submit",
    );
    assert(firstRecord.success === true && typeof firstRecord.id === "string", "first record submit failed");
    const duplicateRecord = expectStatus(
      await postJson(`${apiBase}/records`, recordPayload, refreshedToken),
      200,
      "records duplicate submit",
    );
    assert(duplicateRecord.id === firstRecord.id, "record retry returned a different record id");
    assert(duplicateRecord.duplicate === true, "record retry was not identified as duplicate");

    const leaderboard = expectStatus(
      await jsonRequest(`${apiBase}/leaderboard?period=all&limit=1&page=1`),
      200,
      "leaderboard",
    );
    const rank = Number(leaderboard.data?.[0]?.rank);
    assert(Number.isInteger(rank) && rank > 0, "leaderboard did not return a positive absolute rank");

    const deletion = expectStatus(
      await postJson(`${apiBase}/account/deletion/request`, { email, password }),
      200,
      "account deletion request",
    );
    deletionRequested = true;
    const requestedAt = Date.parse(deletion.data?.requestedAt);
    const dueAt = Date.parse(deletion.data?.dueAt);
    assert(Number.isFinite(requestedAt) && Number.isFinite(dueAt), "account deletion receipt timestamps are invalid");
    assert(dueAt - requestedAt === 72 * 60 * 60 * 1000, "account deletion cooling period is not exactly 72 hours");

    const rejectedMe = await jsonRequest(`${apiBase}/me`, {
      headers: { authorization: `Bearer ${refreshedToken}` },
    });
    assert(rejectedMe.response.status === 401, `pending-deletion token /me returned ${rejectedMe.response.status}`);
    assert(rejectedMe.body.code === "ACCOUNT_PENDING_DELETION", "pending-deletion token returned the wrong /me error");
    const rejectedRefresh = await postJson(`${apiBase}/auth/refresh`, { token: refreshedToken });
    assert(rejectedRefresh.response.status === 401, `pending-deletion refresh returned ${rejectedRefresh.response.status}`);
    assert(rejectedRefresh.body.code === "ACCOUNT_PENDING_DELETION", "pending-deletion refresh returned the wrong error");

    return { userId: Number(registered.userId), recordId: firstRecord.id };
  } finally {
    if (token && !deletionRequested) {
      await postJson(`${apiBase}/account/deletion/request`, { email, password }).catch(() => undefined);
    }
  }
}

export async function runBackendReadyVerification(argv = process.argv.slice(2)) {
  const options = parseBackendReadyArgs(argv);
  await verifyMobileBuildBase();
  const health = expectStatus(await jsonRequest(`${options.apiBase}/health`), 200, "API health");
  assertIsolatedHealth(health, { env: options.expectedApiEnv, version: options.expectedApiVersion });
  const openApiVersion = await verifyOpenApi(options.webBase);
  await verifyPublicPages(options.webBase);
  await verifyCors(options.apiBase);
  const account = await runAccountFlow(options.apiBase);
  console.log(
    `[verify:backend-ready] PASS env=${health.env} api=${health.version} openapi=${openApiVersion} testUser=${account.userId} record=${account.recordId}`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runBackendReadyVerification().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : error);
    process.exitCode = 1;
  });
}
