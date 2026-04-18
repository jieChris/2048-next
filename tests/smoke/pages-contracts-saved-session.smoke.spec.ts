import { expect, test } from "@playwright/test";
import { waitForWindowCondition } from "./support/runtime-ready";

test.describe("Legacy Multi-Page Smoke", () => {
  test("session-init payload contract holds on play startup runtime", async ({
    page
  }) => {
    const response = await page.goto("/play.html?mode_key=standard_4x4_pow2_no_undo", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Play response should exist").not.toBeNull();
    expect(response?.ok(), "Play response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForWindowCondition(
      page,
      () => Boolean((window as any).CorePlayStartupPayloadRuntime?.resolvePlayStartupPayload),
      12_000
    );

    const snapshot = await page.evaluate(() => {
      const runtime = (window as any).CorePlayStartupPayloadRuntime;
      const modeConfig =
        (window as any).GAME_MODE_CONFIG && typeof (window as any).GAME_MODE_CONFIG === "object"
          ? (window as any).GAME_MODE_CONFIG
          : { key: "standard_4x4_pow2_no_undo" };
      const payload =
        runtime && typeof runtime.resolvePlayStartupPayload === "function"
          ? runtime.resolvePlayStartupPayload({
              modeConfig,
              inputManagerCtor: (window as any).KeyboardInputManager || function InputCtor() {},
              defaultBoardWidth: 4
            })
          : null;
      const requiredKeys = [
        "modeKey",
        "modeConfig",
        "inputManagerCtor",
        "defaultBoardWidth"
      ];
      const hasRequiredKeys =
        !!payload &&
        requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(payload, key));
      return {
        hasRuntime: !!runtime,
        hasPayload: !!payload,
        hasRequiredKeys,
        defaultBoardWidth:
          payload && Number.isFinite(payload.defaultBoardWidth)
            ? Number(payload.defaultBoardWidth)
            : null
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasPayload).toBe(true);
    expect(snapshot.hasRequiredKeys).toBe(true);
    expect(snapshot.defaultBoardWidth).toBe(4);
  });

  test("saved-state payload contract holds after forced save", async ({ page }) => {
    const response = await page.goto("/Practice_board.html?practice_fresh=1", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Practice response should exist").not.toBeNull();
    expect(response?.ok(), "Practice response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForWindowCondition(
      page,
      () =>
        Boolean((window as any).game_manager) && typeof (window as any).saveGameState === "function",
      12_000
    );

    const snapshot = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      const save = (window as any).saveGameState;
      if (!manager || typeof save !== "function") {
        return { hasManager: !!manager, hasSaveFunction: typeof save === "function" };
      }
      save(manager, { force: true });
      const modeKey = String(manager.modeKey || manager.mode || "practice");
      const storageKey = "savedGameStateByMode:v1:" + modeKey;
      const raw = window.localStorage.getItem(storageKey);
      let parsed: Record<string, unknown> | null = null;
      try {
        parsed = raw ? JSON.parse(raw) : null;
      } catch (_err) {
        parsed = null;
      }
      const marker = "__gm_saved_state_v1__=";
      const windowNamePart = String(window.name || "")
        .split("&")
        .find((part) => typeof part === "string" && part.indexOf(marker) === 0);
      let windowNamePayload: Record<string, unknown> | null = null;
      try {
        const payloadMap = windowNamePart
          ? JSON.parse(decodeURIComponent(windowNamePart.substring(marker.length)))
          : null;
        const modePayload =
          payloadMap && typeof payloadMap === "object" && !Array.isArray(payloadMap)
            ? (payloadMap as Record<string, Record<string, unknown>>)[modeKey]
            : null;
        windowNamePayload =
          modePayload && typeof modePayload === "object" && !Array.isArray(modePayload)
            ? modePayload
            : null;
      } catch (_err) {
        windowNamePayload = null;
      }
      const requiredKeys = [
        "v",
        "saved_at",
        "mode_key",
        "board_width",
        "board_height",
        "ruleset",
        "board",
        "score",
        "over",
        "won",
        "keep_playing",
        "duration_ms"
      ];
      const hasRequiredKeys =
        !!parsed &&
        requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(parsed, key));
      return {
        hasManager: true,
        hasSaveFunction: true,
        storageKey,
        hasRaw: typeof raw === "string" && raw.length > 0,
        hasRequiredKeys,
        boardIsArray: !!parsed && Array.isArray(parsed.board),
        windowNameHasTimerSnapshot:
          !!windowNamePayload &&
          Object.prototype.hasOwnProperty.call(windowNamePayload, "timer_fixed_rows")
      };
    });

    expect(snapshot.hasManager).toBe(true);
    expect(snapshot.hasSaveFunction).toBe(true);
    expect(snapshot.hasRaw).toBe(true);
    expect(snapshot.hasRequiredKeys).toBe(true);
    expect(snapshot.boardIsArray).toBe(true);
    expect(snapshot.windowNameHasTimerSnapshot).toBe(true);
  });

  test("saved-state restore rejects version-mismatch payload", async ({ page }) => {
    await page.addInitScript(() => {
      const modeKey = "practice";
      const payload = {
        v: 999,
        saved_at: Date.now(),
        mode_key: modeKey,
        board_width: 4,
        board_height: 4,
        ruleset: "standard",
        board: [
          [2, 4, 8, 16],
          [32, 64, 128, 256],
          [512, 1024, 2, 4],
          [8, 16, 32, 64]
        ],
        score: 4096,
        over: false,
        won: false,
        keep_playing: false,
        duration_ms: 2345
      };
      const raw = JSON.stringify(payload);
      window.localStorage.setItem("savedGameStateByMode:v1:" + modeKey, raw);
      window.localStorage.setItem("savedGameStateLiteByMode:v1:" + modeKey, raw);
    });

    const response = await page.goto("/Practice_board.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Practice response should exist").not.toBeNull();
    expect(response?.ok(), "Practice response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForWindowCondition(
      page,
      () => Boolean((window as any).game_manager),
      12_000
    );

    const snapshot = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      const modeKey = String(manager?.modeKey || manager?.mode || "practice");
      const fullKey = "savedGameStateByMode:v1:" + modeKey;
      const liteKey = "savedGameStateLiteByMode:v1:" + modeKey;
      const fullRaw = window.localStorage.getItem(fullKey);
      const liteRaw = window.localStorage.getItem(liteKey);
      const parsePayload = (raw: string | null): Record<string, unknown> | null => {
        if (typeof raw !== "string" || raw.length === 0) return null;
        try {
          const parsed = JSON.parse(raw);
          return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
        } catch (_err) {
          return null;
        }
      };
      const fullParsed = parsePayload(fullRaw);
      const liteParsed = parsePayload(liteRaw);
      return {
        modeKey,
        managerScore: Number(manager?.score || 0),
        fullStillVersionMismatch:
          !!fullParsed && Number((fullParsed as any).v) === 999,
        liteStillVersionMismatch:
          !!liteParsed && Number((liteParsed as any).v) === 999
      };
    });

    expect(snapshot.managerScore).not.toBe(4096);
    expect(snapshot.fullStillVersionMismatch).toBe(false);
    expect(snapshot.liteStillVersionMismatch).toBe(false);
  });

  test("saved-state restore rejects malformed board payload", async ({ page }) => {
    await page.addInitScript(() => {
      const modeKey = "practice";
      const payload = {
        v: 1,
        saved_at: Date.now(),
        mode_key: modeKey,
        board_width: 4,
        board_height: 4,
        ruleset: "standard",
        board: "not-an-array",
        score: 8192,
        over: false,
        won: false,
        keep_playing: false,
        duration_ms: 3456
      };
      const raw = JSON.stringify(payload);
      window.localStorage.setItem("savedGameStateByMode:v1:" + modeKey, raw);
      window.localStorage.setItem("savedGameStateLiteByMode:v1:" + modeKey, raw);
    });

    const response = await page.goto("/Practice_board.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Practice response should exist").not.toBeNull();
    expect(response?.ok(), "Practice response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForWindowCondition(
      page,
      () => Boolean((window as any).game_manager),
      12_000
    );

    const snapshot = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      const modeKey = String(manager?.modeKey || manager?.mode || "practice");
      const fullKey = "savedGameStateByMode:v1:" + modeKey;
      const liteKey = "savedGameStateLiteByMode:v1:" + modeKey;
      const fullRaw = window.localStorage.getItem(fullKey);
      const liteRaw = window.localStorage.getItem(liteKey);
      const parsePayload = (raw: string | null): Record<string, unknown> | null => {
        if (typeof raw !== "string" || raw.length === 0) return null;
        try {
          const parsed = JSON.parse(raw);
          return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
        } catch (_err) {
          return null;
        }
      };
      const fullParsed = parsePayload(fullRaw);
      const liteParsed = parsePayload(liteRaw);
      const isMalformedBoard = (value: Record<string, unknown> | null): boolean =>
        !!value && !Array.isArray((value as any).board);
      return {
        managerScore: Number(manager?.score || 0),
        fullStillMalformedBoard: isMalformedBoard(fullParsed),
        liteStillMalformedBoard: isMalformedBoard(liteParsed)
      };
    });

    expect(snapshot.managerScore).not.toBe(8192);
    expect(snapshot.fullStillMalformedBoard).toBe(false);
    expect(snapshot.liteStillMalformedBoard).toBe(false);
  });

  test("ranked play modes ignore injected local saved-state payloads", async ({ page }) => {
    await page.addInitScript(() => {
      const modeKey = "standard_4x4_pow2_no_undo";
      const payload = {
        v: 1,
        saved_at: Date.now(),
        terminated: false,
        mode_key: modeKey,
        board_width: 4,
        board_height: 4,
        ruleset: "pow2",
        board: [
          [1024, 1024, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        score: 424242,
        over: false,
        won: false,
        keep_playing: false,
        duration_ms: 777,
        has_game_started: true
      };
      const raw = JSON.stringify(payload);
      window.localStorage.setItem("savedGameStateByMode:v1:" + modeKey, raw);
      window.localStorage.setItem("savedGameStateLiteByMode:v1:" + modeKey, raw);
      window.localStorage.setItem(
        "savedGameStateSyncByMode:v1:" + modeKey,
        JSON.stringify({
          v: 1,
          mode_key: modeKey,
          source_client_id: "smoke_test",
          saved_at: payload.saved_at,
          state: payload
        })
      );
      window.name =
        "__gm_saved_state_v1__=" + encodeURIComponent(JSON.stringify({ [modeKey]: payload }));
    });

    const response = await page.goto("/play.html?mode=standard_4x4_pow2_no_undo", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Ranked play response should exist").not.toBeNull();
    expect(response?.ok(), "Ranked play response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForWindowCondition(page, () => Boolean((window as any).game_manager), 12_000);

    const snapshot = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      const board =
        typeof manager.getFinalBoardMatrix === "function"
          ? manager.getFinalBoardMatrix()
          : manager.grid.cells.map((column: Array<{ value: number } | null>) =>
              column.map((cell) => (cell ? cell.value : 0))
            );
      return {
        clientRecordId: String(manager.clientRecordId || ""),
        score: Number(manager.score || 0),
        board
      };
    });

    expect(snapshot.score).not.toBe(424242);
    expect(snapshot.board).not.toEqual([
      [1024, 1024, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ]);
  });

  test("ranked play modes restore verified cloud checkpoints instead of local injected payloads", async ({
    page
  }) => {
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
      window.localStorage.setItem("2048_auth_userId_v1", "1");
      window.localStorage.setItem("2048_auth_nickname_v1", "SmokeUser");
    });

    const firstResponse = await page.goto("/play.html?mode=standard_4x4_pow2_no_undo", {
      waitUntil: "domcontentloaded"
    });
    expect(firstResponse, "Initial ranked play response should exist").not.toBeNull();
    expect(firstResponse?.ok(), "Initial ranked play response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForWindowCondition(page, () => Boolean((window as any).game_manager), 12_000);
    await page.waitForFunction(
      () => {
        const manager = (window as any).game_manager;
        return !!manager && manager.rankCheckpointRestorePending !== true;
      },
      { timeout: 12_000 }
    );

    const liveSnapshot = await page.evaluate(async () => {
      const manager = (window as any).game_manager;
      manager.move(2);
      manager.move(0);
      manager.move(2);
      await new Promise((resolve) => window.setTimeout(resolve, 1800));
      const board =
        typeof manager.getFinalBoardMatrix === "function"
          ? manager.getFinalBoardMatrix()
          : manager.grid.cells.map((column: Array<{ value: number } | null>) =>
              column.map((cell) => (cell ? cell.value : 0))
            );
      return {
        clientRecordId: String(manager.clientRecordId || ""),
        replayString: typeof manager.serialize === "function" ? String(manager.serialize() || "") : "",
        score: Number(manager.score || 0),
        board
      };
    });

    await expect
      .poll(() => checkpointData, {
        timeout: 12_000
      })
      .not.toBeNull();

    await page.addInitScript(() => {
      const modeKey = "standard_4x4_pow2_no_undo";
      const payload = {
        v: 1,
        saved_at: Date.now(),
        terminated: false,
        mode_key: modeKey,
        board_width: 4,
        board_height: 4,
        ruleset: "pow2",
        board: [
          [1024, 1024, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        score: 424242,
        over: false,
        won: false,
        keep_playing: false,
        duration_ms: 777,
        has_game_started: true
      };
      const raw = JSON.stringify(payload);
      window.localStorage.setItem("savedGameStateByMode:v1:" + modeKey, raw);
      window.localStorage.setItem("savedGameStateLiteByMode:v1:" + modeKey, raw);
      window.name =
        "__gm_saved_state_v1__=" + encodeURIComponent(JSON.stringify({ [modeKey]: payload }));
    });

    const reloadResponse = await page.reload({ waitUntil: "domcontentloaded" });
    expect(reloadResponse, "Reloaded ranked play response should exist").not.toBeNull();
    expect(reloadResponse?.ok(), "Reloaded ranked play response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForWindowCondition(page, () => Boolean((window as any).game_manager), 12_000);
    await page.waitForTimeout(3000);

    const restoredSnapshot = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      const board =
        typeof manager.getFinalBoardMatrix === "function"
          ? manager.getFinalBoardMatrix()
          : manager.grid.cells.map((column: Array<{ value: number } | null>) =>
            column.map((cell) => (cell ? cell.value : 0))
            );
      return {
        clientRecordId: String(manager.clientRecordId || ""),
        restoreError: String((manager as any).lastRankedCheckpointRestoreError || ""),
        restorePending: !!(manager as any).rankCheckpointRestorePending,
        restoreNeeded: !!(manager as any).needsRankedCheckpointRestore,
        score: Number(manager.score || 0),
        board
      };
    });

    expect(restoredSnapshot.clientRecordId).toBe(liveSnapshot.clientRecordId);
    expect(restoredSnapshot.board).toEqual(liveSnapshot.board);
    expect(restoredSnapshot.score).toBe(liveSnapshot.score);
    expect(restoredSnapshot.restoreError).toBe("");
    expect(restoredSnapshot.restorePending).toBe(false);
    expect(restoredSnapshot.restoreNeeded).toBe(false);
    expect(restoredSnapshot.score).not.toBe(424242);
  });
});
