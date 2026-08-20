import { expect, test } from "@playwright/test";
import { mockAcceptedBetaAccess } from "./support/beta-access";
import { installRankedSessionForMode } from "./support/ranked-session";

test.describe("Legacy Multi-Page Smoke", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await mockAcceptedBetaAccess(page);
  });

  test("ranked record submit after restart preserves the next session for leaderboard upload", async ({ page }) => {
    const modeKey = "standard_4x4_pow2_no_undo";
    const nowSec = Math.floor(Date.now() / 1000);
    const oldSession = {
      mode_key: modeKey,
      challenge_id: "ranked-old",
      seed: 123,
      ranked_session_token: "old-ranked-token",
      issued_at: nowSec - 60,
      exp: nowSec + 3600,
      owner_user_id: "42",
      spawn_sequence_version: 2
    };
    const nextSession = {
      mode_key: modeKey,
      challenge_id: "ranked-next",
      seed: 456,
      ranked_session_token: "next-ranked-token",
      issued_at: nowSec,
      exp: nowSec + 3600,
      owner_user_id: "42",
      spawn_sequence_version: 2
    };
    let prefetchCounter = 0;
    const recordPayloads: Array<Record<string, unknown>> = [];

    await page.route("**/api/records", async (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      recordPayloads.push(body);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { id: `record-${recordPayloads.length}` }
        })
      });
    });
    await page.route("**/api/ranked-checkpoint**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: route.request().method() === "GET" ? null : undefined,
          deleted: route.request().method() === "DELETE" ? true : undefined,
          verified: route.request().method() === "POST" ? true : undefined
        })
      });
    });
    await page.route("**/api/ranked-session/start", async (route) => {
      prefetchCounter += 1;
      const session = prefetchCounter === 1
        ? nextSession
        : {
            mode_key: modeKey,
            challenge_id: `ranked-prefetch-${prefetchCounter}`,
            seed: 700 + prefetchCounter,
            ranked_session_token: `prefetch-ranked-token-${prefetchCounter}`,
            issued_at: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
            spawn_sequence_version: 2
          };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: session
        })
      });
    });
    await page.route("**/api/leaderboard**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] })
      });
    });

    await page.addInitScript(
      ({ modeKey: injectedModeKey, oldSession: injectedOld, nextSession: injectedNext }) => {
        window.localStorage.setItem("2048_auth_token_v1", "smoke_token");
        window.localStorage.setItem("2048_auth_userId_v1", "42");
        window.localStorage.setItem("2048_auth_nickname_v1", "Smoke");
        window.localStorage.removeItem("online_last_record_submit_signature_v1");
        window.localStorage.removeItem("online_pending_record_submit_signature_v1");
        window.localStorage.setItem("settings_restart_prompt_enabled_v1", "0");
        window.localStorage.setItem("ranked_session_active:v1:" + injectedModeKey, JSON.stringify(injectedOld));
        window.localStorage.setItem("ranked_session_prefetch:v1:" + injectedModeKey, JSON.stringify(injectedNext));
        window.confirm = () => true;
      },
      { modeKey, oldSession, nextSession }
    );

    const response = await page.goto("/2048.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Game response should exist").not.toBeNull();
    expect(response?.ok(), "Game response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return !!manager && !!(window as any).OnlineLeaderboardRuntime;
    });

    await page.evaluate(async (injectedModeKey) => {
      const manager = (window as any).game_manager;
      manager.rankPolicy = "ranked";
      manager.modeKey = injectedModeKey;
      manager.rankedSessionToken = "old-ranked-token";
      manager.challengeId = "ranked-old";
      manager.initialSeed = 123;
      manager.seed = 123;
      manager.replayMode = false;
      manager.over = true;
      manager.won = false;
      manager.keepPlaying = false;
      manager.score = 2048;
      manager.moveHistory = [0, 1, 2];
      manager.successfulMoveCount = 3;
      manager.serialize = () => "old-ranked-replay";
      manager.serializeV3 = () => ({ v: 3, actions: [0, 1, 2] });
      if (typeof manager.tryAutoSubmitOnGameOver === "function") {
        await manager.tryAutoSubmitOnGameOver();
      }
      const rankedRuntime = (window as any).RankedSessionRuntime;
      if (rankedRuntime && typeof rankedRuntime.promotePrefetchedSession === "function") {
        rankedRuntime.promotePrefetchedSession(injectedModeKey);
      }
      const activeRaw = window.localStorage.getItem("ranked_session_active:v1:" + injectedModeKey);
      const active = activeRaw ? JSON.parse(activeRaw) : null;
      if (active) {
        manager.rankedSessionToken = String(active.ranked_session_token || "");
        manager.challengeId = String(active.challenge_id || "");
        const activeSeed = Math.floor(Number(active.seed));
        if (Number.isSafeInteger(activeSeed) && activeSeed >= 0) {
          manager.initialSeed = activeSeed;
          manager.seed = activeSeed;
        }
        (window as any).GAME_CHALLENGE_CONTEXT = {
          id: String(active.challenge_id || ""),
          mode_key: String(active.mode_key || injectedModeKey),
          seed: activeSeed,
          ranked_session_token: String(active.ranked_session_token || "")
        };
      }
      manager.rankCheckpointApplying = true;
      await manager.restart();
      manager.rankCheckpointApplying = false;
    }, modeKey);

    await expect.poll(() => recordPayloads.length, { timeout: 5000 }).toBeGreaterThanOrEqual(1);
    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const manager = (window as any).game_manager;
            return {
              blocked: !!manager?.rankedSetupBlockedUntilSessionReady,
              initialSeed: Math.floor(Number(manager?.initialSeed)),
              managerToken: String(manager?.rankedSessionToken || "")
            };
          }),
        { timeout: 5000 }
      )
      .toEqual({
        blocked: false,
        initialSeed: nextSession.seed,
        managerToken: "next-ranked-token"
      });

    const afterRestartSession = await page.evaluate((injectedModeKey) => {
      const raw = window.localStorage.getItem("ranked_session_active:v1:" + injectedModeKey);
      const active = raw ? JSON.parse(raw) : null;
      return {
        initialSeed: Math.floor(Number((window as any).game_manager?.initialSeed)),
        managerToken: String((window as any).game_manager?.rankedSessionToken || ""),
        activeToken: active ? String(active.ranked_session_token || "") : ""
      };
    }, modeKey);
    expect(recordPayloads[0]?.ranked_session_token).toBe("old-ranked-token");
    expect(afterRestartSession.initialSeed).toBe(nextSession.seed);
    expect(afterRestartSession.managerToken).toBe("next-ranked-token");
    expect(afterRestartSession.activeToken).toBe("next-ranked-token");

    await page.evaluate(async (injectedModeKey) => {
      const manager = (window as any).game_manager;
      manager.rankPolicy = "ranked";
      manager.modeKey = injectedModeKey;
      manager.replayMode = false;
      manager.over = true;
      manager.won = false;
      manager.keepPlaying = false;
      manager.score = 4096;
      manager.moveHistory = [1, 2, 3, 0];
      manager.successfulMoveCount = 4;
      manager.serialize = () => "next-ranked-replay";
      manager.serializeV3 = () => ({ v: 3, actions: [1, 2, 3, 0] });
      window.dispatchEvent(new Event("online"));
    });

    await expect.poll(() => recordPayloads.length, { timeout: 5000 }).toBeGreaterThanOrEqual(2);
    expect(recordPayloads[1]?.ranked_session_token).toBe("next-ranked-token");
  });

  test("ranked restart creates the next session on demand when prefetch is not ready", async ({ page }) => {
    const modeKey = "standard_4x4_pow2_no_undo";
    const nowSec = Math.floor(Date.now() / 1000);
    const oldSession = {
      mode_key: modeKey,
      challenge_id: "ranked-old",
      seed: 123,
      ranked_session_token: "old-ranked-token",
      issued_at: nowSec - 60,
      exp: nowSec + 3600,
      owner_user_id: "42"
    };
    const recordPayloads: Array<Record<string, unknown>> = [];
    let sessionStartRequests = 0;

    await page.route("**/api/records", async (route) => {
      recordPayloads.push(route.request().postDataJSON() as Record<string, unknown>);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { id: `record-${recordPayloads.length}` }
        })
      });
    });
    await page.route("**/api/ranked-checkpoint**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: route.request().method() === "GET" ? null : undefined,
          deleted: route.request().method() === "DELETE" ? true : undefined,
          verified: route.request().method() === "POST" ? true : undefined
        })
      });
    });
    await page.route("**/api/ranked-session/start", async (route) => {
      sessionStartRequests += 1;
      await new Promise((resolve) => setTimeout(resolve, 120));
      const isFirst = sessionStartRequests === 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            mode_key: modeKey,
            challenge_id: isFirst ? "ranked-next" : `ranked-prefetch-${sessionStartRequests}`,
            seed: isFirst ? 456 : 800 + sessionStartRequests,
            ranked_session_token: isFirst ? "next-ranked-token" : `prefetch-ranked-token-${sessionStartRequests}`,
            issued_at: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
            spawn_sequence_version: 2
          }
        })
      });
    });
    await page.route("**/api/leaderboard**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] })
      });
    });

    await page.addInitScript(
      ({ modeKey: injectedModeKey, oldSession: injectedOld }) => {
        window.localStorage.setItem("2048_auth_token_v1", "smoke_token");
        window.localStorage.setItem("2048_auth_userId_v1", "42");
        window.localStorage.setItem("2048_auth_nickname_v1", "Smoke");
        window.localStorage.removeItem("online_last_record_submit_signature_v1");
        window.localStorage.removeItem("online_pending_record_submit_signature_v1");
        window.localStorage.setItem("ranked_session_active:v1:" + injectedModeKey, JSON.stringify(injectedOld));
        window.localStorage.removeItem("ranked_session_prefetch:v1:" + injectedModeKey);
        (window as any).__rankedRestartAlerts = [];
        window.alert = (message?: unknown) => {
          (window as any).__rankedRestartAlerts.push(String(message || ""));
        };
        window.confirm = () => true;
      },
      { modeKey, oldSession }
    );

    const response = await page.goto("/2048.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Game response should exist").not.toBeNull();
    expect(response?.ok(), "Game response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return !!manager && !!(window as any).OnlineLeaderboardRuntime;
    });

    await page.evaluate(async (injectedModeKey) => {
      const manager = (window as any).game_manager;
      manager.rankPolicy = "ranked";
      manager.modeKey = injectedModeKey;
      manager.replayMode = false;
      manager.over = true;
      manager.won = false;
      manager.keepPlaying = false;
      manager.score = 2048;
      manager.moveHistory = [0, 1, 2];
      manager.successfulMoveCount = 3;
      manager.serialize = () => "old-ranked-replay";
      manager.serializeV3 = () => ({ v: 3, actions: [0, 1, 2] });
      if (typeof manager.tryAutoSubmitOnGameOver === "function") {
        manager.tryAutoSubmitOnGameOver();
      }
      const rankedRuntime = (window as any).RankedSessionRuntime;
      if (rankedRuntime && typeof rankedRuntime.startNextSession === "function") {
        await rankedRuntime.startNextSession(injectedModeKey);
      }
      const activeRaw = window.localStorage.getItem("ranked_session_active:v1:" + injectedModeKey);
      const active = activeRaw ? JSON.parse(activeRaw) : null;
      if (active) {
        manager.rankedSessionToken = String(active.ranked_session_token || "");
        manager.challengeId = String(active.challenge_id || "");
      }
      manager.rankCheckpointApplying = true;
      manager.restart();
      manager.rankCheckpointApplying = false;
    }, modeKey);

    await expect
      .poll(
        () =>
          page.evaluate((injectedModeKey) => {
            const raw = window.localStorage.getItem("ranked_session_active:v1:" + injectedModeKey);
            const active = raw ? JSON.parse(raw) : null;
            return {
              activeToken: active ? String(active.ranked_session_token || "") : "",
              managerToken: String((window as any).game_manager?.rankedSessionToken || ""),
              alerts: ((window as any).__rankedRestartAlerts || []).length
            };
          }, modeKey),
        { timeout: 5000 }
      )
      .toMatchObject({
        activeToken: "next-ranked-token",
        managerToken: "next-ranked-token",
        alerts: 0
      });

    expect(recordPayloads[0]?.ranked_session_token).toBe("old-ranked-token");
    expect(recordPayloads[0]?.challenge_id).toBe("ranked-old");
    expect(sessionStartRequests).toBeGreaterThanOrEqual(1);
  });

  test("online record submit flushes before restart when game is already over", async ({ page }) => {
    await installRankedSessionForMode(page, "standard_4x4_pow2_no_undo", {
      clearPrefetch: true,
      clearSavedState: true,
      seed: 640,
      token: "smoke-token-flush-before-restart"
    });
    await page.addInitScript(() => {
      window.localStorage.setItem("2048_auth_token_v1", "smoke_token");
      window.localStorage.setItem("2048_auth_userId_v1", "42");
      window.localStorage.setItem("2048_auth_nickname_v1", "Smoke");
      window.localStorage.removeItem("online_last_submit_signature_v1");
      window.localStorage.removeItem("online_last_record_submit_signature_v1");

      (window as any).GAME_API_REQUEST_TIMEOUT_MS = 120;
      (window as any).__recordSubmitCalls = 0;
      (window as any).__recordSubmitLastPayload = null;

      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = typeof input === "string" ? input : String((input as Request).url || input);
        const pathname = new URL(url, window.location.href).pathname;
        const method = String((init && init.method) || "GET").toUpperCase();
        if (pathname === "/api/records" && method === "POST") {
          let parsedPayload: Record<string, unknown> | null = null;
          if (init && typeof init.body === "string" && init.body.length > 0) {
            try {
              const parsed = JSON.parse(init.body);
              parsedPayload = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
            } catch (_err) {
              parsedPayload = null;
            }
          }
          (window as any).__recordSubmitLastPayload = parsedPayload;
          (window as any).__recordSubmitCalls = Number((window as any).__recordSubmitCalls || 0) + 1;
          return new Response(JSON.stringify({ success: true, id: "rec-smoke-1" }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }

        if (url.includes("/score")) {
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }

        if (url.includes("/leaderboard")) {
          return new Response(JSON.stringify({ success: true, data: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }

        return originalFetch(input, init);
      };
    });

    const response = await page.goto("/2048.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Game response should exist").not.toBeNull();
    expect(response?.ok(), "Game response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();

    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return !!manager && !!(window as any).OnlineLeaderboardRuntime;
    });

    await page.evaluate(async () => {
      const manager = (window as any).game_manager;
      manager.rankPolicy = "ranked";
      manager.modeKey = "standard_4x4_pow2_no_undo";
      manager.replayMode = false;
      manager.over = true;
      manager.won = false;
      manager.keepPlaying = false;
      manager.score = Math.max(512, Number(manager.score || 0));

      if (typeof manager.serialize !== "function") {
        manager.serialize = () => '{"v":3,"actions":[0,1,2,3]}';
      }
      if (typeof manager.serializeV3 !== "function") {
        manager.serializeV3 = () => ({ v: 3, actions: [0, 1, 2, 3] });
      }

      manager.restart();
    });

    await page.waitForFunction(() => Number((window as any).__recordSubmitCalls || 0) >= 1, null, {
      timeout: 4000
    });

    const snapshot = await page.evaluate(() => ({
      calls: Number((window as any).__recordSubmitCalls || 0),
      lastRecordSignature: String(window.localStorage.getItem("online_last_record_submit_signature_v1") || ""),
      payloadClientRecordId: (() => {
        const payload = (window as any).__recordSubmitLastPayload;
        return payload ? String((payload as any).client_record_id || "") : "";
      })(),
      payloadHasRequiredKeys: (() => {
        const payload = (window as any).__recordSubmitLastPayload;
        const requiredKeys = [
          "score",
          "best_tile",
          "duration_ms",
          "mode",
          "mode_key",
          "ended_at",
          "end_reason",
          "final_board",
          "replay",
          "replay_string"
        ];
        return !!payload && requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(payload, key));
      })(),
      payloadFinalBoardIsArray: (() => {
        const payload = (window as any).__recordSubmitLastPayload;
        return !!payload && Array.isArray((payload as any).final_board);
      })()
    }));

    expect(snapshot.calls).toBeGreaterThanOrEqual(1);
    expect(snapshot.lastRecordSignature.length).toBeGreaterThan(0);
    expect(snapshot.payloadClientRecordId.length).toBeGreaterThan(0);
    expect(snapshot.payloadHasRequiredKeys).toBe(true);
    expect(snapshot.payloadFinalBoardIsArray).toBe(true);
  });

  test("ranked restart falls back to a non-submittable local board when next session creation fails", async ({ page }) => {
    const modeKey = "standard_4x4_pow2_no_undo";
    const nowSec = Math.floor(Date.now() / 1000);
    const oldSession = {
      mode_key: modeKey,
      challenge_id: "ranked-old",
      seed: 123,
      ranked_session_token: "old-ranked-token",
      issued_at: nowSec - 60,
      exp: nowSec + 3600,
      owner_user_id: "42"
    };
    let recordRequests = 0;

    await page.route("**/api/records", async (route) => {
      recordRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { id: "record-fallback" } })
      });
    });
    await page.route("**/api/ranked-checkpoint**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, deleted: route.request().method() === "DELETE" })
      });
    });
    await page.route("**/api/ranked-session/start", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" })
      });
    });
    await page.route("**/api/leaderboard**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] })
      });
    });

    await page.addInitScript(
      ({ modeKey: injectedModeKey, oldSession: injectedOld }) => {
        window.localStorage.setItem("2048_auth_token_v1", "expired_smoke_token");
        window.localStorage.setItem("2048_auth_userId_v1", "42");
        window.localStorage.setItem("2048_auth_nickname_v1", "Smoke");
        window.localStorage.setItem("ranked_session_active:v1:" + injectedModeKey, JSON.stringify(injectedOld));
        (window as any).GAME_CHALLENGE_CONTEXT = {
          id: String(injectedOld.challenge_id || ""),
          mode_key: String(injectedOld.mode_key || injectedModeKey),
          seed: Number(injectedOld.seed),
          ranked_session_token: String(injectedOld.ranked_session_token || "")
        };
        window.localStorage.removeItem("ranked_session_prefetch:v1:" + injectedModeKey);
        window.localStorage.removeItem("online_last_record_submit_signature_v1");
        (window as any).__rankedRestartAlerts = [];
        window.alert = (message?: unknown) => {
          (window as any).__rankedRestartAlerts.push(String(message || ""));
        };
        window.confirm = () => true;
      },
      { modeKey, oldSession }
    );

    const response = await page.goto("/2048.html", { waitUntil: "domcontentloaded" });
    expect(response, "Game response should exist").not.toBeNull();
    expect(response?.ok(), "Game response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return !!manager && !!(window as any).OnlineLeaderboardRuntime;
    });

    await page.evaluate(async () => {
      const manager = (window as any).game_manager;
      manager.rankPolicy = "ranked";
      manager.modeKey = "standard_4x4_pow2_no_undo";
      manager.replayMode = false;
      manager.over = false;
      manager.won = false;
      manager.keepPlaying = false;
      manager.score = 2048;
      manager.moveHistory = [0, 1, 2];
      manager.successfulMoveCount = 3;
      manager.sessionSubmitDone = true;
      const rankedRuntime = (window as any).RankedSessionRuntime;
      const ready =
        rankedRuntime && typeof rankedRuntime.startNextSession === "function"
          ? await rankedRuntime.startNextSession("standard_4x4_pow2_no_undo")
          : false;
      manager.rankCheckpointApplying = true;
      manager.restart();
      manager.rankCheckpointApplying = false;
    });

    await expect
      .poll(
        () =>
          page.evaluate((injectedModeKey) => ({
            over: !!(window as any).game_manager?.over,
            score: Number((window as any).game_manager?.score || 0),
            managerToken: String((window as any).game_manager?.rankedSessionToken || ""),
            blocked: !!(window as any).game_manager?.rankedSetupBlockedUntilSessionReady,
            gridIsNull: (window as any).game_manager?.grid === null,
            moveHistoryLength: Array.isArray((window as any).game_manager?.moveHistory)
              ? (window as any).game_manager.moveHistory.length
              : 0,
            tileCount: document.querySelectorAll(".tile-container .tile").length,
            activeSession: window.localStorage.getItem("ranked_session_active:v1:" + injectedModeKey),
            authToken: window.localStorage.getItem("2048_auth_token_v1"),
            alerts: ((window as any).__rankedRestartAlerts || []).length
          })),
        { timeout: 5000 }
      )
      .toMatchObject({
        blocked: false,
        gridIsNull: false,
        moveHistoryLength: 3,
        tileCount: 2,
        managerToken: "",
        activeSession: null,
        authToken: null,
        alerts: 0
      });
    expect(recordRequests).toBe(0);
  });

  test("online record submit follows local terminal auto-submit without polling", async ({ page }) => {
    await installRankedSessionForMode(page, "standard_4x4_pow2_no_undo", {
      clearPrefetch: true,
      clearSavedState: true,
      seed: 641,
      token: "smoke-token-local-terminal-submit"
    });
    await page.addInitScript(() => {
      (window as any).__DISABLE_ONLINE_LEADERBOARD__ = true;
      window.localStorage.setItem("2048_auth_token_v1", "smoke_token");
      window.localStorage.setItem("2048_auth_userId_v1", "42");
      window.localStorage.setItem("2048_auth_nickname_v1", "Smoke");
      window.localStorage.removeItem("online_last_submit_signature_v1");
      window.localStorage.removeItem("online_last_record_submit_signature_v1");
      window.localStorage.removeItem("online_pending_record_submit_signature_v1");
      window.localStorage.removeItem("last_session_submit_result_v1");

      (window as any).__recordSubmitCalls = 0;
      (window as any).__recordSubmitLastPayload = null;

      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = typeof input === "string" ? input : String((input as Request).url || input);
        const pathname = new URL(url, window.location.href).pathname;
        const method = String((init && init.method) || "GET").toUpperCase();
        if (pathname === "/api/records" && method === "POST") {
          let parsedPayload: Record<string, unknown> | null = null;
          if (init && typeof init.body === "string" && init.body.length > 0) {
            try {
              const parsed = JSON.parse(init.body);
              parsedPayload = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
            } catch (_err) {
              parsedPayload = null;
            }
          }
          (window as any).__recordSubmitLastPayload = parsedPayload;
          (window as any).__recordSubmitCalls = Number((window as any).__recordSubmitCalls || 0) + 1;
          return new Response(JSON.stringify({ success: true, id: "rec-smoke-local-terminal-1" }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }

        if (url.includes("/score") || url.includes("/leaderboard")) {
          return new Response(JSON.stringify({ success: true, data: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }

        return originalFetch(input, init);
      };
    });

    const response = await page.goto("/2048.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Game response should exist").not.toBeNull();
    expect(response?.ok(), "Game response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();

    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return (
        !!manager &&
        !!(window as any).OnlineLeaderboardRuntime &&
        typeof manager.tryAutoSubmitOnGameOver === "function"
      );
    });

    await page.evaluate(() => {
      const manager = (window as any).game_manager;
      manager.sessionSubmitDone = false;
      manager.replayMode = false;
      manager.over = true;
      manager.won = false;
      manager.keepPlaying = false;
      manager.score = Math.max(1024, Number(manager.score || 0));
      if (Array.isArray(manager.moveHistory) && manager.moveHistory.length === 0) {
        manager.moveHistory.push(0, 1, 2, 3);
      } else {
        manager.moveHistory = [0, 1, 2, 3];
      }
      manager.successfulMoveCount = Math.max(4, Number(manager.successfulMoveCount || 0));
      if (typeof manager.serialize !== "function") {
        manager.serialize = () => '{"v":3,"actions":[0,1,2,3]}';
      }
      if (typeof manager.serializeV3 !== "function") {
        manager.serializeV3 = () => ({ v: 3, actions: [0, 1, 2, 3] });
      }

      manager.tryAutoSubmitOnGameOver();
    });

    await page.waitForFunction(() => Number((window as any).__recordSubmitCalls || 0) >= 1, null, {
      timeout: 4000
    });

    const snapshot = await page.evaluate(() => ({
      calls: Number((window as any).__recordSubmitCalls || 0),
      localResult: (() => {
        const raw = window.localStorage.getItem("last_session_submit_result_v1");
        try {
          return raw ? JSON.parse(raw) : null;
        } catch (_err) {
          return null;
        }
      })(),
      payload: (window as any).__recordSubmitLastPayload || null
    }));

    expect(snapshot.calls).toBeGreaterThanOrEqual(1);
    expect(snapshot.localResult?.ok).toBe(true);
    expect(snapshot.payload).toMatchObject({
      score: expect.any(Number),
      mode_key: "standard_4x4_pow2_no_undo",
      replay_string: expect.any(String)
    });
  });

  test.describe("expanded ranked mode terminal uploads", () => {
    for (const { modeKey, modeBucket } of [
      { modeKey: "fib_4x4_no_undo", modeBucket: "fib_4x4" },
      { modeKey: "board_3x3_pow2_no_undo", modeBucket: "pow2_3x3" }
    ]) {
      test(`${modeKey} posts a terminal record with ranked context`, async ({ page }) => {
        await installRankedSessionForMode(page, modeKey, {
          clearPrefetch: true,
          clearSavedState: true,
          seed: 641,
          token: `smoke-token-${modeKey}`
        });
        await page.addInitScript(() => {
          window.localStorage.setItem("2048_auth_token_v1", "smoke_token");
          window.localStorage.setItem("2048_auth_userId_v1", "42");
          window.localStorage.setItem("2048_auth_nickname_v1", "Smoke");
          window.localStorage.removeItem("online_last_record_submit_signature_v1");
          window.localStorage.removeItem("online_pending_record_submit_signature_v1");
          window.localStorage.removeItem("last_session_submit_result_v1");

          (window as any).__recordSubmitCalls = 0;
          (window as any).__recordSubmitLastPayload = null;

          const originalFetch = window.fetch.bind(window);
          window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
            const url = typeof input === "string" ? input : String((input as Request).url || input);
            const pathname = new URL(url, window.location.href).pathname;
            const method = String((init && init.method) || "GET").toUpperCase();
            if (pathname === "/api/records" && method === "POST") {
              let parsedPayload: Record<string, unknown> | null = null;
              if (init && typeof init.body === "string" && init.body.length > 0) {
                try {
                  const parsed = JSON.parse(init.body);
                  parsedPayload = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
                } catch (_err) {
                  parsedPayload = null;
                }
              }
              (window as any).__recordSubmitLastPayload = parsedPayload;
              (window as any).__recordSubmitCalls = Number((window as any).__recordSubmitCalls || 0) + 1;
              return new Response(JSON.stringify({ success: true, id: "rec-smoke-expanded-mode" }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
              });
            }

            if (url.includes("/score") || url.includes("/leaderboard") || url.includes("/ranked-checkpoint")) {
              return new Response(JSON.stringify({ success: true, data: [] }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
              });
            }

            return originalFetch(input, init);
          };
        });

        const response = await page.goto(`/play.html?mode_key=${encodeURIComponent(modeKey)}`, {
          waitUntil: "domcontentloaded"
        });
        expect(response, "Game response should exist").not.toBeNull();
        expect(response?.ok(), "Game response should be 2xx").toBeTruthy();
        await expect(page.locator("body")).toBeVisible();

        await page.waitForFunction(() => {
          const manager = (window as any).game_manager;
          return (
            !!manager &&
            !!(window as any).OnlineLeaderboardRuntime &&
            manager.__onlineImmediateSubmitHooksBound === true &&
            typeof manager.tryAutoSubmitOnGameOver === "function"
          );
        });

        await page.evaluate(() => {
          const manager = (window as any).game_manager;
          manager.sessionSubmitDone = false;
          manager.replayMode = false;
          manager.over = true;
          manager.won = false;
          manager.keepPlaying = false;
          manager.score = Math.max(1024, Number(manager.score || 0));
          manager.moveHistory = [0, 1, 2, 3];
          manager.successfulMoveCount = 4;
          manager.tryAutoSubmitOnGameOver();
        });

        await page.waitForFunction(() => Number((window as any).__recordSubmitCalls || 0) >= 1, null, {
          timeout: 4000
        });

        const payload = await page.evaluate(() => (window as any).__recordSubmitLastPayload || null);
        expect(payload).toMatchObject({
          mode_key: modeKey,
          mode_bucket: modeBucket,
          ranked_session_token: `smoke-token-${modeKey}`,
          end_reason: "game_over"
        });
      });
    }
  });

  test("ranked undo mode submits the terminal record only when restarting after death", async ({ page }) => {
    const modeKey = "classic_4x4_pow2_undo";
    const modeBucket = "standard_undo";
    const recordPayloads: Array<Record<string, unknown>> = [];
    let sessionStartRequests = 0;

    await page.route("**/api/records", async (route) => {
      recordPayloads.push(route.request().postDataJSON() as Record<string, unknown>);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { id: `record-undo-${recordPayloads.length}` }
        })
      });
    });
    await page.route("**/api/ranked-session/start", async (route) => {
      sessionStartRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            mode_key: modeKey,
            challenge_id: `ranked-undo-next-${sessionStartRequests}`,
            seed: 900 + sessionStartRequests,
            ranked_session_token: `next-ranked-undo-token-${sessionStartRequests}`,
            issued_at: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
            spawn_sequence_version: 2
          }
        })
      });
    });
    await page.route("**/api/ranked-checkpoint**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: route.request().method() === "GET" ? null : undefined,
          deleted: route.request().method() === "DELETE" ? true : undefined,
          verified: route.request().method() === "POST" ? true : undefined
        })
      });
    });
    await page.route("**/api/leaderboard**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] })
      });
    });

    await installRankedSessionForMode(page, modeKey, {
      clearPrefetch: true,
      clearSavedState: true,
      confirmRestart: true,
      seed: 641,
      token: "smoke-token-undo-deferred"
    });
    await page.addInitScript(() => {
      window.localStorage.removeItem("online_last_record_submit_signature_v1");
      window.localStorage.removeItem("online_pending_record_submit_signature_v1");
      window.localStorage.removeItem("last_session_submit_result_v1");
    });

    const response = await page.goto(`/play.html?mode_key=${encodeURIComponent(modeKey)}`, {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Game response should exist").not.toBeNull();
    expect(response?.ok(), "Game response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();

    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return (
        !!manager &&
        !!(window as any).OnlineLeaderboardRuntime &&
        manager.__onlineImmediateSubmitHooksBound === true &&
        typeof manager.tryAutoSubmitOnGameOver === "function" &&
        typeof manager.restart === "function"
      );
    });

    await page.evaluate((injectedModeKey) => {
      const manager = (window as any).game_manager;
      const context = (window as any).GAME_CHALLENGE_CONTEXT || {};
      manager.rankPolicy = "ranked";
      manager.modeKey = injectedModeKey;
      manager.replayMode = false;
      manager.over = true;
      manager.won = false;
      manager.keepPlaying = false;
      manager.undoEnabled = true;
      manager.modeConfig = Object.assign({}, manager.modeConfig || {}, {
        key: injectedModeKey,
        undo_enabled: true,
        rank_policy: "ranked",
        ranked_bucket: "standard_undo"
      });
      manager.rankedBucket = "standard_undo";
      manager.rankedSessionToken = String(context.ranked_session_token || "smoke-token-undo-deferred");
      manager.challengeId = String(context.id || context.challenge_id || `smoke-${injectedModeKey}`);
      manager.initialSeed = Number(context.seed || 641);
      manager.seed = Number(context.seed || 641);
      manager.score = Math.max(1024, Number(manager.score || 0));
      manager.moveHistory = [0, 1, 2, 3];
      manager.successfulMoveCount = 4;
      manager.serialize = () => '{"v":3,"actions":[0,1,2,3]}';
      manager.serializeV3 = () => ({ v: 3, actions: [0, 1, 2, 3] });

      manager.tryAutoSubmitOnGameOver();
    }, modeKey);

    await page.waitForTimeout(300);
    expect(recordPayloads).toHaveLength(0);

    await page.evaluate(() => {
      const manager = (window as any).game_manager;
      manager.restart();
    });

    await expect.poll(() => recordPayloads.length, { timeout: 5000 }).toBeGreaterThanOrEqual(1);
    expect(recordPayloads[0]).toMatchObject({
      mode_key: modeKey,
      mode_bucket: modeBucket,
      ranked_session_token: "smoke-token-undo-deferred",
      end_reason: "game_over"
    });
    expect(sessionStartRequests).toBeGreaterThanOrEqual(1);
  });

  test("online record submit flushes capped completion win-stop sessions before restart", async ({ page }) => {
    await installRankedSessionForMode(page, "capped_4x4_pow2_64_no_undo", {
      clearPrefetch: true,
      clearSavedState: true,
      seed: 645,
      token: "smoke-token-capped-win-stop"
    });
    await page.addInitScript(() => {
      window.localStorage.setItem("2048_auth_token_v1", "smoke_token");
      window.localStorage.setItem("2048_auth_userId_v1", "42");
      window.localStorage.setItem("2048_auth_nickname_v1", "Smoke");
      window.localStorage.removeItem("online_last_submit_signature_v1");
      window.localStorage.removeItem("online_last_record_submit_signature_v1");

      (window as any).GAME_API_REQUEST_TIMEOUT_MS = 120;
      (window as any).__recordSubmitCalls = 0;
      (window as any).__recordSubmitLastPayload = null;

      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = typeof input === "string" ? input : String((input as Request).url || input);
        const pathname = new URL(url, window.location.href).pathname;
        const method = String((init && init.method) || "GET").toUpperCase();
        if (pathname === "/api/records" && method === "POST") {
          let parsedPayload: Record<string, unknown> | null = null;
          if (init && typeof init.body === "string" && init.body.length > 0) {
            try {
              const parsed = JSON.parse(init.body);
              parsedPayload = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
            } catch (_err) {
              parsedPayload = null;
            }
          }
          (window as any).__recordSubmitLastPayload = parsedPayload;
          (window as any).__recordSubmitCalls = Number((window as any).__recordSubmitCalls || 0) + 1;
          return new Response(JSON.stringify({ success: true, id: "rec-smoke-capped-1" }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }

        if (url.includes("/score")) {
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }

        if (url.includes("/leaderboard")) {
          return new Response(JSON.stringify({ success: true, data: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }

        return originalFetch(input, init);
      };
    });

    const response = await page.goto("/play.html?mode_key=capped_4x4_pow2_64_no_undo", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Play response should exist").not.toBeNull();
    expect(response?.ok(), "Play response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();

    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return !!manager && !!(window as any).OnlineLeaderboardRuntime;
    });

    await page.evaluate(() => {
      const manager = (window as any).game_manager;
      manager.replayMode = false;
      manager.over = false;
      manager.won = true;
      manager.keepPlaying = false;
      manager.score = Math.max(512, Number(manager.score || 0));

      if (typeof manager.serialize !== "function") {
        manager.serialize = () => '{"v":3,"actions":[0,1,2,3]}';
      }
      if (typeof manager.serializeV3 !== "function") {
        manager.serializeV3 = () => ({ v: 3, actions: [0, 1, 2, 3] });
      }

      manager.restart();
    });

    await page.waitForFunction(() => Number((window as any).__recordSubmitCalls || 0) >= 1, null, {
      timeout: 4000
    });

    const snapshot = await page.evaluate(() => ({
      calls: Number((window as any).__recordSubmitCalls || 0),
      lastRecordSignature: String(window.localStorage.getItem("online_last_record_submit_signature_v1") || ""),
      payloadModeKey: (() => {
        const payload = (window as any).__recordSubmitLastPayload;
        return payload ? String((payload as any).mode_key || "") : "";
      })(),
      payloadMode: (() => {
        const payload = (window as any).__recordSubmitLastPayload;
        return payload ? String((payload as any).mode || "") : "";
      })(),
      payloadEndReason: (() => {
        const payload = (window as any).__recordSubmitLastPayload;
        return payload ? String((payload as any).end_reason || "") : "";
      })(),
      payloadHasReplayString: (() => {
        const payload = (window as any).__recordSubmitLastPayload;
        return (
          !!payload && typeof (payload as any).replay_string === "string" && !!(payload as any).replay_string.trim()
        );
      })()
    }));

    expect(snapshot.calls).toBeGreaterThanOrEqual(1);
    expect(snapshot.lastRecordSignature.length).toBeGreaterThan(0);
    expect(snapshot.payloadModeKey).toBe("capped_4x4_pow2_64_no_undo");
    expect(snapshot.payloadMode.length).toBeGreaterThan(0);
    expect(snapshot.payloadEndReason).toBe("game_over");
    expect(snapshot.payloadHasReplayString).toBe(true);
  });

  test("online record submit retries transient pending failures after backoff", async ({ page }) => {
    await installRankedSessionForMode(page, "standard_4x4_pow2_no_undo", {
      clearPrefetch: true,
      clearSavedState: true,
      seed: 642,
      token: "smoke-token-submit-retry"
    });
    await page.addInitScript(() => {
      window.localStorage.setItem("2048_auth_token_v1", "smoke_token");
      window.localStorage.setItem("2048_auth_userId_v1", "42");
      window.localStorage.setItem("2048_auth_nickname_v1", "Smoke");
      window.localStorage.removeItem("online_last_submit_signature_v1");
      window.localStorage.removeItem("online_last_record_submit_signature_v1");
      window.localStorage.removeItem("online_pending_record_submit_signature_v1");

      (window as any).GAME_API_REQUEST_TIMEOUT_MS = 120;
      (window as any).__recordSubmitCalls = 0;
      (window as any).__recordSubmitLastPayload = null;
      (window as any).__recordSubmitShouldFailOnce = true;

      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = typeof input === "string" ? input : String((input as Request).url || input);
        const pathname = new URL(url, window.location.href).pathname;
        const method = String((init && init.method) || "GET").toUpperCase();
        if (pathname === "/api/records" && method === "POST") {
          let parsedPayload: Record<string, unknown> | null = null;
          if (init && typeof init.body === "string" && init.body.length > 0) {
            try {
              const parsed = JSON.parse(init.body);
              parsedPayload = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
            } catch (_err) {
              parsedPayload = null;
            }
          }
          (window as any).__recordSubmitLastPayload = parsedPayload;
          (window as any).__recordSubmitCalls = Number((window as any).__recordSubmitCalls || 0) + 1;
          if ((window as any).__recordSubmitShouldFailOnce === true) {
            (window as any).__recordSubmitShouldFailOnce = false;
            return new Response(JSON.stringify({ success: false, error: "Network timeout" }), {
              status: 200,
              headers: { "Content-Type": "application/json" }
            });
          }
          return new Response(JSON.stringify({ success: true, id: "rec-smoke-retry-1" }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }

        if (url.includes("/score")) {
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }

        if (url.includes("/leaderboard")) {
          return new Response(JSON.stringify({ success: true, data: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }

        return originalFetch(input, init);
      };
    });

    const response = await page.goto("/2048.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Game response should exist").not.toBeNull();
    expect(response?.ok(), "Game response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();

    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return !!manager && !!(window as any).OnlineLeaderboardRuntime;
    });

    await page.evaluate(() => {
      const manager = (window as any).game_manager;
      manager.replayMode = false;
      manager.over = true;
      manager.won = false;
      manager.keepPlaying = false;
      manager.score = Math.max(512, Number(manager.score || 0));

      if (typeof manager.serialize !== "function") {
        manager.serialize = () => '{"v":3,"actions":[0,1,2,3]}';
      }
      if (typeof manager.serializeV3 !== "function") {
        manager.serializeV3 = () => ({ v: 3, actions: [0, 1, 2, 3] });
      }

      window.dispatchEvent(new Event("online"));
    });

    await page.waitForFunction(() => Number((window as any).__recordSubmitCalls || 0) >= 1, null, {
      timeout: 4000
    });

    const firstSnapshot = await page.evaluate(() => ({
      calls: Number((window as any).__recordSubmitCalls || 0),
      lastRecordSignature: String(window.localStorage.getItem("online_last_record_submit_signature_v1") || ""),
      pendingRaw: String(window.localStorage.getItem("online_pending_record_submit_signature_v1") || "")
    }));

    expect(firstSnapshot.calls).toBe(1);
    expect(firstSnapshot.lastRecordSignature).toBe("");
    expect(firstSnapshot.pendingRaw.length).toBeGreaterThan(0);

    await page.waitForTimeout(2300);
    await page.evaluate(() => {
      window.dispatchEvent(new Event("online"));
    });

    await page.waitForFunction(() => Number((window as any).__recordSubmitCalls || 0) >= 2, null, {
      timeout: 4000
    });

    const snapshot = await page.evaluate(() => ({
      calls: Number((window as any).__recordSubmitCalls || 0),
      lastRecordSignature: String(window.localStorage.getItem("online_last_record_submit_signature_v1") || ""),
      pendingRaw: String(window.localStorage.getItem("online_pending_record_submit_signature_v1") || ""),
      payloadEndReason: (() => {
        const payload = (window as any).__recordSubmitLastPayload;
        return payload ? String((payload as any).end_reason || "") : "";
      })()
    }));

    expect(snapshot.calls).toBeGreaterThanOrEqual(2);
    expect(snapshot.lastRecordSignature.length).toBeGreaterThan(0);
    expect(snapshot.pendingRaw).toBe("");
    expect(snapshot.payloadEndReason).toBe("game_over");
  });

  test("saved session preserves client record id across reload", async ({ page }) => {
    const checkpointRequests: string[] = [];

    await page.route("**/api/ranked-checkpoint**", async (route) => {
      const request = route.request();
      checkpointRequests.push(request.method());
      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: null
          })
        });
        return;
      }
      if (request.method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            verified: true,
            data: null
          })
        });
        return;
      }
      if (request.method() === "DELETE") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            deleted: true
          })
        });
        return;
      }
      await route.fallback();
    });

    await page.addInitScript(() => {
      const modeKey = "standard_4x4_pow2_no_undo";
      const nowSec = Math.floor(Date.now() / 1000);
      window.localStorage.setItem("2048_auth_token_v1", "smoke_token");
      window.localStorage.setItem("2048_auth_userId_v1", "42");
      window.localStorage.setItem("2048_auth_nickname_v1", "Smoke");
      window.localStorage.setItem(
        "ranked_session_active:v1:" + modeKey,
        JSON.stringify({
          mode_key: modeKey,
          challenge_id: "smoke-ranked-active",
          seed: 101,
          ranked_session_token: "smoke-ranked-token",
          issued_at: nowSec,
          exp: nowSec + 3600,
          owner_user_id: "42"
        })
      );
    });

    const response = await page.goto("/2048.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Game response should exist").not.toBeNull();
    expect(response?.ok(), "Game response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();

    await page.waitForFunction(() => !!(window as any).game_manager);
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return !!manager && manager.rankCheckpointRestorePending !== true;
    });

    const firstSnapshot = await page.evaluate(async () => {
      const manager = (window as any).game_manager;
      manager.move(2);
      manager.move(0);
      manager.move(2);
      await new Promise((resolve) => window.setTimeout(resolve, 1800));
      const rawMirror = window.localStorage.getItem(
        "ranked_checkpoint_local_mirror:v1:standard_4x4_pow2_no_undo"
      );
      let mirror: Record<string, unknown> | null = null;
      try {
        mirror = rawMirror ? (JSON.parse(rawMirror) as Record<string, unknown>) : null;
      } catch (_err) {
        mirror = null;
      }
      return {
        clientRecordId: String(manager.clientRecordId || ""),
        mirrorClientRecordId: String(mirror?.client_record_id || "")
      };
    });

    expect(firstSnapshot.clientRecordId.length).toBeGreaterThan(0);
    expect(firstSnapshot.mirrorClientRecordId).toBe(firstSnapshot.clientRecordId);

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!(window as any).game_manager);
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return !!manager && manager.rankCheckpointRestorePending !== true;
    });

    const secondSnapshot = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      return {
        clientRecordId: String(manager.clientRecordId || "")
      };
    });

    expect(secondSnapshot.clientRecordId).toBe(firstSnapshot.clientRecordId);
    expect(checkpointRequests).not.toContain("POST");
    expect(checkpointRequests).not.toContain("GET");
  });

  test("online record submit skips win-stop sessions until real game over", async ({ page }) => {
    await installRankedSessionForMode(page, "standard_4x4_pow2_no_undo", {
      clearPrefetch: true,
      clearSavedState: true,
      seed: 643,
      token: "smoke-token-win-stop-skip"
    });
    await page.addInitScript(() => {
      window.localStorage.setItem("2048_auth_token_v1", "smoke_token");
      window.localStorage.setItem("2048_auth_userId_v1", "42");
      window.localStorage.setItem("2048_auth_nickname_v1", "Smoke");
      window.localStorage.removeItem("online_last_submit_signature_v1");
      window.localStorage.removeItem("online_last_record_submit_signature_v1");

      (window as any).GAME_API_REQUEST_TIMEOUT_MS = 120;
      (window as any).__recordSubmitCalls = 0;
      (window as any).__recordSubmitLastPayload = null;

      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = typeof input === "string" ? input : String((input as Request).url || input);
        const pathname = new URL(url, window.location.href).pathname;
        const method = String((init && init.method) || "GET").toUpperCase();
        if (pathname === "/api/records" && method === "POST") {
          let parsedPayload: Record<string, unknown> | null = null;
          if (init && typeof init.body === "string" && init.body.length > 0) {
            try {
              const parsed = JSON.parse(init.body);
              parsedPayload = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
            } catch (_err) {
              parsedPayload = null;
            }
          }
          (window as any).__recordSubmitLastPayload = parsedPayload;
          (window as any).__recordSubmitCalls = Number((window as any).__recordSubmitCalls || 0) + 1;
          return new Response(JSON.stringify({ success: true, id: "rec-smoke-win-stop-1" }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }

        if (url.includes("/score")) {
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }

        if (url.includes("/leaderboard")) {
          return new Response(JSON.stringify({ success: true, data: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }

        return originalFetch(input, init);
      };
    });

    const response = await page.goto("/2048.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Game response should exist").not.toBeNull();
    expect(response?.ok(), "Game response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();

    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return !!manager && !!(window as any).OnlineLeaderboardRuntime;
    });

    await page.evaluate(() => {
      const manager = (window as any).game_manager;
      manager.replayMode = false;
      manager.over = false;
      manager.won = true;
      manager.keepPlaying = false;
      manager.score = Math.max(4096, Number(manager.score || 0));
      manager.successfulMoveCount = 123;
      if (manager.grid && typeof manager.grid.eachCell === "function") {
        manager.grid.eachCell = (callback: (x: number, y: number, tile: { value: number }) => void) => {
          callback(0, 0, { value: 2048 });
        };
      }
      if (typeof manager.serialize !== "function") {
        manager.serialize = () => '{"v":3,"actions":[0,1,2,3]}';
      }
      if (typeof manager.serializeV3 !== "function") {
        manager.serializeV3 = () => ({ v: 3, actions: [0, 1, 2, 3] });
      }

      manager.restart();
    });

    await page.waitForTimeout(1400);

    const snapshot = await page.evaluate(() => ({
      calls: Number((window as any).__recordSubmitCalls || 0),
      payload: (window as any).__recordSubmitLastPayload || null
    }));

    expect(snapshot.calls).toBe(0);
    expect(snapshot.payload).toBeNull();
  });

  test("online record submit dedupes identical replay payloads even if client record id changes", async ({ page }) => {
    await installRankedSessionForMode(page, "board_3x3_pow2_no_undo", {
      clearPrefetch: true,
      clearSavedState: true,
      seed: 644,
      token: "smoke-token-dedupe-3x3"
    });
    await page.addInitScript(() => {
      window.localStorage.setItem("2048_auth_token_v1", "smoke_token");
      window.localStorage.setItem("2048_auth_userId_v1", "42");
      window.localStorage.setItem("2048_auth_nickname_v1", "Smoke");
      window.localStorage.removeItem("online_last_submit_signature_v1");
      window.localStorage.removeItem("online_last_record_submit_signature_v1");
      window.localStorage.removeItem("online_pending_record_submit_signature_v1");

      (window as any).GAME_API_REQUEST_TIMEOUT_MS = 120;
      (window as any).__recordSubmitCalls = 0;
      (window as any).__recordSubmitPayloads = [];

      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = typeof input === "string" ? input : String((input as Request).url || input);
        const pathname = new URL(url, window.location.href).pathname;
        const method = String((init && init.method) || "GET").toUpperCase();
        if (pathname === "/api/records" && method === "POST") {
          let parsedPayload: Record<string, unknown> | null = null;
          if (init && typeof init.body === "string" && init.body.length > 0) {
            try {
              const parsed = JSON.parse(init.body);
              parsedPayload = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
            } catch (_err) {
              parsedPayload = null;
            }
          }
          (window as any).__recordSubmitCalls = Number((window as any).__recordSubmitCalls || 0) + 1;
          ((window as any).__recordSubmitPayloads as Array<Record<string, unknown> | null>).push(parsedPayload);
          return new Response(JSON.stringify({ success: true, id: "rec-smoke-dedupe-1" }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }

        if (url.includes("/score")) {
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }

        if (url.includes("/leaderboard")) {
          return new Response(JSON.stringify({ success: true, data: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }

        return originalFetch(input, init);
      };
    });

    const response = await page.goto("/play.html?mode_key=board_3x3_pow2_no_undo", {
      waitUntil: "domcontentloaded"
    });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("body")).toBeVisible();

    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return !!manager && !!(window as any).OnlineLeaderboardRuntime;
    });

    await page.evaluate(() => {
      const manager = (window as any).game_manager;
      const trySuccessfulMove = (): boolean => {
        const startLength = Array.isArray(manager.moveHistory) ? manager.moveHistory.length : 0;
        for (const direction of [0, 1, 2, 3]) {
          manager.move(direction);
          const nextLength = Array.isArray(manager.moveHistory) ? manager.moveHistory.length : 0;
          if (nextLength > startLength) return true;
        }
        return false;
      };

      for (let i = 0; i < 6; i += 1) {
        if (manager.over) break;
        trySuccessfulMove();
      }

      const stableReplay = String(manager.serialize() || "");
      manager.serialize = () => stableReplay;
      manager.over = true;
      manager.won = false;
      manager.keepPlaying = false;
      manager.score = Math.max(512, Number(manager.score || 0));
      window.dispatchEvent(new Event("online"));
    });

    await page.waitForFunction(() => Number((window as any).__recordSubmitCalls || 0) >= 1, null, {
      timeout: 4000
    });

    await page.evaluate(() => {
      const manager = (window as any).game_manager;
      manager.clientRecordId = "rec_reassigned_for_duplicate_probe";
      window.dispatchEvent(new Event("online"));
    });

    await page.waitForTimeout(1200);

    const snapshot = await page.evaluate(() => ({
      calls: Number((window as any).__recordSubmitCalls || 0),
      payloads: Array.isArray((window as any).__recordSubmitPayloads)
        ? (window as any).__recordSubmitPayloads.map((item: any) => ({
            clientRecordId: item ? String(item.client_record_id || "") : "",
            replayString: item ? String(item.replay_string || "") : ""
          }))
        : [],
      lastRecordSignature: String(window.localStorage.getItem("online_last_record_submit_signature_v1") || "")
    }));

    expect(snapshot.calls).toBe(1);
    expect(snapshot.payloads).toHaveLength(1);
    expect(snapshot.payloads[0]?.clientRecordId.length).toBeGreaterThan(0);
    expect(snapshot.payloads[0]?.replayString.length).toBeGreaterThan(0);
    expect(snapshot.lastRecordSignature.length).toBeGreaterThan(0);
  });
});
