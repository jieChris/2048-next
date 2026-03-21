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
        boardIsArray: !!parsed && Array.isArray(parsed.board)
      };
    });

    expect(snapshot.hasManager).toBe(true);
    expect(snapshot.hasSaveFunction).toBe(true);
    expect(snapshot.hasRaw).toBe(true);
    expect(snapshot.hasRequiredKeys).toBe(true);
    expect(snapshot.boardIsArray).toBe(true);
  });
});
