import { expect, test } from "@playwright/test";

const STORAGE_KEY = "settings_custom_secondary_timer_rules_by_family_v1";

async function stubApi(page: import("@playwright/test").Page) {
  await page.route("**/api/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] })
    });
  });
}

test.describe("custom secondary timers", () => {
  test("previews the saved rule hierarchy beside the editor and expands by parent", async ({ page }) => {
    await page.addInitScript((storageKey) => {
      window.localStorage.removeItem(storageKey);
      window.localStorage.setItem("ui_language_v1", "zh");
    }, STORAGE_KEY);

    const response = await page.goto("/palette.html#timer-settings", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();
    const editor = page.locator("#custom-secondary-timer-editor");
    if (!(await editor.evaluate((node) => (node as HTMLDetailsElement).open))) {
      await editor.locator("summary").click();
    }

    const input = page.locator("#custom-secondary-timer-rules");
    const preview = page.locator("#custom-secondary-timer-preview");
    const ruleText = [
      "32",
      "32+2",
      "32+4",
      "32+8",
      "32+8+4",
      "32+16",
      "32+16+2",
      "32+16+4",
      "32+16+8"
    ].join("\n");

    await expect(preview.locator("[data-timer-preview-parent]")).toHaveCount(0);
    await expect(preview).toContainText("保存规则后");
    await input.fill(ruleText);
    await expect(preview.locator("[data-timer-preview-parent]")).toHaveCount(0);

    await page.locator("#custom-secondary-timer-save").click();
    const parent = preview.locator("[data-timer-preview-parent='32']");
    const childGroup = preview.locator("#custom-secondary-timer-preview-children-pow2-32");
    const children = preview.locator("[data-timer-preview-child='32']");
    await expect(parent).toHaveCount(1);
    await expect(parent).toHaveAttribute("aria-expanded", "false");
    await expect(children).toHaveCount(8);
    await expect(childGroup).toBeHidden();

    await parent.click();
    await expect(parent).toHaveAttribute("aria-expanded", "true");
    await expect(childGroup).toBeVisible();
    expect(await children.evaluateAll((nodes) => nodes.map((node) => ({
      label: node.querySelector(".custom-secondary-timer-preview-legend")?.textContent,
      level: node.getAttribute("data-timer-preview-level")
    })))).toEqual([
      { label: "2", level: "1" },
      { label: "4", level: "1" },
      { label: "8", level: "1" },
      { label: "4", level: "2" },
      { label: "16", level: "1" },
      { label: "2", level: "2" },
      { label: "4", level: "2" },
      { label: "8", level: "2" }
    ]);
    const indent = await page.evaluate(() => {
      const level1 = document.querySelector<HTMLElement>("[data-timer-preview-rule='32+8'] .custom-secondary-timer-preview-legend");
      const level2 = document.querySelector<HTMLElement>("[data-timer-preview-rule='32+8+4'] .custom-secondary-timer-preview-legend");
      return (level2?.getBoundingClientRect().left || 0) - (level1?.getBoundingClientRect().left || 0);
    });
    expect(indent).toBe(10);

    const layout = await page.evaluate(() => {
      const inputRect = document.getElementById("custom-secondary-timer-rules")?.getBoundingClientRect();
      const previewRect = document.getElementById("custom-secondary-timer-preview")?.getBoundingClientRect();
      return {
        inputRight: inputRect?.right || 0,
        previewLeft: previewRect?.left || 0
      };
    });
    expect(layout.previewLeft).toBeGreaterThan(layout.inputRight);

    await input.fill("32\n32+2");
    await expect(children).toHaveCount(8);

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileLayout = await page.evaluate(() => {
      const inputRect = document.getElementById("custom-secondary-timer-rules")?.getBoundingClientRect();
      const previewRect = document.getElementById("custom-secondary-timer-preview")?.getBoundingClientRect();
      return {
        inputBottom: inputRect?.bottom || 0,
        previewTop: previewRect?.top || 0,
        previewRight: previewRect?.right || 0,
        viewportWidth: document.documentElement.clientWidth
      };
    });
    expect(mobileLayout.previewTop).toBeGreaterThan(mobileLayout.inputBottom);
    expect(mobileLayout.previewRight).toBeLessThanOrEqual(mobileLayout.viewportWidth);
  });

  test("saves whole-rule configs for the next game and renders exact/covered states", async ({ page }) => {
    await stubApi(page);
    await page.addInitScript((storageKey) => {
      window.localStorage.removeItem(storageKey);
      window.localStorage.removeItem("savedGameStateByMode:v1:standard_4x4_pow2_no_undo");
      window.localStorage.removeItem("savedGameStateLiteByMode:v1:standard_4x4_pow2_no_undo");
      window.localStorage.setItem("ui_language_v1", "zh");
      window.name = "";
    }, STORAGE_KEY);

    const response = await page.goto("/2048.html", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return Boolean(
        manager &&
          typeof manager.restart === "function" &&
          typeof manager.restartWithBoard === "function" &&
          typeof (window as any).openSettingsModal === "function" &&
          typeof (window as any).stampCustomSecondaryTimersForBoard === "function"
      );
    }, null, { timeout: 15_000 });

    await expect(page.locator("#timerbox [data-secondary-rule]")).toHaveCount(0);
    await page.evaluate(() => (window as any).openSettingsModal());
    await expect(page.locator("#settings-modal")).toHaveCSS("display", "flex");
    await expect(page.locator("#settings-modal #custom-secondary-timer-editor")).toHaveCount(0);

    const settingsPage = await page.context().newPage();
    const settingsResponse = await settingsPage.goto("/palette.html", { waitUntil: "domcontentloaded" });
    expect(settingsResponse?.ok()).toBeTruthy();
    await expect(settingsPage.locator(".palette-title")).toHaveText("设置");
    await expect(settingsPage.locator("#custom-secondary-timer-editor")).not.toHaveAttribute("open", "");
    await expect(settingsPage.locator("#custom-secondary-timer-rules")).toBeHidden();
    await settingsPage.locator("#custom-secondary-timer-editor summary").click();
    await expect(settingsPage.locator("#custom-secondary-timer-rules")).toBeVisible();
    await expect(settingsPage.locator("#custom-secondary-timer-range-end option[value='67108864']")).toHaveCount(1);
    await expect(settingsPage.locator("#custom-secondary-timer-range-end option[value='134217728']")).toHaveCount(0);
    await expect(settingsPage.locator("#custom-secondary-timer-rules")).toHaveAttribute("placeholder", "32\n32+2\n32+4");
    await settingsPage.locator("#custom-secondary-timer-range-start").selectOption("32");
    await settingsPage.locator("#custom-secondary-timer-range-end").selectOption("64");
    await settingsPage.locator("#custom-secondary-timer-rules").fill("will be replaced");
    await settingsPage.locator("#custom-secondary-timer-generate").click();
    await expect(settingsPage.locator("#custom-secondary-timer-rules")).toHaveValue([
      "32", "32+2", "32+4", "32+8", "32+16", "32+16+2", "32+16+4", "32+16+8",
      "",
      "64", "64+2", "64+4", "64+8", "64+16", "64+32", "64+32+2", "64+32+4", "64+32+8", "64+32+16"
    ].join("\n"));
    await expect(settingsPage.locator("#custom-secondary-timer-note")).toContainText("检查后点击保存");
    expect(await settingsPage.evaluate((storageKey) => window.localStorage.getItem(storageKey), STORAGE_KEY)).toBeNull();

    await settingsPage.locator("[data-timer-family='fibonacci']").click();
    await expect(settingsPage.locator("#custom-secondary-timer-rules")).toHaveAttribute("placeholder", "13\n13+1\n13+2");
    await expect(settingsPage.locator("#custom-secondary-timer-range-end option[value='2178309']")).toHaveCount(1);
    await expect(settingsPage.locator("#custom-secondary-timer-range-end option[value='3524578']")).toHaveCount(0);
    await settingsPage.locator("#custom-secondary-timer-generate").click();
    await expect(settingsPage.locator("#custom-secondary-timer-rules")).toHaveValue([
      "13", "13+1", "13+2", "13+3", "13+5", "13+8", "13+8+1", "13+8+2", "13+8+3", "13+8+5"
    ].join("\n"));
    await settingsPage.locator("[data-timer-family='pow2']").click();

    await settingsPage.locator("#custom-secondary-timer-rules").fill("32\n32+3");
    await settingsPage.locator("#custom-secondary-timer-save").click();
    await expect(settingsPage.locator("#custom-secondary-timer-rules")).toHaveAttribute("aria-invalid", "true");
    await expect(settingsPage.locator("#custom-secondary-timer-note")).toContainText("第 2 行");
    expect(await settingsPage.evaluate((storageKey) => window.localStorage.getItem(storageKey), STORAGE_KEY)).toBeNull();

    const ruleText = "32\n32+2\n32+4\n32+16+2";
    await settingsPage.locator("#custom-secondary-timer-rules").fill(ruleText);
    await settingsPage.locator("#custom-secondary-timer-save").click();
    await expect(settingsPage.locator("#custom-secondary-timer-rules")).not.toHaveAttribute("aria-invalid", "true");
    await expect(settingsPage.locator("#custom-secondary-timer-note")).toContainText("下一局");
    await settingsPage.close();

    const beforeRestart = await page.evaluate((storageKey) => {
      const manager = (window as any).game_manager;
      return {
        activeRuleText: String(manager.customSecondaryTimerRuleText || ""),
        rowCount: document.querySelectorAll("#timerbox [data-secondary-rule]").length,
        saved: JSON.parse(window.localStorage.getItem(storageKey) || "{}")
      };
    }, STORAGE_KEY);
    expect(beforeRestart.activeRuleText).toBe("");
    expect(beforeRestart.rowCount).toBe(0);
    expect(beforeRestart.saved.pow2).toBe(ruleText);

    const snapshot = await page.evaluate(async () => {
      const manager = (window as any).game_manager;
      manager.restart();
      manager.restartWithBoard(
        [
          [32, 4, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        manager.modeConfig || null,
        {
          preserveSeed: true,
          preserveMode: true,
          skipStartTiles: true,
          disableStateRestore: true
        }
      );
      (window as any).stampCustomSecondaryTimersForBoard(manager, "00:12");
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const readTimer = (id: string) => {
        const node = document.getElementById(id);
        return {
          text: String(node?.textContent || ""),
          kind: node?.getAttribute("data-secondary-hit-kind") || "",
          coveredBy: node?.getAttribute("data-secondary-covered-by") || "",
          title: node?.getAttribute("title") || "",
          ariaLabel: node?.getAttribute("aria-label") || ""
        };
      };
      return {
        activeRuleText: String(manager.customSecondaryTimerRuleText || ""),
        rules: Array.from(document.querySelectorAll("#timerbox [data-secondary-rule]"))
          .map((node) => node.getAttribute("data-secondary-rule")),
        hierarchy: Array.from(document.querySelectorAll<HTMLElement>("#timerbox [data-secondary-rule]"))
          .map((row) => ({
            rule: row.getAttribute("data-secondary-rule"),
            label: row.querySelector(".timer-secondary-legend")?.textContent,
            paddingLeft: row.style.paddingLeft,
            title: row.querySelector(".timer-secondary-legend")?.getAttribute("title")
          })),
        legacyRowCount: document.querySelectorAll(
          "#timerbox [id^='timer-row-secondary-']:not([id^='timer-row-secondary-rule-'])"
        ).length,
        covered: readTimer("timer-secondary-rule-32-2"),
        exact: readTimer("timer-secondary-rule-32-4")
      };
    });

    expect(snapshot.activeRuleText).toBe(ruleText);
    expect(snapshot.rules).toEqual(["32+2", "32+4", "32+16+2"]);
    expect(snapshot.hierarchy).toEqual([
      { rule: "32+2", label: "2", paddingLeft: "5px", title: "32+2" },
      { rule: "32+4", label: "4", paddingLeft: "5px", title: "32+4" },
      { rule: "32+16+2", label: "2", paddingLeft: "10px", title: "32+16+2" }
    ]);
    expect(snapshot.legacyRowCount).toBe(0);
    expect(snapshot.covered).toMatchObject({
      text: "00:12 ↑",
      kind: "covered",
      coveredBy: "32+4"
    });
    expect(snapshot.covered.title).toContain("32+4");
    expect(snapshot.covered.ariaLabel).toContain("32+2");
    expect(snapshot.exact).toMatchObject({
      text: "00:12",
      kind: "exact",
      coveredBy: ""
    });
  });

  test("places Fibonacci child rules next to the fixed slot mapped to their parent milestone", async ({ page }) => {
    await stubApi(page);
    await page.addInitScript(({ storageKey, ruleText }) => {
      window.localStorage.setItem(storageKey, JSON.stringify({ fibonacci: ruleText }));
      window.localStorage.removeItem("savedGameStateByMode:v1:practice");
      window.localStorage.removeItem("savedGameStateLiteByMode:v1:practice");
      window.name = "";
    }, { storageKey: STORAGE_KEY, ruleText: "34\n34+1\n34+2" });

    const response = await page.goto(
      "/Practice_board.html?practice_ruleset=fibonacci&practice_fresh=1",
      { waitUntil: "domcontentloaded" }
    );
    expect(response?.ok()).toBeTruthy();
    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return manager?.ruleset === "fibonacci" &&
        document.querySelectorAll("#timerbox [data-secondary-parent='34']").length === 2;
    }, null, { timeout: 15_000 });

    const snapshot = await page.evaluate(() => {
      const manager = (window as any).game_manager;
      const timerBox = document.getElementById("timerbox");
      const children = timerBox ? Array.from(timerBox.children) : [];
      const parentRow = document.getElementById("timer-row-128");
      const firstRuleRow = document.getElementById("timer-row-secondary-rule-34-1");
      const secondRuleRow = document.getElementById("timer-row-secondary-rule-34-2");
      return {
        ruleset: manager.ruleset,
        milestoneSlot: String(manager.timerMilestoneSlotByValue?.["34"] || ""),
        parentLegend: String(parentRow?.querySelector(".timertile")?.textContent || ""),
        parentIndex: children.indexOf(parentRow as Element),
        firstRuleIndex: children.indexOf(firstRuleRow as Element),
        secondRuleIndex: children.indexOf(secondRuleRow as Element),
        firstLegendClass: String(firstRuleRow?.querySelector(".timertile")?.className || "")
      };
    });

    expect(snapshot.ruleset).toBe("fibonacci");
    expect(snapshot.milestoneSlot).toBe("128");
    expect(snapshot.parentLegend).toBe("34");
    expect(snapshot.firstRuleIndex).toBe(snapshot.parentIndex + 1);
    expect(snapshot.secondRuleIndex).toBe(snapshot.parentIndex + 2);
    expect(snapshot.firstLegendClass).toContain("timer-legend-128");
  });

  test("sizes parent timer rows from the active mode maximum", async ({ page }) => {
    await stubApi(page);
    await page.addInitScript((storageKey) => {
      window.localStorage.removeItem(storageKey);
      window.name = "";
    }, STORAGE_KEY);

    const cases = [
      { path: "/2048.html", modeKey: "standard_4x4_pow2_no_undo", lastSlot: 131072, lastMilestone: 131072, count: 13 },
      { path: "/play.html?mode_key=board_2x4_pow2_no_undo", modeKey: "board_2x4_pow2_no_undo", lastSlot: 512, lastMilestone: 512, count: 5 },
      { path: "/play.html?mode_key=board_3x3_pow2_no_undo", modeKey: "board_3x3_pow2_no_undo", lastSlot: 1024, lastMilestone: 1024, count: 6 },
      { path: "/play.html?mode_key=board_3x4_pow2_no_undo", modeKey: "board_3x4_pow2_no_undo", lastSlot: 8192, lastMilestone: 8192, count: 9 },
      { path: "/play.html?mode_key=board_5x5_pow2_no_undo", modeKey: "board_5x5_pow2_no_undo", lastSlot: 67108864, lastMilestone: 67108864, count: 22 },
      { path: "/play.html?mode_key=capped_4x4_pow2_64_no_undo", modeKey: "capped_4x4_pow2_64_no_undo", lastSlot: 64, lastMilestone: 64, count: 2 },
      { path: "/play.html?mode_key=fib_4x2_no_undo", modeKey: "fib_4x2_no_undo", lastSlot: 32768, lastMilestone: 1597, count: 11 },
      { path: "/play.html?mode_key=fib_3x3_no_undo", modeKey: "fib_3x3_no_undo", lastSlot: 131072, lastMilestone: 4181, count: 13 },
      { path: "/play.html?mode_key=fib_4x3_no_undo", modeKey: "fib_4x3_no_undo", lastSlot: 8388608, lastMilestone: 75025, count: 19 },
      { path: "/play.html?mode_key=fib_4x4_no_undo", modeKey: "fib_4x4_no_undo", lastSlot: 1073741824, lastMilestone: 2178309, count: 26 }
    ];

    for (const expected of cases) {
      const response = await page.goto(expected.path, { waitUntil: "domcontentloaded" });
      expect(response?.ok(), expected.path).toBeTruthy();
      await page.waitForFunction((modeKey) => {
        const manager = (window as any).game_manager;
        return manager?.modeKey === modeKey && Array.isArray(manager.timerMilestones);
      }, expected.modeKey, { timeout: 15_000 });

      const snapshot = await page.evaluate(() => {
        const manager = (window as any).game_manager;
        const slots = Array.isArray((window as any).GameManager?.TIMER_SLOT_IDS)
          ? (window as any).GameManager.TIMER_SLOT_IDS.slice()
          : [];
        const milestones = Array.isArray(manager.timerMilestones)
          ? manager.timerMilestones.slice()
          : [];
        const lastSlot = Number(slots.at(-1) || 0);
        const row = document.getElementById("timer-row-" + String(lastSlot));
        return {
          slots,
          milestones,
          hasLastRow: !!row,
          lastLegend: String(row?.querySelector(".timertile")?.textContent || "")
        };
      });

      expect(snapshot.slots).toHaveLength(expected.count);
      expect(snapshot.milestones).toHaveLength(expected.count);
      expect(snapshot.slots.at(-1)).toBe(expected.lastSlot);
      expect(snapshot.milestones.at(-1)).toBe(expected.lastMilestone);
      expect(snapshot.hasLastRow).toBe(true);
      expect(snapshot.lastLegend).toBe(String(expected.lastMilestone));
    }
  });
});
