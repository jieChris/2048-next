import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test.describe.configure({ mode: "serial" });

  test("online record submit flushes before restart when game is already over", async ({ page }) => {
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
        if (url.includes("/records")) {
          let parsedPayload: Record<string, unknown> | null = null;
          if (init && typeof init.body === "string" && init.body.length > 0) {
            try {
              const parsed = JSON.parse(init.body);
              parsedPayload =
                parsed && typeof parsed === "object"
                  ? (parsed as Record<string, unknown>)
                  : null;
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

    const response = await page.goto("/2048.html", { waitUntil: "domcontentloaded" });
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
        return (
          !!payload &&
          requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(payload, key))
        );
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

  test("online record submit flushes capped completion win-stop sessions before restart", async ({ page }) => {
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
        if (url.includes("/records")) {
          let parsedPayload: Record<string, unknown> | null = null;
          if (init && typeof init.body === "string" && init.body.length > 0) {
            try {
              const parsed = JSON.parse(init.body);
              parsedPayload =
                parsed && typeof parsed === "object"
                  ? (parsed as Record<string, unknown>)
                  : null;
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
        return !!payload && typeof (payload as any).replay_string === "string" && !!(payload as any).replay_string.trim();
      })()
    }));

    expect(snapshot.calls).toBeGreaterThanOrEqual(1);
    expect(snapshot.lastRecordSignature.length).toBeGreaterThan(0);
    expect(snapshot.payloadModeKey).toBe("capped_4x4_pow2_64_no_undo");
    expect(snapshot.payloadMode.length).toBeGreaterThan(0);
    expect(snapshot.payloadEndReason).toBe("win_stop");
    expect(snapshot.payloadHasReplayString).toBe(true);
  });

  test("online record submit retries transient pending failures after backoff", async ({ page }) => {
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
        if (url.includes("/records")) {
          let parsedPayload: Record<string, unknown> | null = null;
          if (init && typeof init.body === "string" && init.body.length > 0) {
            try {
              const parsed = JSON.parse(init.body);
              parsedPayload =
                parsed && typeof parsed === "object"
                  ? (parsed as Record<string, unknown>)
                  : null;
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

    const response = await page.goto("/2048.html", { waitUntil: "domcontentloaded" });
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
    let checkpointData: Record<string, unknown> | null = null;

    await page.route("**/api/ranked-checkpoint**", async (route) => {
      const request = route.request();
      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: checkpointData
          })
        });
        return;
      }
      if (request.method() === "POST") {
        const body = request.postDataJSON() as Record<string, unknown>;
        checkpointData = {
          mode_key: body.mode_key,
          mode_bucket: body.mode,
          client_record_id: body.client_record_id,
          replay_string: body.replay_string,
          duration_ms: body.duration_ms,
          ui_state: body.ui_state,
          updated_at: new Date().toISOString()
        };
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            verified: true,
            data: checkpointData
          })
        });
        return;
      }
      if (request.method() === "DELETE") {
        checkpointData = null;
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
      window.localStorage.setItem("2048_auth_token_v1", "smoke_token");
      window.localStorage.setItem("2048_auth_userId_v1", "42");
      window.localStorage.setItem("2048_auth_nickname_v1", "Smoke");
    });

    const response = await page.goto("/2048.html", { waitUntil: "domcontentloaded" });
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
      return {
        clientRecordId: String(manager.clientRecordId || "")
      };
    });

    expect(firstSnapshot.clientRecordId.length).toBeGreaterThan(0);
    await expect
      .poll(() => checkpointData, {
        timeout: 12_000
      })
      .not.toBeNull();

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
  });

  test("online record submit skips win-stop sessions until real game over", async ({ page }) => {
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
        if (url.includes("/records")) {
          let parsedPayload: Record<string, unknown> | null = null;
          if (init && typeof init.body === "string" && init.body.length > 0) {
            try {
              const parsed = JSON.parse(init.body);
              parsedPayload =
                parsed && typeof parsed === "object"
                  ? (parsed as Record<string, unknown>)
                  : null;
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

    const response = await page.goto("/2048.html", { waitUntil: "domcontentloaded" });
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
});
