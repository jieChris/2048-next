import { expect, test } from "@playwright/test";

async function waitForPracticeBoardReady(page: import("@playwright/test").Page) {
  await page.waitForFunction(
    () =>
      Boolean((window as any).game_manager) &&
      typeof (window as any).game_manager.restartWithBoard === "function" &&
      document.getElementById("practice-mode-picker-btn") !== null,
    null,
    { timeout: 15_000 }
  );
}

test.describe("Practice Board Mode Picker", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("practice_guide_shown_v2", "1");
      window.localStorage.setItem("practice_guide_mobile_shown_v1", "1");
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

    await page.click("#practice-mode-picker-btn");
    await expect(page.locator("#practice-mode-panel")).toHaveClass(/is-open/);
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
        selectedTileValue: "1",
        modeBadgeText: "斐波那契 3x3",
        modeCurrentText: "当前模式：斐波那契 3x3",
        activeModeKey: "fib_3x3_no_undo"
      });

    const snapshot = await page.evaluate(() => ({
      search: String(window.location.search || "")
    }));
    expect(snapshot.search).toContain("practice_mode_key=fib_3x3_no_undo");
    expect(snapshot.search).toContain("practice_ruleset=fibonacci");
  });

  test("practice board keeps the selected diagonal mode after reload", async ({ page }) => {
    const response = await page.goto("/Practice_board.html?practice_fresh=1", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Practice board response should exist").not.toBeNull();
    expect(response?.ok(), "Practice board response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForPracticeBoardReady(page);

    await page.click("#practice-mode-picker-btn");
    await expect(page.locator("#practice-mode-panel")).toHaveClass(/is-open/);
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

  test("practice board mode picker only keeps standard, capped, fibonacci, and diagonal families", async ({
    page
  }) => {
    const response = await page.goto("/Practice_board.html?practice_fresh=1", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Practice board response should exist").not.toBeNull();
    expect(response?.ok(), "Practice board response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForPracticeBoardReady(page);

    await page.click("#practice-mode-picker-btn");
    await expect(page.locator("#practice-mode-panel")).toHaveClass(/is-open/);

    await expect(page.locator('[data-practice-mode-key="standard_4x4_pow2_no_undo"]')).toHaveCount(1);
    await expect(page.locator('[data-practice-mode-key="capped_4x4_pow2_64_no_undo"]')).toHaveCount(1);
    await expect(page.locator('[data-practice-mode-key="fib_3x3_no_undo"]')).toHaveCount(1);
    await expect(page.locator('[data-practice-mode-key="diag_4x4_pow2_no_undo"]')).toHaveCount(1);

    await expect(page.locator('[data-practice-mode-key="classic_4x4_pow2_undo"]')).toHaveCount(0);
    await expect(page.locator('[data-practice-mode-key="spawn50_3x3_pow2_no_undo"]')).toHaveCount(0);
    await expect(page.locator('[data-practice-mode-key="limit3_4x4_pow2_undo"]')).toHaveCount(0);
    await expect(page.locator('[data-practice-mode-key="combo_4x4_pow2_undo"]')).toHaveCount(0);
    await expect(page.locator('[data-practice-mode-key="item_4x4_pow2_no_undo"]')).toHaveCount(0);

    const visibleLabels = await page.locator("#practice-mode-list .practice-mode-option").evaluateAll((nodes) =>
      nodes.map((node) => String((node.textContent || "").trim()))
    );
    expect(visibleLabels.some((label) => /无撤回|No Undo/i.test(label))).toBe(false);
  });

  test("practice board keeps capped merge limits when switching to capped mode", async ({ page }) => {
    const response = await page.goto("/Practice_board.html?practice_fresh=1", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Practice board response should exist").not.toBeNull();
    expect(response?.ok(), "Practice board response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForPracticeBoardReady(page);

    await page.click("#practice-mode-picker-btn");
    await expect(page.locator("#practice-mode-panel")).toHaveClass(/is-open/);
    await page.click('[data-practice-mode-key="capped_4x4_pow2_64_no_undo"]');
    await expect(page.locator("#practice-mode-panel")).not.toHaveClass(/is-open/);

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const manager = (window as any).game_manager;
          const cfg = (window as any).GAME_MODE_CONFIG || manager?.modeConfig || {};
          const maxTile = Number(manager?.maxTile ?? cfg?.max_tile ?? 0);
          const mergedValue = (window as any).CoreRulesRuntime?.getMergedValue?.(
            64,
            64,
            "pow2",
            maxTile
          );

          return {
            modeKey: String(manager?.modeKey || manager?.mode || ""),
            activeModeKey: String(
              document.getElementById("practice-mode-picker-btn")?.getAttribute("data-active-practice-mode-key") || ""
            ),
            maxTile,
            configMaxTile: Number(cfg?.max_tile || 0),
            enforceMaxTile: Boolean(cfg?.special_rules?.enforce_max_tile),
            mergedValue: mergedValue === null ? null : Number(mergedValue),
            has128Selection: document.querySelector('.selection-tile[data-value="128"]') !== null
          };
        })
      )
      .toMatchObject({
        modeKey: "practice",
        activeModeKey: "capped_4x4_pow2_64_no_undo",
        maxTile: 64,
        configMaxTile: 64,
        enforceMaxTile: true,
        mergedValue: null,
        has128Selection: false
      });

    const blockedInsert = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      if (!manager) return null;
      manager.insertCustomTile(0, 0, 128);
      const tile = manager.grid?.cells?.[0]?.[0] || null;
      return tile ? Number(tile.value) || 0 : 0;
    });
    expect(blockedInsert).toBe(0);
  });
});
