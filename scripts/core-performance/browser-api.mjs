const MODE_KEY = "standard_4x4_pow2_no_undo";
const AUTH_TOKEN = "core-performance-auth-token";
const LEGACY_AUTH_TOKEN = "core-performance-legacy-token";

const ACTIVE_RANKED_SESSION_FIXTURE = Object.freeze({
  mode_key: MODE_KEY,
  mode_bucket: "standard-4x4-no-undo",
  challenge_id: "core-performance-active-v2",
  seed: 101,
  ranked_session_token: "core-performance-active-token-v2",
  issued_at: 1_700_000_000,
  exp: 4_102_444_800,
  spawn_sequence_version: 2,
  status: "started",
  record_era: "official_v1",
  owner_user_id: "42",
  client_received_at_ms: 1_700_000_000_000,
});

const PREFETCH_RANKED_SESSION_FIXTURE = Object.freeze({
  mode_key: MODE_KEY,
  mode_bucket: "standard-4x4-no-undo",
  challenge_id: "core-performance-prefetch-v2",
  seed: 202,
  ranked_session_token: "core-performance-prefetch-token-v2",
  issued_at: 1_700_000_100,
  exp: 4_102_444_800,
  spawn_sequence_version: 2,
  status: "created",
  record_era: "official_v1",
  owner_user_id: "42",
});

function acceptedAccessPayload() {
  return {
    success: true,
    data: {
      authenticated: true,
      userId: 42,
      public_profile_id: "performance-user",
      email: "performance@example.invalid",
      role: "player",
      superAdmin: false,
      allowlisted: true,
      noticeAccepted: true,
      noticeVersion: "beta_notice_2026_06_26_v1",
      canAccessProduct: true,
    },
  };
}

function normalizeHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers || {}).map(([key, value]) => [
      key.toLowerCase(),
      String(value),
    ]),
  );
}

function parseJsonBody(postData, routeId) {
  if (typeof postData !== "string" || postData.trim() === "") {
    throw new Error(`${routeId} request body is required`);
  }
  try {
    const parsed = JSON.parse(postData);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("not an object");
    }
    return parsed;
  } catch (error) {
    throw new Error(`${routeId} request body must be valid JSON`, {
      cause: error,
    });
  }
}

function requireMethod(actual, expected, routeId) {
  if (actual !== expected) {
    throw new Error(`${routeId} method must be ${expected}, got ${actual}`);
  }
}

function requireAuthorization(headers, token, routeId) {
  if (normalizeHeaders(headers).authorization !== `Bearer ${token}`) {
    throw new Error(`${routeId} Authorization must use the fixture token`);
  }
}

function requireNoAuthorization(headers, routeId) {
  if (normalizeHeaders(headers).authorization) {
    throw new Error(`${routeId} must not send Authorization`);
  }
}

function requireJsonContentType(headers, routeId) {
  if (
    !normalizeHeaders(headers)["content-type"]?.startsWith("application/json")
  ) {
    throw new Error(`${routeId} Content-Type must be application/json`);
  }
}

function requireNoBody(postData, routeId) {
  if (postData !== null && postData !== undefined && postData !== "") {
    throw new Error(`${routeId} request body must be empty`);
  }
}

function requireNoQuery(parsedUrl, routeId) {
  if (parsedUrl.search !== "") {
    throw new Error(`${routeId} request URL must not contain a query`);
  }
}

function requireExactQuery(parsedUrl, expected, routeId) {
  const actualEntries = [...parsedUrl.searchParams.entries()].sort();
  const expectedEntries = Object.entries(expected)
    .map(([key, value]) => [key, String(value)])
    .sort();
  if (JSON.stringify(actualEntries) !== JSON.stringify(expectedEntries)) {
    throw new Error(`${routeId} query does not match the contract`);
  }
}

function requireLeaderboardQuery(parsedUrl) {
  const limit = parsedUrl.searchParams.get("limit");
  if (limit !== "10" && limit !== "500") {
    throw new Error("leaderboard limit must be 10 or 500");
  }
  requireExactQuery(
    parsedUrl,
    {
      limit,
      period: "all",
      mode_key: MODE_KEY,
      mode: "standard_no_undo",
    },
    "leaderboard",
  );
}

