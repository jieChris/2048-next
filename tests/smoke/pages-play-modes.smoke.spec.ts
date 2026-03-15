import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("play custom spawn mode applies query four-rate via runtime helper", async ({ page }) => {
    const response = await page.goto("/play.html?mode_key=spawn_custom_4x4_pow2_no_undo&four_rate=25", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Custom-spawn response should exist").not.toBeNull();
    expect(response?.ok(), "Custom-spawn response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => {
      const w = window as any;
      const cfg = w.GAME_MODE_CONFIG;
      return Boolean(
        w.CoreCustomSpawnRuntime?.applyCustomFourRateToModeConfig &&
          w.CorePlayCustomSpawnRuntime?.resolvePlayCustomSpawnModeConfig &&
          w.CoreStorageRuntime?.resolveStorageByName &&
          w.CorePlayEntryRuntime?.resolvePlayEntryPlan &&
          w.CorePlayPageContextRuntime?.resolvePlayCustomSpawnModeConfigFromPageContext &&
          cfg &&
          cfg.key === "spawn_custom_4x4_pow2_no_undo" &&
          Array.isArray(cfg.spawn_table)
      );
    }, null, { timeout: 15000 });

    const snapshot = await page.evaluate(() => {
      const cfg = (window as any).GAME_MODE_CONFIG;
      const introNode = document.getElementById("play-mode-intro");
      return {
        key: cfg && typeof cfg.key === "string" ? cfg.key : null,
        label: cfg && typeof cfg.label === "string" ? cfg.label : null,
        spawnTable: cfg && Array.isArray(cfg.spawn_table) ? cfg.spawn_table : null,
        storedRate: window.localStorage.getItem("custom_spawn_4x4_four_rate_v1"),
        introText: introNode ? String(introNode.textContent || "") : "",
        hasRuntime: Boolean((window as any).CoreCustomSpawnRuntime?.applyCustomFourRateToModeConfig),
        hasPlayCustomSpawnRuntime: Boolean(
          (window as any).CorePlayCustomSpawnRuntime?.resolvePlayCustomSpawnModeConfig
        ),
        hasStorageRuntime: Boolean(
          (window as any).CoreStorageRuntime?.resolveStorageByName &&
          (window as any).CoreStorageRuntime?.safeReadStorageItem &&
          (window as any).CoreStorageRuntime?.safeSetStorageItem
        ),
        hasPlayEntryRuntime: Boolean(
          (window as any).CorePlayEntryRuntime?.resolvePlayEntryPlan
        ),
        hasPlayRuntimeContractRuntime: Boolean(
          (window as any).CorePlayRuntimeContractRuntime?.resolvePlayRuntimeContracts
        ),
        hasPlayPageContextRuntime: Boolean(
          (window as any).CorePlayPageContextRuntime?.resolvePlayCustomSpawnModeConfigFromPageContext &&
          (window as any).CorePlayPageContextRuntime?.applyPlayHeaderFromPageContext
        ),
        hasPlayChallengeIntroRuntime: Boolean(
          (window as any).CorePlayChallengeIntroRuntime?.resolvePlayChallengeIntroModel
        ),
        hasPlayChallengeIntroUiRuntime: Boolean(
          (window as any).CorePlayChallengeIntroUiRuntime?.resolvePlayChallengeIntroUiState
        ),
        hasPlayChallengeIntroActionRuntime: Boolean(
          (window as any).CorePlayChallengeIntroActionRuntime?.resolvePlayChallengeIntroActionState
        ),
        hasPlayChallengeIntroHostRuntime: Boolean(
          (window as any).CorePlayChallengeIntroHostRuntime?.resolvePlayChallengeIntroFromContext
        ),
        hasPlayChallengeContextRuntime: Boolean(
          (window as any).CorePlayChallengeContextRuntime?.resolvePlayChallengeContext
        ),
        hasPlayCustomSpawnHostRuntime: Boolean(
          (window as any).CorePlayCustomSpawnHostRuntime?.resolvePlayCustomSpawnModeConfigFromContext
        ),
        hasPlayStartGuardRuntime: Boolean(
          (window as any).CorePlayStartGuardRuntime?.resolvePlayStartGuardState
        ),
        hasPlayStartupPayloadRuntime: Boolean(
          (window as any).CorePlayStartupPayloadRuntime?.resolvePlayStartupPayload
        ),
        hasPlayStartupContextRuntime: Boolean(
          (window as any).CorePlayStartupContextRuntime?.resolvePlayStartupContext
        ),
        hasPlayStartupHostRuntime: Boolean(
          (window as any).CorePlayStartupHostRuntime?.resolvePlayStartupFromContext
        ),
        hasPlayHeaderHostRuntime: Boolean(
          (window as any).CorePlayHeaderHostRuntime?.resolvePlayHeaderFromContext
        ),
        hasHeaderRuntime: Boolean(
          (window as any).CorePlayHeaderRuntime?.buildPlayModeIntroText &&
            (window as any).CorePlayHeaderRuntime?.resolvePlayHeaderState
        ),
        hasModeCatalogRuntime: Boolean((window as any).CoreModeCatalogRuntime?.resolveCatalogModeWithDefault)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasPlayCustomSpawnRuntime).toBe(true);
    expect(snapshot.hasStorageRuntime).toBe(true);
    expect(snapshot.hasPlayEntryRuntime).toBe(true);
    expect(snapshot.hasPlayRuntimeContractRuntime).toBe(true);
    expect(snapshot.hasPlayPageContextRuntime).toBe(true);
    expect(snapshot.hasPlayChallengeIntroRuntime).toBe(true);
    expect(snapshot.hasPlayChallengeIntroUiRuntime).toBe(true);
    expect(snapshot.hasPlayChallengeIntroActionRuntime).toBe(true);
    expect(snapshot.hasPlayChallengeIntroHostRuntime).toBe(true);
    expect(snapshot.hasPlayChallengeContextRuntime).toBe(true);
    expect(snapshot.hasPlayCustomSpawnHostRuntime).toBe(true);
    expect(snapshot.hasPlayStartGuardRuntime).toBe(true);
    expect(snapshot.hasPlayStartupPayloadRuntime).toBe(true);
    expect(snapshot.hasPlayStartupContextRuntime).toBe(true);
    expect(snapshot.hasPlayStartupHostRuntime).toBe(true);
    expect(snapshot.hasPlayHeaderHostRuntime).toBe(true);
    expect(snapshot.hasHeaderRuntime).toBe(true);
    expect(snapshot.hasModeCatalogRuntime).toBe(true);
    expect(snapshot.key).toBe("spawn_custom_4x4_pow2_no_undo");
    expect(snapshot.label).toContain("4率 25%");
    expect(snapshot.introText).toContain("4率25%");
    expect(snapshot.spawnTable).toEqual([
      { value: 2, weight: 75 },
      { value: 4, weight: 25 }
    ]);
    expect(snapshot.storedRate).toBe("25");
  });

  test("capped timer scroll delegates mode context resolution to runtime helper", async ({
    page
  }) => {
    const response = await page.goto("/capped_2048.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Capped response should exist").not.toBeNull();
    expect(response?.ok(), "Capped response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => {
      const w = window as any;
      return Boolean(
        w.CoreCappedTimerScrollRuntime?.resolveTimerScrollModeFromContext &&
          w.CoreCappedTimerScrollRuntime?.isTimerScrollModeKey &&
          typeof w.updateTimerScroll === "function"
      );
    }, null, { timeout: 15000 });

    const snapshot = await page.evaluate(() => {
      const runtime = (window as any).CoreCappedTimerScrollRuntime;
      const updateTimerScroll = (window as any).updateTimerScroll;
      if (
        !runtime ||
        typeof runtime.resolveTimerScrollModeFromContext !== "function" ||
        typeof runtime.isTimerScrollModeKey !== "function" ||
        typeof updateTimerScroll !== "function"
      ) {
        return {
          hasRuntime: false,
          hasUpdateBinding: typeof updateTimerScroll === "function"
        };
      }

      const originalResolve = runtime.resolveTimerScrollModeFromContext;
      let resolveCallCount = 0;
      runtime.resolveTimerScrollModeFromContext = function (opts: any) {
        resolveCallCount += 1;
        return originalResolve(opts);
      };

      try {
        updateTimerScroll();
        const modeState = originalResolve({
          bodyLike: document.body,
          windowLike: window
        });
        return {
          hasRuntime: true,
          hasUpdateBinding: true,
          resolveCallCount,
          modeEnabled: Boolean(modeState && modeState.enabled)
        };
      } finally {
        runtime.resolveTimerScrollModeFromContext = originalResolve;
      }
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasUpdateBinding).toBe(true);
    expect(snapshot.resolveCallCount).toBeGreaterThan(0);
    expect(snapshot.modeEnabled).toBe(true);
  });

  test("practice page applies fibonacci ruleset via runtime helper", async ({ page }) => {
    const response = await page.goto("/Practice_board.html?practice_ruleset=fibonacci", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Practice-fibonacci response should exist").not.toBeNull();
    expect(response?.ok(), "Practice-fibonacci response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => {
      const w = window as any;
      const cfg = w.GAME_MODE_CONFIG;
      return Boolean(
        w.CorePracticeModeRuntime?.buildPracticeModeConfig &&
          w.CoreModeCatalogRuntime?.resolveCatalogModeWithDefault &&
          w.CoreHomeModeRuntime?.resolveHomeModeSelection &&
          w.CoreHomeRuntimeContractRuntime?.resolveHomeRuntimeContracts &&
          w.CoreHomeStartupHostRuntime?.resolveHomeStartupFromContext &&
          w.CoreHomeModeRuntime?.resolveHomeModeSelectionFromContext &&
          cfg &&
          cfg.key === "practice" &&
          cfg.ruleset === "fibonacci" &&
          Array.isArray(cfg.spawn_table)
      );
    }, null, { timeout: 15000 });

    const snapshot = await page.evaluate(() => {
      const cfg = (window as any).GAME_MODE_CONFIG;
      return {
        key: cfg && typeof cfg.key === "string" ? cfg.key : null,
        ruleset: cfg && typeof cfg.ruleset === "string" ? cfg.ruleset : null,
        spawnTable: cfg && Array.isArray(cfg.spawn_table) ? cfg.spawn_table : null,
        hasRuntime: Boolean((window as any).CorePracticeModeRuntime?.buildPracticeModeConfig),
        hasModeCatalogRuntime: Boolean((window as any).CoreModeCatalogRuntime?.resolveCatalogModeWithDefault),
        hasHomeModeRuntime: Boolean((window as any).CoreHomeModeRuntime?.resolveHomeModeSelection),
        hasHomeRuntimeContractRuntime: Boolean(
          (window as any).CoreHomeRuntimeContractRuntime?.resolveHomeRuntimeContracts
        ),
        hasHomeStartupHostRuntime: Boolean(
          (window as any).CoreHomeStartupHostRuntime?.resolveHomeStartupFromContext
        ),
        hasHomeModeContextRuntime: Boolean(
          (window as any).CoreHomeModeRuntime?.resolveHomeModeSelectionFromContext
        )
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasModeCatalogRuntime).toBe(true);
    expect(snapshot.hasHomeModeRuntime).toBe(true);
    expect(snapshot.hasHomeRuntimeContractRuntime).toBe(true);
    expect(snapshot.hasHomeStartupHostRuntime).toBe(true);
    expect(snapshot.hasHomeModeContextRuntime).toBe(true);
    expect(snapshot.key).toBe("practice");
    expect(snapshot.ruleset).toBe("fibonacci");
    expect(snapshot.spawnTable).toEqual([
      { value: 1, weight: 90 },
      { value: 2, weight: 10 }
    ]);
  });

  test("game manager delegates undo policy state resolution to mode runtime", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__undoPolicyStateCallCount = 0;
      const runtimeTarget: Record<string, unknown> = {};
      (window as any).CoreModeRuntime = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "resolveUndoPolicyState" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__undoPolicyStateCallCount =
                Number((window as any).__undoPolicyStateCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/play.html?mode_key=classic_4x4_pow2_undo", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Play response should exist").not.toBeNull();
    expect(response?.ok(), "Play response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return Boolean(
        manager &&
          typeof manager.resolveUndoPolicyStateForMode === "function" &&
          typeof manager.isUndoAllowedByMode === "function" &&
          typeof manager.isUndoSettingFixedForMode === "function"
      );
    }, null, { timeout: 15000 });

    const snapshot = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      if (!manager || typeof manager.resolveUndoPolicyStateForMode !== "function") {
        return null;
      }
      const forced = manager.getForcedUndoSettingForMode("classic_4x4_pow2_undo");
      const allowed = manager.isUndoAllowedByMode("classic_4x4_pow2_undo");
      const fixed = manager.isUndoSettingFixedForMode("classic_4x4_pow2_undo");
      const canToggle = manager.canToggleUndoSetting("classic_4x4_pow2_undo");
      const interaction = manager.isUndoInteractionEnabled();
      return {
        callCount: Number((window as any).__undoPolicyStateCallCount || 0),
        forced,
        allowed,
        fixed,
        canToggle,
        interaction,
        fixedConsistent: fixed === (forced !== null),
        allowedConsistent: allowed === (forced !== false)
      };
    });

    expect(snapshot, "undo policy delegation snapshot should exist").not.toBeNull();
    expect(snapshot?.callCount).toBeGreaterThan(0);
    expect(snapshot?.fixedConsistent).toBe(true);
    expect(snapshot?.allowedConsistent).toBe(true);
    expect(typeof snapshot?.forced === "boolean" || snapshot?.forced === null).toBe(true);
    expect(typeof snapshot?.canToggle).toBe("boolean");
    expect(typeof snapshot?.interaction).toBe("boolean");
  });

  test("play page suppresses 2048 win prompt when win-prompt setting is disabled", async ({ page }) => {
    const response = await page.goto("/play.html?mode_key=classic_4x4_pow2_undo", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Play response should exist").not.toBeNull();
    expect(response?.ok(), "Play response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return Boolean(
        manager &&
          typeof manager.restartWithBoard === "function" &&
          typeof manager.move === "function"
      );
    }, null, { timeout: 15000 });

    const snapshot = await page.evaluate(async () => {
      window.localStorage.setItem("settings_win_prompt_enabled_v1", "0");
      window.localStorage.setItem("settings_win_prompt_enabled", "0");
      window.localStorage.setItem("win_prompt_enabled", "0");

      const manager = (window as any).game_manager;
      if (!manager || typeof manager.restartWithBoard !== "function" || typeof manager.move !== "function") {
        return null;
      }

      const board = [
        [1024, 1024, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ];
      manager.restartWithBoard(board, null, { preserveSeed: true, preserveMode: true });
      manager.move(3);
      if (!manager.won) manager.move(1);

      await new Promise((resolve) => window.setTimeout(resolve, 260));

      const messageNode = document.querySelector(".game-message");
      const className = messageNode ? String((messageNode as HTMLElement).className || "") : "";
      const text = messageNode ? String((messageNode as HTMLElement).textContent || "") : "";
      const actuator = (manager as any).actuator;
      return {
        storageValue: window.localStorage.getItem("settings_win_prompt_enabled_v1"),
        shouldShowWinPrompt:
          actuator && typeof actuator.shouldShowWinPrompt === "function"
            ? actuator.shouldShowWinPrompt()
            : null,
        won: Boolean(manager.won),
        keepPlayingState: (manager as any).keepPlaying,
        hasWonPromptClass: className.indexOf("game-won") !== -1,
        messageText: text
      };
    });

    expect(snapshot, "win-prompt suppression snapshot should exist").not.toBeNull();
    expect(snapshot?.storageValue).toBe("0");
    expect(snapshot?.shouldShowWinPrompt).toBe(false);
    expect(snapshot?.won).toBe(true);
    expect(snapshot?.keepPlayingState).toBe(true);
    expect(snapshot?.hasWonPromptClass).toBe(false);
    expect(snapshot?.messageText).not.toContain("你赢了");
  });

  test("obstacle mode keeps grid aligned with obstacle cells sized like normal cells", async ({
    page
  }) => {
    const response = await page.goto("/play.html?mode_key=obstacle_4x4_pow2_no_undo", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Obstacle mode response should exist").not.toBeNull();
    expect(response?.ok(), "Obstacle mode response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => {
      const totalCells = document.querySelectorAll(".grid-cell").length;
      const obstacleCells = document.querySelectorAll(".grid-cell.grid-cell-obstacle").length;
      return totalCells === 16 && obstacleCells > 0;
    });

    const snapshot = await page.evaluate(() => {
      const allCells = Array.from(document.querySelectorAll(".grid-cell")) as HTMLElement[];
      const obstacleCells = Array.from(document.querySelectorAll(".grid-cell.grid-cell-obstacle")) as HTMLElement[];
      if (allCells.length === 0 || obstacleCells.length === 0) return null;

      const points = allCells.map((cell) => {
        const rect = cell.getBoundingClientRect();
        return {
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          w: rect.width,
          h: rect.height
        };
      });

      const rowCounter = new Map<number, number>();
      const colCounter = new Map<number, number>();
      for (const point of points) {
        rowCounter.set(point.y, (rowCounter.get(point.y) || 0) + 1);
        colCounter.set(point.x, (colCounter.get(point.x) || 0) + 1);
      }

      const firstNormal = allCells.find((cell) => !cell.classList.contains("grid-cell-obstacle")) || allCells[0];
      const normalRect = firstNormal.getBoundingClientRect();
      const obstacleRect = obstacleCells[0].getBoundingClientRect();

      return {
        totalCells: allCells.length,
        obstacleCells: obstacleCells.length,
        rowCounts: Array.from(rowCounter.values()).sort((a, b) => a - b),
        colCounts: Array.from(colCounter.values()).sort((a, b) => a - b),
        widthDelta: Math.abs(normalRect.width - obstacleRect.width),
        heightDelta: Math.abs(normalRect.height - obstacleRect.height)
      };
    });

    expect(snapshot, "obstacle grid alignment snapshot should exist").not.toBeNull();
    expect(snapshot?.totalCells).toBe(16);
    expect(snapshot?.obstacleCells).toBeGreaterThan(0);
    expect(snapshot?.rowCounts).toEqual([4, 4, 4, 4]);
    expect(snapshot?.colCounts).toEqual([4, 4, 4, 4]);
    expect(snapshot?.widthDelta).toBeLessThanOrEqual(0.6);
    expect(snapshot?.heightDelta).toBeLessThanOrEqual(0.6);
  });
});
