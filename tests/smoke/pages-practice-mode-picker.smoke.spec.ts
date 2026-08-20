import { expect, test } from "@playwright/test";

async function waitForPracticeBoardReady(page: import("@playwright/test").Page) {
  await page.waitForFunction(
    () =>
      Boolean((window as any).game_manager) &&
      typeof (window as any).game_manager.restartWithBoard === "function" &&
      document.getElementById("practice-mode-picker-btn") !== null &&
      document.querySelectorAll("#practice-mode-list [data-practice-mode-key]").length > 0,
    null,
    { timeout: 15_000 }
  );
  await expect(page.locator("#practice-mode-picker-btn")).toBeVisible();
  await expect(page.locator("#practice-mode-picker-btn")).toBeEnabled();
}

async function openPracticeModePanel(page: import("@playwright/test").Page) {
  const picker = page.locator("#practice-mode-picker-btn");
  const panel = page.locator("#practice-mode-panel");

  await expect(picker).toBeVisible();
  await expect(picker).toBeEnabled();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (await panel.evaluate((element) => element.classList.contains("is-open"))) return;
    await picker.click();
    try {
      await expect(panel).toHaveClass(/is-open/, { timeout: 2_000 });
      return;
    } catch (error) {
      if (attempt === 1) throw error;
    }
  }
}