function requireExactBody(actual, expected, routeId) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${routeId} request body does not match the contract`);
  }
}

function validateRankedAttemptBody(body) {
  if (
    (body.event !== "begin" && body.event !== "abandon") ||
    body.mode_key !== MODE_KEY ||
    body.ranked_session_token !==
      ACTIVE_RANKED_SESSION_FIXTURE.ranked_session_token ||
    body.attempt_schema_version !== 1 ||
    typeof body.replay_string !== "string" ||
    body.replay_string.trim() === ""
  ) {
    throw new Error("ranked-session-attempt request body is invalid");
  }
  if (body.event === "begin" && body.reason !== undefined) {
    throw new Error("ranked-session-attempt begin body must not have reason");
  }
  if (
    body.event === "abandon" &&
    body.reason !== "restart" &&
    body.reason !== "navigation"
  ) {
    throw new Error("ranked-session-attempt abandon reason is invalid");
  }
}

function requireExpectedOrigin(parsedUrl, expectedOrigin) {
  let parsedExpected;
  try {
    parsedExpected = new URL(expectedOrigin);
  } catch (error) {
    throw new Error("deterministic API fixture requires an expected origin", {
      cause: error,
    });
  }
  if (
    (parsedExpected.protocol !== "http:" &&
      parsedExpected.protocol !== "https:") ||
    parsedUrl.origin !== parsedExpected.origin
  ) {
    throw new Error(
      `deterministic API origin mismatch: expected ${parsedExpected.origin}, received ${parsedUrl.origin}`,
    );
  }
}

function resolveDeterministicApiRequest({
  url,
  method,
  headers,
  postData,
  expectedOrigin,
}) {
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch (error) {
    throw new Error(`invalid deterministic API URL: ${String(url)}`, {
      cause: error,
    });
  }
  requireExpectedOrigin(parsedUrl, expectedOrigin);
  const pathname = parsedUrl.pathname;
  const routeId = pathname.replace(/^\/api\//u, "");
  const knownPaths = new Set([
    // Every page restores the deterministic local auth session.
    "/api/auth/refresh",
    // The forced local beta gate proves the authenticated access contract.
    "/api/access/me",
    // Direct-page bootstrap performs this harmless selection-only GET.
    "/api/me/palette-sync/bootstrap",
    // Home/play sync the authenticated user's best score and leaderboard.
    "/api/user/42/records",
    "/api/leaderboard",
    // Play checks once for an authenticated pending rescue after bootstrap.
    "/api/rescue-offers/active",
    // Ranked play warms one V2 prefetched session per isolated context.
    "/api/ranked-session/start",
    // The move/restore scenarios can flush their ranked begin attempt.
    "/api/ranked-session/attempt",
  ]);
  if (!knownPaths.has(pathname)) {
    throw new Error(
      `unknown deterministic API route: ${method} ${parsedUrl.pathname}${parsedUrl.search}`,
    );
  }

  if (pathname === "/api/auth/refresh") {
    requireNoQuery(parsedUrl, "auth-refresh");
    requireMethod(method, "POST", "auth-refresh");
    requireAuthorization(headers, LEGACY_AUTH_TOKEN, "auth-refresh");
    requireJsonContentType(headers, "auth-refresh");
    requireExactBody(
      parseJsonBody(postData, "auth-refresh"),
      { token: LEGACY_AUTH_TOKEN },
      "auth-refresh",
    );
    return {
      routeId: "auth-refresh",
      status: 200,
      payload: {
        success: true,
        token: AUTH_TOKEN,
        expires_at: 4_102_444_800,
        user: {
          id: 42,
          public_profile_id: "performance-user",
          nickname: "Performance",
        },
      },
    };
  }

  if (pathname !== "/api/leaderboard") {
    requireAuthorization(headers, AUTH_TOKEN, routeId);
  }
  if (pathname === "/api/access/me") {
    requireNoQuery(parsedUrl, "access-me");
    requireMethod(method, "GET", "access-me");
    requireNoBody(postData, "access-me");
    return {
      routeId: "access-me",
      status: 200,
      payload: acceptedAccessPayload(),
    };
  }
  if (pathname === "/api/me/palette-sync/bootstrap") {
    requireNoQuery(parsedUrl, "palette-bootstrap");
    requireMethod(method, "GET", "palette-bootstrap");
    requireNoBody(postData, "palette-bootstrap");
    return {
      routeId: "palette-bootstrap",
      status: 200,
      payload: {
        success: true,
        data: {
          selection: {
            selection: { kind: "follow_theme", paletteId: null },
            revision: 1,
            updatedAt: "2026-09-04T00:00:00.000Z",
          },
          selectedPalette: null,
        },
      },
    };
  }
  if (pathname === "/api/user/42/records") {
    requireMethod(method, "GET", "user-records");
    requireNoBody(postData, "user-records");
    requireExactQuery(
      parsedUrl,
      {
        page_size: 500,
        limit: 500,
        page: 1,
        sort_by: "score",
        order: "desc",
        status: "active",
        mode: "standard_no_undo",
        mode_key: MODE_KEY,
      },
      "user-records",
    );
    return {
      routeId: "user-records",
      status: 200,
      payload: { success: true, data: [] },
    };
  }
  if (pathname === "/api/leaderboard") {
    requireNoAuthorization(headers, "leaderboard");
    requireMethod(method, "GET", "leaderboard");
    requireNoBody(postData, "leaderboard");
    requireLeaderboardQuery(parsedUrl);
    return {
      routeId: "leaderboard",
      status: 200,
      payload: { success: true, data: [] },
    };
  }
  if (pathname === "/api/rescue-offers/active") {
    requireMethod(method, "GET", "active-rescue-offer");
    requireNoBody(postData, "active-rescue-offer");
    requireExactQuery(parsedUrl, { mode_key: MODE_KEY }, "active-rescue-offer");
    return {
      routeId: "active-rescue-offer",
      status: 200,
      payload: { success: true, data: [] },
    };
  }
  if (pathname === "/api/ranked-session/start") {
    requireNoQuery(parsedUrl, "ranked-session-start");
    requireMethod(method, "POST", "ranked-session-start");
    requireJsonContentType(headers, "ranked-session-start");
    requireExactBody(
      parseJsonBody(postData, "ranked-session-start"),
      {
        mode_key: MODE_KEY,
        attempt_schema_version: 1,
        spawn_sequence_version: 2,
      },
      "ranked-session-start",
    );
    return {
      routeId: "ranked-session-start",
      status: 200,
      payload: { success: true, data: PREFETCH_RANKED_SESSION_FIXTURE },
    };
  }
  if (pathname === "/api/ranked-session/attempt") {
    requireNoQuery(parsedUrl, "ranked-session-attempt");
    requireMethod(method, "POST", "ranked-session-attempt");
    requireJsonContentType(headers, "ranked-session-attempt");
    validateRankedAttemptBody(
      parseJsonBody(postData, "ranked-session-attempt"),
    );
    return {
      routeId: "ranked-session-attempt",
      status: 200,
      payload: { success: true, accepted: true },
    };
  }
  throw new Error(
    `unsupported deterministic API contract: ${method} ${parsedUrl.pathname}${parsedUrl.search}`,
  );
}

function createDeterministicApiAudit() {
  return { requests: [], errors: [] };
}

/**
 * @param {any} context
 * @param {{ audit?: { requests: Array<any>, errors: Array<string> }, baseUrl: string }} options
 */
async function installDeterministicContext(
  context,
  { audit = createDeterministicApiAudit(), baseUrl },
) {
  let expectedOrigin;
  try {
    expectedOrigin = new URL(baseUrl).origin;
  } catch (error) {
    throw new Error("deterministic API context requires baseUrl", {
      cause: error,
    });
  }
  await context.route("**/api/**", async (route) => {
    const request = route.request();
    try {
      const resolution = resolveDeterministicApiRequest({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        postData: request.postData(),
        expectedOrigin,
      });
      audit.requests.push({
        routeId: resolution.routeId,
        method: request.method(),
        origin: new URL(request.url()).origin,
        pathname: new URL(request.url()).pathname,
      });
      await route.fulfill({
        status: resolution.status,
        contentType: "application/json",
        body: JSON.stringify(resolution.payload),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      audit.errors.push(message);
      await route.fulfill({
        status: 599,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          code: "CORE_PERFORMANCE_API_CONTRACT_REJECTED",
          error: message,
        }),
      });
    }
  });
  await context.addInitScript(
    ({ modeKey, legacyToken, activeSession }) => {
      const localState = {
        "2048_beta_access_force_gate_local_v1": "1",
        "2048_auth_token_v1": legacyToken,
        "2048_auth_userId_v1": "42",
        "2048_public_profile_id_v1": "performance-user",
        "2048_auth_nickname_v1": "Performance",
        replay_guide_shown_v1: "true",
        "guide_seen_v1:replay-controls-v1": "1",
        "guide_seen_v1:practice-board-v1": "1",
        "guide_seen_v1:diagonal-moves-v1": "1",
        [`ranked_session_active:v1:${modeKey}`]: JSON.stringify(activeSession),
      };
      for (const [key, value] of Object.entries(localState)) {
        window.localStorage.setItem(key, value);
      }
      window.confirm = () => true;
      window.alert = () => {};
    },
    {
      modeKey: MODE_KEY,
      legacyToken: LEGACY_AUTH_TOKEN,
      activeSession: ACTIVE_RANKED_SESSION_FIXTURE,
    },
  );
  return audit;
}

function deterministicApiPayload(url, method) {
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch (error) {
    throw new Error(`invalid deterministic API URL: ${String(url)}`, {
      cause: error,
    });
  }
  const pathname = parsedUrl.pathname;
  const request = {
    url,
    method,
    expectedOrigin: parsedUrl.origin,
    headers: {
      authorization: `Bearer ${
        pathname === "/api/auth/refresh" ? LEGACY_AUTH_TOKEN : AUTH_TOKEN
      }`,
      "content-type": "application/json",
    },
    postData:
      pathname === "/api/auth/refresh"
        ? JSON.stringify({ token: LEGACY_AUTH_TOKEN })
        : pathname === "/api/ranked-session/start"
          ? JSON.stringify({
              mode_key: MODE_KEY,
              attempt_schema_version: 1,
              spawn_sequence_version: 2,
            })
          : null,
  };
  return resolveDeterministicApiRequest(request).payload;
}

export {
  ACTIVE_RANKED_SESSION_FIXTURE,
  AUTH_TOKEN,
  LEGACY_AUTH_TOKEN,
  MODE_KEY,
  PREFETCH_RANKED_SESSION_FIXTURE,
  acceptedAccessPayload,
  createDeterministicApiAudit,
  deterministicApiPayload,
  installDeterministicContext,
  resolveDeterministicApiRequest,
};
