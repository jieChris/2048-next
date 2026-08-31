import { expect, test } from "@playwright/test";
import { mockAcceptedBetaAccess } from "./support/beta-access";
import { installRankedSessionForMode } from "./support/ranked-session";
import { waitForWindowCondition } from "./support/runtime-ready";

test.describe("Legacy Multi-Page Smoke", () => {
  test.beforeEach(async ({ page }) => {
    await mockAcceptedBetaAccess(page);
  });

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

  test("restart immediately persists the fresh opening seed for reload safety", async ({
    page
  }) => {
    await installRankedSessionForMode(page, "standard_4x4_pow2_no_undo", {
      clearSavedState: true,
      confirmRestart: true,
      resetStorage: true,
      seed: 111,
      token: "restart-seed-token"
    });

    const response = await page.goto("/2048.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Game response should exist").not.toBeNull();
    expect(response?.ok(), "Game response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForWindowCondition(
      page,
      () => Boolean((window as any).game_manager),
      12_000
    );

    const snapshot = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      manager.restart();
      const modeKey = String(manager.modeKey || manager.mode || "standard_4x4_pow2_no_undo");
      const raw = window.localStorage.getItem("savedGameStateByMode:v1:" + modeKey);
      let saved: Record<string, unknown> | null = null;
      try {
        saved = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
      } catch (_err) {
        saved = null;
      }
      const board =
        typeof manager.getFinalBoardMatrix === "function"
          ? manager.getFinalBoardMatrix()
          : null;
      return {
        blocked: !!manager.rankedSetupBlockedUntilSessionReady,
        seed: manager.initialSeed,
        board,
        savedSeed: saved ? saved.initial_seed : null,
        savedBoard: saved ? saved.board : null
      };
    });

    expect(snapshot.blocked).toBe(false);
    expect(snapshot.savedSeed).toBe(snapshot.seed);
    expect(snapshot.savedBoard).toEqual(snapshot.board);
  });

  test("canceling the keyboard restart dialog keeps the saved game for reload", async ({
    page
  }) => {
    await page.addInitScript(() => {
      const marker = "__smoke_restart_cancel_prefetch_initialized__";
      const modeKey = "standard_4x4_pow2_no_undo";
      const nowSec = Math.floor(Date.now() / 1000);
      window.localStorage.setItem("2048_auth_token_v1", "restart-cancel-auth-token");
      window.localStorage.setItem("2048_auth_userId_v1", "42");
      window.localStorage.setItem("2048_auth_nickname_v1", "Smoke");
      if (window.sessionStorage.getItem(marker)) return;
      window.localStorage.clear();
      window.name = "";
      window.sessionStorage.setItem(marker, "1");
      window.localStorage.setItem("2048_auth_token_v1", "restart-cancel-auth-token");
      window.localStorage.setItem("2048_auth_userId_v1", "42");
      window.localStorage.setItem("2048_auth_nickname_v1", "Smoke");
      window.localStorage.setItem(
        "ranked_session_active:v1:" + modeKey,
        JSON.stringify({
          mode_key: modeKey,
          challenge_id: "restart-cancel-active",
          seed: 119,
          ranked_session_token: "restart-cancel-active-token",
          issued_at: nowSec - 60,
          exp: nowSec + 3600,
          owner_user_id: "42"
        })
      );
      window.localStorage.setItem(
        "ranked_session_prefetch:v1:" + modeKey,
        JSON.stringify({
          mode_key: modeKey,
          challenge_id: "restart-cancel-prefetch",
          seed: 120,
          ranked_session_token: "restart-cancel-prefetch-token",
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
    await waitForWindowCondition(
      page,
      () =>
        Boolean((window as any).game_manager) && typeof (window as any).saveGameState === "function",
      12_000
    );

    const beforeCancel = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      const save = (window as any).saveGameState;
      const modeKey = String(manager.modeKey || manager.mode || "standard_4x4_pow2_no_undo");
      const boardSnapshot = () =>
        typeof manager.getFinalBoardMatrix === "function"
          ? manager.getFinalBoardMatrix()
          : null;
      const initialBoardJson = JSON.stringify(boardSnapshot());
      for (const direction of [0, 1, 2, 3]) {
        manager.move(direction);
        if (JSON.stringify(boardSnapshot()) !== initialBoardJson) break;
      }
      save(manager, { force: true, forceFull: true });
      const savedRaw = window.localStorage.getItem("savedGameStateByMode:v1:" + modeKey);
      return {
        board: boardSnapshot(),
        score: Number(manager.score || 0),
        savedRaw
      };
    });

    expect(beforeCancel.savedRaw).toEqual(expect.any(String));

    await page.keyboard.press("KeyR");
    await expect(page.locator("#game-dialog-overlay.is-open")).toBeVisible();
    await page.locator("#game-dialog-cancel").click();
    await expect(page.locator("#game-dialog-overlay.is-open")).toBeHidden();

    const afterCancel = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      const modeKey = String(manager.modeKey || manager.mode || "standard_4x4_pow2_no_undo");
      return {
        board:
          typeof manager.getFinalBoardMatrix === "function"
            ? manager.getFinalBoardMatrix()
            : null,
        score: Number(manager.score || 0),
        savedRaw: window.localStorage.getItem("savedGameStateByMode:v1:" + modeKey)
      };
    });

    expect(afterCancel.board).toEqual(beforeCancel.board);
    expect(afterCancel.score).toBe(beforeCancel.score);
    expect(afterCancel.savedRaw).toBe(beforeCancel.savedRaw);

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForWindowCondition(page, () => Boolean((window as any).game_manager), 12_000);

    const afterReload = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      return {
        board:
          typeof manager.getFinalBoardMatrix === "function"
            ? manager.getFinalBoardMatrix()
            : null,
        score: Number(manager.score || 0)
      };
    });

    expect(afterReload.board).toEqual(beforeCancel.board);
    expect(afterReload.score).toBe(beforeCancel.score);
  });

  test("ranked setup without a legal seed clears visible tiles and keeps movement blocked", async ({
    page
  }) => {
    await installRankedSessionForMode(page, "standard_4x4_pow2_no_undo", {
      confirmRestart: true,
      resetStorage: true,
      seed: 222,
      token: "blocked-restart-initial-token"
    });

    const response = await page.goto("/2048.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Game response should exist").not.toBeNull();
    expect(response?.ok(), "Game response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForWindowCondition(page, () => Boolean((window as any).game_manager), 12_000);

    await page.waitForFunction(() => document.querySelectorAll(".tile-container .tile").length > 0, null, {
      timeout: 12_000
    });

    const snapshot = await page.evaluate(async () => {
      const manager = (window as any).game_manager;
      const modeKey = "standard_4x4_pow2_no_undo";
      window.localStorage.removeItem("ranked_session_active:v1:" + modeKey);
      window.localStorage.removeItem("ranked_session_prefetch:v1:" + modeKey);
      (window as any).GAME_CHALLENGE_CONTEXT = null;
      const beforeMoveHistoryLength = Array.isArray(manager.moveHistory) ? manager.moveHistory.length : 0;
      manager.setup(undefined, { disableStateRestore: true });
      manager.move(0);
      return {
        blocked: !!manager.rankedSetupBlockedUntilSessionReady,
        gridIsNull: manager.grid === null,
        moveHistoryLength: Array.isArray(manager.moveHistory) ? manager.moveHistory.length : 0,
        beforeMoveHistoryLength,
        tileCount: document.querySelectorAll(".tile-container .tile").length
      };
    });

    expect(snapshot.blocked).toBe(true);
    expect(snapshot.gridIsNull).toBe(true);
    expect(snapshot.moveHistoryLength).toBe(snapshot.beforeMoveHistoryLength);
    expect(snapshot.tileCount).toBe(0);
  });

  test("accepted beta ranked setup without an issued seed still creates a non-submittable local board", async ({
    page
  }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      (window as any).GAME_CHALLENGE_CONTEXT = null;
    });
    await page.route("**/api/ranked-session/start", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ success: false, code: "SMOKE_SEED_DOWN" })
      });
    });

    const response = await page.goto("/play.html?mode_key=board_3x3_pow2_no_undo", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Game response should exist").not.toBeNull();
    expect(response?.ok(), "Game response should be 2xx").toBeTruthy();
    await waitForWindowCondition(page, () => Boolean((window as any).game_manager), 12_000);

    const snapshot = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      return {
        blocked: !!manager.rankedSetupBlockedUntilSessionReady,
        challengeId: manager.challengeId || null,
        rankedSessionToken: manager.rankedSessionToken || "",
        hasGrid: !!manager.grid,
        modeKey: manager.modeKey,
        tileCount: document.querySelectorAll(".tile-container .tile").length
      };
    });

    expect(snapshot).toEqual({
      blocked: false,
      challengeId: null,
      rankedSessionToken: "",
      hasGrid: true,
      modeKey: "board_3x3_pow2_no_undo",
      tileCount: 2
    });
  });

  test("authenticated non-4x4 ranked setup without an issued seed still creates a non-submittable local board", async ({
    page
  }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.localStorage.setItem("2048_auth_token_v1", "smoke_token");
      window.localStorage.setItem("2048_auth_userId_v1", "42");
      window.localStorage.setItem("2048_auth_nickname_v1", "Smoke");
      (window as any).GAME_CHALLENGE_CONTEXT = null;
    });
    await page.route("**/api/ranked-session/start", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ success: false, code: "SMOKE_SEED_DOWN" })
      });
    });

    const response = await page.goto("/play.html?mode_key=board_3x3_pow2_no_undo", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Game response should exist").not.toBeNull();
    expect(response?.ok(), "Game response should be 2xx").toBeTruthy();
    await waitForWindowCondition(page, () => Boolean((window as any).game_manager), 12_000);

    const snapshot = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      return {
        blocked: !!manager.rankedSetupBlockedUntilSessionReady,
        challengeId: manager.challengeId || null,
        rankedSessionToken: manager.rankedSessionToken || "",
        hasGrid: !!manager.grid,
        modeKey: manager.modeKey,
        tileCount: document.querySelectorAll(".tile-container .tile").length
      };
    });

    expect(snapshot).toEqual({
      blocked: false,
      challengeId: null,
      rankedSessionToken: "",
      hasGrid: true,
      modeKey: "board_3x3_pow2_no_undo",
      tileCount: 2
    });
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

  test("non-practice replay session survives reload and can keep exporting replay", async ({
    page
  }) => {
    await installRankedSessionForMode(page, "classic_4x4_pow2_undo", {
      clearSavedState: true,
      seed: 212,
      token: "classic-replay-token"
    });

    await page.addInitScript(() => {
      const modeKey = "classic_4x4_pow2_undo";
      window.localStorage.removeItem("savedGameStateByMode:v1:" + modeKey);
      window.localStorage.removeItem("savedGameStateLiteByMode:v1:" + modeKey);
      window.name = "";
    });

    const response = await page.goto("/undo_2048.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Undo response should exist").not.toBeNull();
    expect(response?.ok(), "Undo response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForWindowCondition(
      page,
      () =>
        Boolean((window as any).game_manager) && typeof (window as any).saveGameState === "function",
      12_000
    );

    await page.waitForFunction(
      () => {
        const manager = (window as any).game_manager;
        return (
          !!manager &&
          manager.rankedSetupBlockedUntilSessionReady !== true &&
          manager.rankCheckpointRestorePending !== true &&
          manager.needsRankedCheckpointRestore !== true
        );
      },
      { timeout: 12_000 }
    );

    const beforeReload = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      const save = (window as any).saveGameState;
      const modeKey = String(manager.modeKey || manager.mode || "classic_4x4_pow2_undo");
      const trySuccessfulMove = (): boolean => {
        const startLength = Array.isArray(manager.moveHistory) ? manager.moveHistory.length : 0;
        for (const direction of [0, 1, 2, 3]) {
          manager.move(direction);
          const nextLength = Array.isArray(manager.moveHistory) ? manager.moveHistory.length : 0;
          if (nextLength > startLength) return true;
        }
        return false;
      };

      const movedFirst = trySuccessfulMove();
      const movedSecond = trySuccessfulMove();
      save(manager, { force: true });

      const board =
        typeof manager.getFinalBoardMatrix === "function"
          ? manager.getFinalBoardMatrix()
          : manager.grid.cells.map((column: Array<{ value: number } | null>) =>
              column.map((cell) => (cell ? cell.value : 0))
            );
      const replay = typeof manager.serialize === "function" ? String(manager.serialize() || "") : "";
      const savedRaw = window.localStorage.getItem("savedGameStateByMode:v1:" + modeKey);
      return {
        board,
        replay,
        movedFirst,
        movedSecond,
        moveHistoryLength: Array.isArray(manager.moveHistory) ? manager.moveHistory.length : 0,
        hasSavedPayload: typeof savedRaw === "string" && savedRaw.length > 0
      };
    });

    expect(beforeReload.hasSavedPayload).toBe(true);
    expect(beforeReload.movedFirst).toBe(true);
    expect(beforeReload.movedSecond).toBe(true);
    expect(beforeReload.moveHistoryLength).toBeGreaterThan(0);
    expect(beforeReload.replay.startsWith("REPLAY_v1RPL_B64_")).toBe(true);

    const reloadResponse = await page.reload({ waitUntil: "domcontentloaded" });
    expect(reloadResponse, "Reloaded undo response should exist").not.toBeNull();
    expect(reloadResponse?.ok(), "Reloaded undo response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForWindowCondition(page, () => Boolean((window as any).game_manager), 12_000);
    await page.waitForFunction(
      () => {
        const manager = (window as any).game_manager;
        return (
          !!manager &&
          manager.rankedSetupBlockedUntilSessionReady !== true &&
          manager.rankCheckpointRestorePending !== true &&
          manager.needsRankedCheckpointRestore !== true
        );
      },
      { timeout: 12_000 }
    );

    const afterReload = await page.evaluate(() => {
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
      const board =
        typeof manager.getFinalBoardMatrix === "function"
          ? manager.getFinalBoardMatrix()
          : manager.grid.cells.map((column: Array<{ value: number } | null>) =>
              column.map((cell) => (cell ? cell.value : 0))
            );
      const replayBeforeNextMove =
        typeof manager.serialize === "function" ? String(manager.serialize() || "") : "";
      const movedAgain = trySuccessfulMove();
      const replayAfterNextMove =
        typeof manager.serialize === "function" ? String(manager.serialize() || "") : "";
      return {
        board,
        replayBeforeNextMove,
        replayAfterNextMove,
        movedAgain,
        moveHistoryLength: Array.isArray(manager.moveHistory) ? manager.moveHistory.length : 0
      };
    });

    expect(afterReload.board).toEqual(beforeReload.board);
    expect(afterReload.replayBeforeNextMove.startsWith("REPLAY_v1RPL_B64_")).toBe(true);
    expect(afterReload.moveHistoryLength).toBeGreaterThanOrEqual(beforeReload.moveHistoryLength);
    expect(afterReload.movedAgain).toBe(true);
    expect(afterReload.moveHistoryLength).toBeGreaterThan(beforeReload.moveHistoryLength);
    expect(afterReload.replayAfterNextMove.startsWith("REPLAY_v1RPL_B64_")).toBe(true);
  });

  test("ranked play modes ignore injected local saved-state payloads", async ({ page }) => {
    await installRankedSessionForMode(page, "standard_4x4_pow2_no_undo", {
      seed: 313,
      token: "ignore-local-save-token"
    });

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

  test("ranked play modes restore matching local saved-state on reload", async ({
    page
  }) => {
    const modeKey = "standard_4x4_pow2_no_undo";

    await page.route("**/api/ranked-checkpoint**", async (route) => {
      const request = route.request();
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
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          verified: true,
          data: null
        })
      });
    });

    await page.route("**/api/ranked-session/start", async (route) => {
      const nowSec = Math.floor(Date.now() / 1000);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            mode_key: modeKey,
            challenge_id: "resume-prefetch",
            seed: 909,
            ranked_session_token: "resume-prefetch-token",
            issued_at: nowSec,
            exp: nowSec + 3600,
            spawn_sequence_version: 2
          }
        })
      });
    });

    await page.addInitScript((activeModeKey) => {
      const nowSec = Math.floor(Date.now() / 1000);
      window.localStorage.setItem("2048_auth_token_v1", "smoke_token");
      window.localStorage.setItem("2048_auth_userId_v1", "1");
      window.localStorage.setItem("2048_auth_nickname_v1", "SmokeUser");
      window.localStorage.setItem(
        "ranked_session_active:v1:" + activeModeKey,
        JSON.stringify({
          mode_key: activeModeKey,
          challenge_id: "resume-active",
          seed: 707,
          ranked_session_token: "resume-active-token",
          issued_at: nowSec,
          exp: nowSec + 3600,
          owner_user_id: "1"
        })
      );
      if (!window.sessionStorage.getItem("__smoke_ranked_saved_state_resume_reset__")) {
        window.localStorage.removeItem("savedGameStateByMode:v1:" + activeModeKey);
        window.localStorage.removeItem("savedGameStateLiteByMode:v1:" + activeModeKey);
        window.name = "";
        window.sessionStorage.setItem("__smoke_ranked_saved_state_resume_reset__", "1");
      }
    }, modeKey);

    const response = await page.goto("/play.html?mode=standard_4x4_pow2_no_undo", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Initial ranked play response should exist").not.toBeNull();
    expect(response?.ok(), "Initial ranked play response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForWindowCondition(page, () => Boolean((window as any).game_manager), 12_000);

    const liveSnapshot = await page.evaluate(() => {
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
      const movedFirst = trySuccessfulMove();
      const movedSecond = trySuccessfulMove();
      const save = (window as any).saveGameState;
      if (typeof save === "function") save(manager, { force: true });
      const mode = String(manager.modeKey || manager.mode || "standard_4x4_pow2_no_undo");
      const raw = window.localStorage.getItem("savedGameStateByMode:v1:" + mode);
      let saved: Record<string, unknown> | null = null;
      try {
        saved = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
      } catch (_err) {
        saved = null;
      }
      return {
        board: manager.getFinalBoardMatrix(),
        score: Number(manager.score || 0),
        seed: Number(manager.initialSeed),
        rankedSessionToken: String(manager.rankedSessionToken || ""),
        savedRankedSessionToken: String(saved?.ranked_session_token || ""),
        savedChallengeId: String(saved?.challenge_id || ""),
        movedFirst,
        movedSecond,
        moveHistoryLength: Array.isArray(manager.moveHistory) ? manager.moveHistory.length : 0,
        hasSavedPayload: typeof raw === "string" && raw.length > 0
      };
    });

    expect(liveSnapshot.hasSavedPayload).toBe(true);
    expect(liveSnapshot.movedFirst).toBe(true);
    expect(liveSnapshot.movedSecond).toBe(true);
    expect(liveSnapshot.moveHistoryLength).toBeGreaterThan(0);
    expect(liveSnapshot.seed).toBe(707);
    expect(liveSnapshot.rankedSessionToken).toBe("resume-active-token");
    expect(liveSnapshot.savedRankedSessionToken).toBe("resume-active-token");
    expect(liveSnapshot.savedChallengeId).toBe("resume-active");

    const reloadResponse = await page.reload({ waitUntil: "domcontentloaded" });
    expect(reloadResponse, "Reloaded ranked play response should exist").not.toBeNull();
    expect(reloadResponse?.ok(), "Reloaded ranked play response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForWindowCondition(page, () => Boolean((window as any).game_manager), 12_000);
    await page.waitForFunction(
      () => {
        const manager = (window as any).game_manager;
        return (
          !!manager &&
          manager.rankCheckpointRestorePending !== true &&
          manager.needsRankedCheckpointRestore !== true
        );
      },
      { timeout: 12_000 }
    );

    const restoredSnapshot = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      return {
        board: manager.getFinalBoardMatrix(),
        score: Number(manager.score || 0),
        seed: Number(manager.initialSeed),
        rankedSessionToken: String(manager.rankedSessionToken || ""),
        moveHistoryLength: Array.isArray(manager.moveHistory) ? manager.moveHistory.length : 0
      };
    });

    expect(restoredSnapshot.board).toEqual(liveSnapshot.board);
    expect(restoredSnapshot.score).toBe(liveSnapshot.score);
    expect(restoredSnapshot.seed).toBe(liveSnapshot.seed);
    expect(restoredSnapshot.rankedSessionToken).toBe(liveSnapshot.rankedSessionToken);
    expect(restoredSnapshot.moveHistoryLength).toBeGreaterThanOrEqual(liveSnapshot.moveHistoryLength);
  });

  test("ranked play modes keep local saved progress when the active ranked session expires", async ({
    page
  }) => {
    const modeKey = "standard_4x4_pow2_no_undo";
    let sessionRequestCount = 0;

    await page.route("**/api/ranked-checkpoint**", async (route) => {
      const request = route.request();
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
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          verified: true,
          data: null
        })
      });
    });

    await page.route("**/api/ranked-session/start", async (route) => {
      sessionRequestCount += 1;
      const nowSec = Math.floor(Date.now() / 1000);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            mode_key: modeKey,
            challenge_id: `expired-local-prefetch-${sessionRequestCount}`,
            seed: 800 + sessionRequestCount,
            ranked_session_token: `expired-local-prefetch-token-${sessionRequestCount}`,
            issued_at: nowSec,
            exp: nowSec + 3600,
            spawn_sequence_version: 2
          }
        })
      });
    });

    await page.addInitScript((activeModeKey) => {
      const nowSec = Math.floor(Date.now() / 1000);
      window.localStorage.setItem("2048_auth_token_v1", "smoke_token");
      window.localStorage.setItem("2048_auth_userId_v1", "1");
      window.localStorage.setItem("2048_auth_nickname_v1", "SmokeUser");
      if (!window.sessionStorage.getItem("__smoke_ranked_expired_saved_state_resume_reset__")) {
        window.localStorage.setItem(
          "ranked_session_active:v1:" + activeModeKey,
          JSON.stringify({
            mode_key: activeModeKey,
            challenge_id: "expired-local-active",
            seed: 717,
            ranked_session_token: "expired-local-active-token",
            issued_at: nowSec,
            exp: nowSec + 3600,
            owner_user_id: "1"
          })
        );
        window.localStorage.removeItem("ranked_session_prefetch:v1:" + activeModeKey);
        window.localStorage.removeItem("savedGameStateByMode:v1:" + activeModeKey);
        window.localStorage.removeItem("savedGameStateLiteByMode:v1:" + activeModeKey);
        window.name = "";
        window.sessionStorage.setItem("__smoke_ranked_expired_saved_state_resume_reset__", "1");
      }
    }, modeKey);

    const response = await page.goto(`/play.html?mode_key=${encodeURIComponent(modeKey)}`, {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Initial ranked play response should exist").not.toBeNull();
    expect(response?.ok(), "Initial ranked play response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForWindowCondition(page, () => Boolean((window as any).game_manager), 12_000);

    const liveSnapshot = await page.evaluate((activeModeKey) => {
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
      const movedFirst = trySuccessfulMove();
      const movedSecond = trySuccessfulMove();
      const save = (window as any).saveGameState;
      if (typeof save === "function") save(manager, { force: true });
      const raw = window.localStorage.getItem("savedGameStateByMode:v1:" + activeModeKey);
      const nowSec = Math.floor(Date.now() / 1000);
      window.localStorage.setItem(
        "ranked_session_active:v1:" + activeModeKey,
        JSON.stringify({
          mode_key: activeModeKey,
          challenge_id: "expired-local-active",
          seed: 717,
          ranked_session_token: "expired-local-active-token",
          issued_at: nowSec - 7200,
          exp: nowSec - 1,
          owner_user_id: "1"
        })
      );
      window.localStorage.removeItem("ranked_session_prefetch:v1:" + activeModeKey);
      return {
        board: manager.getFinalBoardMatrix(),
        score: Number(manager.score || 0),
        seed: Number(manager.initialSeed),
        rankedSessionToken: String(manager.rankedSessionToken || ""),
        movedFirst,
        movedSecond,
        moveHistoryLength: Array.isArray(manager.moveHistory) ? manager.moveHistory.length : 0,
        hasSavedPayload: typeof raw === "string" && raw.length > 0
      };
    }, modeKey);

    expect(liveSnapshot.hasSavedPayload).toBe(true);
    expect(liveSnapshot.movedFirst).toBe(true);
    expect(liveSnapshot.movedSecond).toBe(true);
    expect(liveSnapshot.moveHistoryLength).toBeGreaterThan(0);
    expect(liveSnapshot.seed).toBe(717);
    expect(liveSnapshot.rankedSessionToken).toBe("expired-local-active-token");

    const reloadResponse = await page.reload({ waitUntil: "domcontentloaded" });
    expect(reloadResponse, "Reloaded ranked play response should exist").not.toBeNull();
    expect(reloadResponse?.ok(), "Reloaded ranked play response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForWindowCondition(page, () => Boolean((window as any).game_manager), 12_000);
    await page.waitForFunction(
      () => {
        const manager = (window as any).game_manager;
        return (
          !!manager &&
          manager.rankCheckpointRestorePending !== true &&
          manager.needsRankedCheckpointRestore !== true
        );
      },
      { timeout: 12_000 }
    );

    const restoredSnapshot = await page.evaluate((activeModeKey) => {
      const manager = (window as any).game_manager;
      const activeRaw = window.localStorage.getItem("ranked_session_active:v1:" + activeModeKey);
      let active: Record<string, unknown> | null = null;
      try {
        active = activeRaw ? (JSON.parse(activeRaw) as Record<string, unknown>) : null;
      } catch (_err) {
        active = null;
      }
      const prefetchRaw = window.localStorage.getItem("ranked_session_prefetch:v1:" + activeModeKey);
      let prefetch: Record<string, unknown> | null = null;
      try {
        prefetch = prefetchRaw ? (JSON.parse(prefetchRaw) as Record<string, unknown>) : null;
      } catch (_err) {
        prefetch = null;
      }
      return {
        board: manager.getFinalBoardMatrix(),
        score: Number(manager.score || 0),
        seed: Number(manager.initialSeed),
        rankedSessionToken: String(manager.rankedSessionToken || ""),
        moveHistoryLength: Array.isArray(manager.moveHistory) ? manager.moveHistory.length : 0,
        hasSavedPayload: !!window.localStorage.getItem("savedGameStateByMode:v1:" + activeModeKey),
        activeRaw,
        activeToken: String(active?.ranked_session_token || ""),
        activeSeed: Number(active?.seed || 0),
        prefetchedToken: String(prefetch?.ranked_session_token || "")
      };
    }, modeKey);

    expect(restoredSnapshot.board).toEqual(liveSnapshot.board);
    expect(restoredSnapshot.score).toBe(liveSnapshot.score);
    expect(restoredSnapshot.seed).toBe(liveSnapshot.seed);
    expect(restoredSnapshot.rankedSessionToken).toBe(liveSnapshot.rankedSessionToken);
    expect(restoredSnapshot.moveHistoryLength).toBeGreaterThanOrEqual(liveSnapshot.moveHistoryLength);
    expect(restoredSnapshot.hasSavedPayload).toBe(true);
    expect(restoredSnapshot.activeRaw).not.toBeNull();
    expect(restoredSnapshot.activeToken).toBe("expired-local-active-token");
    expect(restoredSnapshot.activeSeed).toBe(717);
    expect(restoredSnapshot.prefetchedToken).toContain("expired-local-prefetch-token");
  });

  test("ranked play modes restore local checkpoint mirror instead of local injected payloads", async ({
    page
  }) => {
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
      window.localStorage.setItem("2048_auth_userId_v1", "1");
      window.localStorage.setItem("2048_auth_nickname_v1", "SmokeUser");
      window.localStorage.setItem(
        "ranked_session_active:v1:" + modeKey,
        JSON.stringify({
          mode_key: modeKey,
          challenge_id: "smoke-ranked-active",
          seed: 101,
          ranked_session_token: "smoke-ranked-token",
          issued_at: nowSec,
          exp: nowSec + 3600,
          owner_user_id: "1"
        })
      );
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
    await page.waitForFunction(
      () =>
        !!(window as any).OnlineLeaderboardRuntime &&
        (window as any).game_manager?.__onlineImmediateSubmitHooksBound === true,
      { timeout: 12_000 }
    );

    await page.evaluate(() => {
      const manager = (window as any).game_manager;
      manager.move(2);
      manager.move(0);
      manager.move(2);
    });
    await page.waitForFunction(
      () =>
        typeof window.localStorage.getItem(
          "ranked_checkpoint_local_mirror:v1:standard_4x4_pow2_no_undo"
        ) === "string",
      { timeout: 8_000 }
    );

    const liveSnapshot = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      const board =
        typeof manager.getFinalBoardMatrix === "function"
          ? manager.getFinalBoardMatrix()
          : manager.grid.cells.map((column: Array<{ value: number } | null>) =>
              column.map((cell) => (cell ? cell.value : 0))
            );
      return {
        clientRecordId: String(manager.clientRecordId || ""),
        replayString: typeof manager.serialize === "function" ? String(manager.serialize() || "") : "",
        hasLocalMirror:
          typeof window.localStorage.getItem("ranked_checkpoint_local_mirror:v1:standard_4x4_pow2_no_undo") ===
          "string",
        score: Number(manager.score || 0),
        board
      };
    });

    expect(liveSnapshot.hasLocalMirror).toBe(true);

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
    expect(checkpointRequests).not.toContain("POST");
    expect(checkpointRequests).not.toContain("GET");
  });

  test("ranked startup and restart ignore stale cloud checkpoint restore", async ({
    page
  }) => {
    const modeKey = "standard_4x4_pow2_no_undo";
    const now = Date.now();
    const checkpointRequests: string[] = [];
    const oldBoard = [
      [1024, 1024, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ];
    const checkpointData: Record<string, unknown> = {
      mode_key: modeKey,
      mode_bucket: "standard_no_undo",
      ranked_session_token: "old-ranked-token",
      client_record_id: "old-record-id",
      replay_string: "old-replay",
      duration_ms: 3000,
      updated_at: new Date(now - 60_000).toISOString(),
      ui_state: {
        saved_state: {
          v: 1,
          saved_at: now - 60_000,
          terminated: false,
          mode_key: modeKey,
          board_width: 4,
          board_height: 4,
          ruleset: "pow2",
          board: oldBoard,
          score: 424242,
          over: false,
          won: false,
          keep_playing: false,
          initial_seed: 101,
          seed: 101,
          duration_ms: 3000,
          has_game_started: true,
        },
      },
    };

    await page.route("**/api/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          token: "smoke_token",
          user: {
            id: 1,
            public_profile_id: 1,
            nickname: "SmokeUser",
          },
        }),
      });
    });

    await page.route("**/api/ranked-session/attempt", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, accepted: true }),
      });
    });

    await page.route("**/api/ranked-checkpoint**", async (route) => {
      const request = route.request();
      checkpointRequests.push(request.method());
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
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          verified: true,
          data: checkpointData
        })
      });
    });

    await page.route("**/api/ranked-session/start", async (route) => {
      const nowSec = Math.floor(Date.now() / 1000);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            mode_key: modeKey,
            challenge_id: "next-prefetch",
            seed: 303,
            ranked_session_token: "next-prefetch-token",
            issued_at: nowSec,
            exp: nowSec + 3600,
            spawn_sequence_version: 2
          }
        })
      });
    });

    await page.addInitScript(() => {
      const modeKey = "standard_4x4_pow2_no_undo";
      const nowSec = Math.floor(Date.now() / 1000);
      const activeSession = {
        mode_key: modeKey,
        challenge_id: "old-session",
        seed: 101,
        ranked_session_token: "old-ranked-token",
        issued_at: nowSec - 120,
        exp: nowSec + 3600,
        owner_user_id: "1"
      };
      const prefetchedSession = {
        mode_key: modeKey,
        challenge_id: "new-session",
        seed: 202,
        ranked_session_token: "new-ranked-token",
        issued_at: nowSec,
        exp: nowSec + 3600,
        owner_user_id: "1"
      };
      window.localStorage.setItem("2048_auth_token_v1", "smoke_token");
      window.localStorage.setItem("2048_auth_userId_v1", "1");
      window.localStorage.setItem("2048_auth_nickname_v1", "SmokeUser");
      window.localStorage.setItem("ranked_session_active:v1:" + modeKey, JSON.stringify(activeSession));
      window.localStorage.setItem("ranked_session_prefetch:v1:" + modeKey, JSON.stringify(prefetchedSession));
      window.confirm = () => true;
    });

    const response = await page.goto("/play.html?mode=standard_4x4_pow2_no_undo", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Initial ranked play response should exist").not.toBeNull();
    expect(response?.ok(), "Initial ranked play response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForWindowCondition(page, () => Boolean((window as any).game_manager), 12_000);
    await page.waitForFunction(
      () => {
        const manager = (window as any).game_manager;
        return (
          !!manager &&
          manager.rankCheckpointRestorePending !== true &&
          manager.needsRankedCheckpointRestore !== true
        );
      },
      { timeout: 12_000 }
    );

    const initialSnapshot = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      return {
        score: Number(manager.score || 0),
        board: manager.getFinalBoardMatrix()
      };
    });
    expect(initialSnapshot.score).not.toBe(424242);
    expect(initialSnapshot.board).not.toEqual(oldBoard);

    await page.evaluate(() => {
      const manager = (window as any).game_manager;
      manager.restart();
    });
    await expect(page.locator("#game-dialog-overlay.is-open")).toBeVisible();
    await page.locator("#game-dialog-confirm").click();
    await expect(page.locator("#game-dialog-overlay.is-open")).toBeHidden();
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const manager = (window as any).game_manager;
            return {
              blocked: manager?.rankedRestartBlockedUntilSessionReady === true,
              preparing: manager?.rankedRestartPreparing === true,
            };
          }),
        { timeout: 12_000 },
      )
      .toEqual({ blocked: false, preparing: false });

    const reloadResponse = await page.reload({ waitUntil: "domcontentloaded" });
    expect(reloadResponse, "Reloaded ranked play response should exist").not.toBeNull();
    expect(reloadResponse?.ok(), "Reloaded ranked play response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForWindowCondition(page, () => Boolean((window as any).game_manager), 12_000);
    await page.waitForFunction(
      () => {
        const manager = (window as any).game_manager;
        return (
          !!manager &&
          manager.rankCheckpointRestorePending !== true &&
          manager.needsRankedCheckpointRestore !== true
        );
      },
      { timeout: 12_000 }
    );

    const afterReload = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      return {
        score: Number(manager.score || 0),
        board: manager.getFinalBoardMatrix()
      };
    });
    expect(afterReload.score).not.toBe(424242);
    expect(afterReload.board).not.toEqual(oldBoard);
    expect(checkpointRequests).not.toContain("GET");
    expect(checkpointRequests).not.toContain("POST");
  });

  test("ranked home page restores local checkpoint mirror across immediate reload for accepted beta user", async ({
    page
  }) => {
    await installRankedSessionForMode(page, "standard_4x4_pow2_no_undo", {
      authToken: "smoke_token",
      ownerUserId: "42",
      seed: 414,
      token: "local-mirror-beta-auth-token"
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("2048_auth_token_v1", "smoke_token");
      window.localStorage.setItem("2048_auth_userId_v1", "42");
      window.localStorage.setItem("2048_auth_nickname_v1", "Smoke");
      if (!window.sessionStorage.getItem("__smoke_ranked_local_mirror_reset__")) {
        window.localStorage.removeItem("ranked_checkpoint_local_mirror:v1:standard_4x4_pow2_no_undo");
        window.sessionStorage.setItem("__smoke_ranked_local_mirror_reset__", "1");
      }
    });

    const response = await page.goto("/2048.html", { waitUntil: "domcontentloaded" });
    expect(response, "Home ranked response should exist").not.toBeNull();
    expect(response?.ok(), "Home ranked response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForWindowCondition(page, () => Boolean((window as any).game_manager), 12_000);
    await page.waitForFunction(
      () => {
        const manager = (window as any).game_manager;
        return !!manager && manager.rankCheckpointRestorePending !== true;
      },
      { timeout: 12_000 }
    );

    const liveSnapshot = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      manager.move(2);
      manager.move(0);
      manager.move(2);
      const onlineRuntime = (window as any).OnlineLeaderboardRuntime;
      if (onlineRuntime && typeof onlineRuntime.persistRankedCheckpointOnPageHide === "function") {
        onlineRuntime.persistRankedCheckpointOnPageHide(manager);
      }
      const board =
        typeof manager.getFinalBoardMatrix === "function"
          ? manager.getFinalBoardMatrix()
          : manager.grid.cells.map((column: Array<{ value: number } | null>) =>
              column.map((cell) => (cell ? cell.value : 0))
            );
      const rawMirror = window.localStorage.getItem("ranked_checkpoint_local_mirror:v1:standard_4x4_pow2_no_undo");
      let mirror: Record<string, unknown> | null = null;
      try {
        mirror = rawMirror ? (JSON.parse(rawMirror) as Record<string, unknown>) : null;
      } catch {
        mirror = null;
      }
      return {
        clientRecordId: String(manager.clientRecordId || ""),
        score: Number(manager.score || 0),
        stepCount: Array.isArray(manager.moveHistory) ? manager.moveHistory.length : 0,
        board,
        mirrorReplayLength: mirror ? String(mirror.replay_string || "").length : 0
      };
    });

    expect(liveSnapshot.stepCount).toBeGreaterThan(0);

    const reloadResponse = await page.reload({ waitUntil: "domcontentloaded" });
    expect(reloadResponse, "Reloaded home ranked response should exist").not.toBeNull();
    expect(reloadResponse?.ok(), "Reloaded home ranked response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForWindowCondition(page, () => Boolean((window as any).game_manager), 12_000);
    await page.waitForFunction(
      () => {
        const manager = (window as any).game_manager;
        return (
          !!manager &&
          manager.rankCheckpointRestorePending !== true &&
          manager.needsRankedCheckpointRestore !== true
        );
      },
      { timeout: 12_000 }
    );

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
        score: Number(manager.score || 0),
        board
      };
    });

    expect(restoredSnapshot.score).toBe(liveSnapshot.score);
    expect(restoredSnapshot.board).toEqual(liveSnapshot.board);
    expect(restoredSnapshot.restoreError).toBe("");
  });
});