test.describe("Practice Board Mode Picker", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
    });
  });

  test("practice board can switch directly to fibonacci 3x3", async ({ page }) => {
    const response = await page.goto("/Practice_board.html?practice_fresh=1", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Practice board response should exist").not.toBeNull();
    expect(response?.ok(), "Practice board response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForPracticeBoardReady(page);

    await openPracticeModePanel(page);
    await page.click('[data-practice-mode-key="fib_3x3_no_undo"]');
    await expect(page.locator("#practice-mode-panel")).not.toHaveClass(/is-open/);

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const manager = (window as any).game_manager;
          return {
            modeKey: String(manager?.modeKey || manager?.mode || ""),
            width: Number(manager?.width || 0),
            height: Number(manager?.height || 0),
            ruleset: String(manager?.ruleset || ""),
            bodyRuleset: String(document.body.getAttribute("data-ruleset") || ""),
            selectedTileValue: String(
              document.querySelector(".selection-tile.selected")?.getAttribute("data-value") || ""
            ),
            modeCurrentText: String(
              document.getElementById("practice-mode-current")?.textContent || ""
            ).trim(),
            modeBadgeText: String(
              document.getElementById("practice-mode-badge")?.textContent || ""
            ).trim(),
            activeModeKey: String(
              document.getElementById("practice-mode-picker-btn")?.getAttribute("data-active-practice-mode-key") || ""
            )
          };
        })
      )
      .toMatchObject({
        modeKey: "practice",
        width: 3,
        height: 3,
        ruleset: "fibonacci",
        bodyRuleset: "fibonacci",
        selectedTileValue: "0",
        modeBadgeText: "斐波那契 3×3",
        modeCurrentText: "当前模式：斐波那契 3×3",
        activeModeKey: "fib_3x3_no_undo"
      });

    const snapshot = await page.evaluate(() => ({
      search: String(window.location.search || "")
    }));
    expect(snapshot.search).toContain("practice_mode_key=fib_3x3_no_undo");
    expect(snapshot.search).toContain("practice_ruleset=fibonacci");
  });

  test("selected practice tile scales above neighbors without changing row gaps", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    const response = await page.goto("/Practice_board.html?practice_fresh=1", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Practice board response should exist").not.toBeNull();
    expect(response?.ok(), "Practice board response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForPracticeBoardReady(page);

    const stacking = await page.evaluate(() => {
      const tiles = [...document.querySelectorAll<HTMLElement>(".selection-tile")];
      const parseZIndex = (element: HTMLElement | null) => {
        const value = Number(element ? window.getComputedStyle(element).zIndex : "auto");
        return Number.isFinite(value) ? value : 0;
      };
      const rowTops = [...new Set(tiles.map((element) => element.offsetTop))].sort(
        (left, right) => left - right
      );
      const rowGaps = rowTops.slice(1).map((rowTop, index) => {
        const previous = tiles.find((element) => element.offsetTop === rowTops[index]);
        return previous ? rowTop - previous.offsetTop - previous.offsetHeight : null;
      });
      const selected = document.querySelector<HTMLElement>(".selection-tile.selected");
      const selectedInner = selected?.querySelector<HTMLElement>(".tile-inner");
      return {
        rowGaps,
        selectedPosition: selected ? window.getComputedStyle(selected).position : "",
        selectedTransform: selected ? window.getComputedStyle(selected).transform : "none",
        selectedZIndex: parseZIndex(selected),
        selectedInnerPresent: !!selectedInner,
        neighborZIndices: tiles.filter((tile) => tile !== selected).map(parseZIndex),
        selectedMargin: selected ? window.getComputedStyle(selected).margin : ""
      };
    });

    expect(stacking.selectedPosition).toBe("relative");
    expect(stacking.selectedTransform).not.toBe("none");
    expect(stacking.selectedMargin).toBe("0px");
    expect(stacking.selectedInnerPresent).toBe(true);
    expect(stacking.selectedZIndex).toBeGreaterThan(Math.max(...stacking.neighborZIndices, 0));
    expect(stacking.rowGaps.length).toBeGreaterThan(0);
    for (const rowGap of stacking.rowGaps) {
      expect(rowGap).not.toBeNull();
      expect(rowGap as number).toBeGreaterThanOrEqual(3.25);
      expect(rowGap as number).toBeLessThanOrEqual(4.75);
    }

    await page.locator('.selection-tile[data-value="64"]').click();
    const lowerRowGaps = await page.evaluate(() => {
      const tiles = [...document.querySelectorAll<HTMLElement>(".selection-tile")];
      const rowTops = [...new Set(tiles.map((element) => element.offsetTop))].sort(
        (left, right) => left - right
      );
      const rowGaps = rowTops.slice(1).map((rowTop, index) => {
        const previous = tiles.find((element) => element.offsetTop === rowTops[index]);
        return previous ? rowTop - previous.offsetTop - previous.offsetHeight : null;
      });
      return {
        value: document.querySelector<HTMLElement>(".selection-tile.selected")?.getAttribute("data-value") || "",
        rowGaps
      };
    });
    expect(lowerRowGaps.value).toBe("64");
    for (const rowGap of lowerRowGaps.rowGaps) {
      expect(rowGap).not.toBeNull();
      expect(rowGap as number).toBeGreaterThanOrEqual(3.25);
      expect(rowGap as number).toBeLessThanOrEqual(4.75);
    }
  });

  test("practice board keeps the selected diagonal mode after reload", async ({ page }) => {
    const response = await page.goto("/Practice_board.html?practice_fresh=1", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Practice board response should exist").not.toBeNull();
    expect(response?.ok(), "Practice board response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForPracticeBoardReady(page);

    await openPracticeModePanel(page);
    await page.click('[data-practice-mode-key="diag_4x4_pow2_no_undo"]');

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const cfg = (window as any).GAME_MODE_CONFIG || {};
          return {
            spawnTable: Array.isArray(cfg.spawn_table) ? cfg.spawn_table : null,
            allowDiagonalMoves: Boolean(cfg?.special_rules?.allow_diagonal_moves)
          };
        })
      )
      .toEqual({
        spawnTable: [
          { value: 2, weight: 90 },
          { value: 4, weight: 10 }
        ],
        allowDiagonalMoves: true
      });

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
    await waitForPracticeBoardReady(page);

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const manager = (window as any).game_manager;
          const cfg = (window as any).GAME_MODE_CONFIG || {};
          return {
            modeKey: String(manager?.modeKey || manager?.mode || ""),
            width: Number(manager?.width || 0),
            height: Number(manager?.height || 0),
            ruleset: String(manager?.ruleset || ""),
            activeModeKey: String(
              document.getElementById("practice-mode-picker-btn")?.getAttribute("data-active-practice-mode-key") || ""
            ),
            spawnTable: Array.isArray(cfg.spawn_table) ? cfg.spawn_table : null,
            allowDiagonalMoves: Boolean(cfg?.special_rules?.allow_diagonal_moves)
          };
        })
      )
      .toMatchObject({
        modeKey: "practice",
        width: 4,
        height: 4,
        ruleset: "pow2",
        activeModeKey: "diag_4x4_pow2_no_undo",
        allowDiagonalMoves: true
      });

    const snapshot = await page.evaluate(() => {
      const cfg = (window as any).GAME_MODE_CONFIG || {};
      return {
        search: String(window.location.search || ""),
        spawnTable: Array.isArray(cfg.spawn_table) ? cfg.spawn_table : null,
        allowDiagonalMoves: Boolean(cfg?.special_rules?.allow_diagonal_moves)
      };
    });
    expect(snapshot.spawnTable).toEqual([
      { value: 2, weight: 90 },
      { value: 4, weight: 10 }
    ]);
    expect(snapshot.allowDiagonalMoves).toBe(true);
    expect(snapshot.search).toContain("practice_mode_key=diag_4x4_pow2_no_undo");
    expect(snapshot.search).toContain("practice_ruleset=pow2");
  });

  test("practice board can switch directly to NO X and choose a forbidden tile", async ({ page }) => {
    const response = await page.goto("/Practice_board.html?practice_fresh=1", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Practice board response should exist").not.toBeNull();
    expect(response?.ok(), "Practice board response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForPracticeBoardReady(page);

    await openPracticeModePanel(page);
    await page.click('[data-practice-mode-key="nox_4x4_pow2_no_undo"]');

    await expect(page.locator("#no-x-selection-overlay")).toBeVisible();
    await expect(page.locator('[data-no-x-value="64"]')).toBeVisible();

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const manager = (window as any).game_manager;
          const cfg = (window as any).GAME_MODE_CONFIG || {};
          return {
            modeKey: String(manager?.modeKey || manager?.mode || ""),
            activeModeKey: String(
              document.getElementById("practice-mode-picker-btn")?.getAttribute("data-active-practice-mode-key") || ""
            ),
            noXEnabled: Boolean(cfg?.special_rules?.no_x_enabled),
            noXTarget: Number(cfg?.special_rules?.no_x_target || 0),
            noXSelectionPending: Boolean(manager?.noXSelectionPending)
          };
        })
      )
      .toMatchObject({
        modeKey: "practice",
        activeModeKey: "nox_4x4_pow2_no_undo",
        noXEnabled: true,
        noXTarget: 8192,
        noXSelectionPending: true
      });

    await page.click('[data-no-x-value="64"]');
    await expect(page.locator("#no-x-selection-overlay")).toHaveCount(0);
    await expect(page.locator('.selection-tile[data-value="32"]')).toBeVisible();
    await expect(page.locator('.selection-tile[data-value="64"]')).toHaveCount(0);

    const selected = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      const cfg = (window as any).GAME_MODE_CONFIG || {};
      return {
        managerTarget: Number(manager?.specialRules?.no_x_target || 0),
        configTarget: Number(cfg?.special_rules?.no_x_target || 0),
        noXSelectionPending: Boolean(manager?.noXSelectionPending)
      };
    });
    expect(selected).toEqual({
      managerTarget: 64,
      configTarget: 64,
      noXSelectionPending: false
    });
  });

  test("practice transfer from existing NO X game keeps forbidden tile without prompting again", async ({
    page
  }) => {
    const token = "nox-transfer";
    const payload = {
      token,
      created_at: Date.now(),
      board: [
        [2, 4, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],
      mode_config: {
        key: "practice",
        label: "练习板（直通）",
        board_width: 4,
        board_height: 4,
        ruleset: "pow2",
        undo_enabled: true,
        spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
        ranked_bucket: "none",
        mode_family: "pow2",
        rank_policy: "unranked",
        special_rules: { no_x_enabled: true, no_x_target: 64 }
      }
    };

    const response = await page.goto(
      `/Practice_board.html?practice_token=${token}&practice_ruleset=pow2&practice_payload=${encodeURIComponent(
        JSON.stringify(payload)
      )}`,
      { waitUntil: "domcontentloaded" }
    );
    expect(response, "Practice board response should exist").not.toBeNull();
    expect(response?.ok(), "Practice board response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForPracticeBoardReady(page);

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const manager = (window as any).game_manager;
          const cfg = (window as any).GAME_MODE_CONFIG || {};
          return {
            noXEnabled: Boolean(cfg?.special_rules?.no_x_enabled),
            configTarget: Number(cfg?.special_rules?.no_x_target || 0),
            managerTarget: Number(manager?.specialRules?.no_x_target || 0),
            noXSelectionPending: Boolean(manager?.noXSelectionPending),
            overlayCount: document.querySelectorAll("#no-x-selection-overlay").length
          };
        })
      )
      .toEqual({
        noXEnabled: true,
        configTarget: 64,
        managerTarget: 64,
        noXSelectionPending: false,
        overlayCount: 0
      });
  });

  test("practice board mode picker only keeps standard, capped, fibonacci, diagonal, and NO X families", async ({
    page
  }) => {
    const response = await page.goto("/Practice_board.html?practice_fresh=1", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Practice board response should exist").not.toBeNull();
    expect(response?.ok(), "Practice board response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForPracticeBoardReady(page);

    await openPracticeModePanel(page);

    await expect(page.locator('[data-practice-mode-key="standard_4x4_pow2_no_undo"]')).toHaveCount(1);
    await expect(page.locator('[data-practice-mode-key="capped_4x4_pow2_64_no_undo"]')).toHaveCount(1);
    await expect(page.locator('[data-practice-mode-key="capped_4x4_pow2_1024_no_undo"]')).toHaveCount(1);
    await expect(page.locator('[data-practice-mode-key="capped_4x4_pow2_no_undo"]')).toHaveCount(1);
    await expect(page.locator('[data-practice-mode-key="capped_4x4_pow2_4096_no_undo"]')).toHaveCount(1);
    await expect(page.locator('[data-practice-mode-key="fib_4x2_no_undo"]')).toHaveCount(1);
    await expect(page.locator('[data-practice-mode-key="fib_3x3_no_undo"]')).toHaveCount(1);
    await expect(page.locator('[data-practice-mode-key="fib_4x3_no_undo"]')).toHaveCount(1);
    await expect(page.locator('[data-practice-mode-key="fib_4x4_no_undo"]')).toHaveCount(1);
    await expect(page.locator('[data-practice-mode-key="diag_4x4_pow2_no_undo"]')).toHaveCount(1);
    await expect(page.locator('[data-practice-mode-key="nox_4x4_pow2_no_undo"]')).toHaveCount(1);
    await expect(page.locator('[data-practice-mode-key="board_5x5_pow2_no_undo"]')).toHaveCount(1);

    await expect(page.locator('[data-practice-mode-key="classic_4x4_pow2_undo"]')).toHaveCount(0);
    await expect(page.locator('[data-practice-mode-key="board_6x6_pow2_no_undo"]')).toHaveCount(0);
    await expect(page.locator('[data-practice-mode-key="board_6x6_pow2_undo"]')).toHaveCount(0);
    await expect(page.locator('[data-practice-mode-key="board_10x10_pow2_no_undo"]')).toHaveCount(0);
    await expect(page.locator('[data-practice-mode-key="board_10x10_pow2_undo"]')).toHaveCount(0);
    await expect(page.locator('[data-practice-mode-key="spawn50_3x3_pow2_no_undo"]')).toHaveCount(0);
    await expect(page.locator('[data-practice-mode-key="limit3_4x4_pow2_undo"]')).toHaveCount(0);
    await expect(page.locator('[data-practice-mode-key="combo_4x4_pow2_undo"]')).toHaveCount(0);
    await expect(page.locator('[data-practice-mode-key="item_4x4_pow2_no_undo"]')).toHaveCount(0);

    const visibleLabels = await page.locator("#practice-mode-list .practice-mode-option").evaluateAll((nodes) =>
      nodes.map((node) => String((node.textContent || "").trim()))
    );
    expect(visibleLabels.some((label) => /无撤回|No Undo/i.test(label))).toBe(false);
  });

  test("practice board ignores 6x6 and larger direct mode query", async ({ page }) => {
    const response = await page.goto(
      "/Practice_board.html?practice_fresh=1&practice_mode_key=board_6x6_pow2_no_undo",
      {
        waitUntil: "domcontentloaded"
      }
    );
    expect(response, "Practice board response should exist").not.toBeNull();
    expect(response?.ok(), "Practice board response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForPracticeBoardReady(page);

    expect(
      await page.evaluate(() => {
        const cfg = (window as any).GAME_MODE_CONFIG || {};
        return {
          activeKey:
            document.getElementById("practice-mode-picker-btn")?.getAttribute("data-active-practice-mode-key") ||
            "",
          key: cfg.key,
          boardWidth: cfg.board_width,
          boardHeight: cfg.board_height
        };
      })
    ).toEqual({
      activeKey: "standard_4x4_pow2_no_undo",
      key: "practice",
      boardWidth: 4,
      boardHeight: 4
    });
  });

  test("practice board ignores oversized transfer payload", async ({ page }) => {
    const token = "oversized-practice";
    const payload = {
      token,
      created_at: Date.now(),
      board: Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => 0)),
      mode_config: {
        key: "practice",
        label: "练习板（直通）",
        board_width: 6,
        board_height: 6,
        ruleset: "pow2",
        undo_enabled: true,
        spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
        ranked_bucket: "none",
        mode_family: "pow2",
        rank_policy: "unranked",
        special_rules: {}
      }
    };
    const response = await page.goto(
      `/Practice_board.html?practice_token=${token}&practice_payload=${encodeURIComponent(
        JSON.stringify(payload)
      )}`,
      {
        waitUntil: "domcontentloaded"
      }
    );
    expect(response, "Practice board response should exist").not.toBeNull();
    expect(response?.ok(), "Practice board response should be 2xx").toBeTruthy();
    await waitForPracticeBoardReady(page);

    await page.waitForFunction(() => {
      const cfg = (window as any).game_manager?.modeConfig || (window as any).GAME_MODE_CONFIG || {};
      return (
        cfg.key === "practice" &&
        cfg.board_width === 4 &&
        cfg.board_height === 4 &&
        !window.location.search.includes("practice_payload=")
      );
    });
  });

  test("practice board keeps capped merge limits when switching to capped modes", async ({ page }) => {
    const response = await page.goto("/Practice_board.html?practice_fresh=1", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Practice board response should exist").not.toBeNull();
    expect(response?.ok(), "Practice board response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForPracticeBoardReady(page);

    const cappedModes = [
      { modeKey: "capped_4x4_pow2_64_no_undo", maxTile: 64 },
      { modeKey: "capped_4x4_pow2_1024_no_undo", maxTile: 1024 },
      { modeKey: "capped_4x4_pow2_no_undo", maxTile: 2048 },
      { modeKey: "capped_4x4_pow2_4096_no_undo", maxTile: 4096 }
    ];

    for (const cappedMode of cappedModes) {
      await openPracticeModePanel(page);
      await page.click(`[data-practice-mode-key="${cappedMode.modeKey}"]`);
      await expect(page.locator("#practice-mode-panel")).not.toHaveClass(/is-open/);

      await expect
        .poll(async () =>
          page.evaluate(({ maxTile }) => {
            const manager = (window as any).game_manager;
            const cfg = (window as any).GAME_MODE_CONFIG || manager?.modeConfig || {};
            const activeMaxTile = Number(manager?.maxTile ?? cfg?.max_tile ?? 0);
            const mergedValue = (window as any).CoreRulesRuntime?.getMergedValue?.(
              maxTile,
              maxTile,
              "pow2",
              activeMaxTile
            );

            return {
              modeKey: String(manager?.modeKey || manager?.mode || ""),
              activeModeKey: String(
                document.getElementById("practice-mode-picker-btn")?.getAttribute("data-active-practice-mode-key") || ""
              ),
              maxTile: activeMaxTile,
              configMaxTile: Number(cfg?.max_tile || 0),
              enforceMaxTile: Boolean(cfg?.special_rules?.enforce_max_tile),
              mergedValue: mergedValue === null ? null : Number(mergedValue),
              hasOverCapSelection:
                document.querySelector(`.selection-tile[data-value="${maxTile * 2}"]`) !== null
            };
          }, cappedMode)
        )
        .toMatchObject({
          modeKey: "practice",
          activeModeKey: cappedMode.modeKey,
          maxTile: cappedMode.maxTile,
          configMaxTile: cappedMode.maxTile,
          enforceMaxTile: true,
          mergedValue: null,
          hasOverCapSelection: false
        });
    }
  });
});
