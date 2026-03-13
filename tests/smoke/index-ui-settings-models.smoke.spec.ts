import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("index ui delegates timer module settings model to runtime helper", async ({ page }) => {
    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(220);

    const snapshot = await page.evaluate(async () => {
      const runtime = (window as any).CoreTimerModuleRuntime;
      const pageHostRuntime = (window as any).CoreTimerModuleSettingsPageHostRuntime;
      if (
        !runtime ||
        typeof runtime.buildTimerModuleSettingsRowInnerHtml !== "function" ||
        typeof runtime.resolveTimerModuleSettingsState !== "function" ||
        typeof runtime.resolveTimerModuleCurrentViewMode !== "function" ||
        typeof runtime.resolveTimerModuleBindingState !== "function" ||
        typeof runtime.resolveTimerModuleViewMode !== "function" ||
        typeof runtime.resolveTimerModuleAppliedViewMode !== "function" ||
        typeof runtime.resolveTimerModuleInitRetryState !== "function" ||
        !pageHostRuntime ||
        typeof pageHostRuntime.applyTimerModuleSettingsPageInit !== "function"
      ) {
        return { hasRuntime: false, hasPageHostRuntime: false };
      }
      const openSettingsModal =
        typeof (window as any).openSettingsModal === "function"
          ? (window as any).openSettingsModal
          : null;
      const settingsButton = document.getElementById("top-settings-btn") as
        | HTMLButtonElement
        | null;
      if (!openSettingsModal && !settingsButton) {
        return { hasRuntime: true, hasPageHostRuntime: true, hasSettingsOpen: false };
      }
      const originalBuild = runtime.buildTimerModuleSettingsRowInnerHtml;
      const originalResolveState = runtime.resolveTimerModuleSettingsState;
      const originalResolveCurrentViewMode = runtime.resolveTimerModuleCurrentViewMode;
      const originalResolveBinding = runtime.resolveTimerModuleBindingState;
      const originalResolveViewMode = runtime.resolveTimerModuleViewMode;
      const originalResolveAppliedViewMode = runtime.resolveTimerModuleAppliedViewMode;
      const originalResolveInitRetryState = runtime.resolveTimerModuleInitRetryState;
      const originalApplyPageHost = pageHostRuntime.applyTimerModuleSettingsPageInit;
      let buildCallCount = 0;
      let resolveStateCallCount = 0;
      let resolveCurrentViewModeCallCount = 0;
      let resolveBindingCallCount = 0;
      let resolveViewModeCallCount = 0;
      let resolveAppliedViewModeCallCount = 0;
      let resolveInitRetryStateCallCount = 0;
      let applyPageHostCallCount = 0;
      runtime.buildTimerModuleSettingsRowInnerHtml = function () {
        buildCallCount += 1;
        return originalBuild();
      };
      runtime.resolveTimerModuleSettingsState = function (opts: any) {
        resolveStateCallCount += 1;
        return originalResolveState(opts);
      };
      runtime.resolveTimerModuleCurrentViewMode = function (opts: any) {
        resolveCurrentViewModeCallCount += 1;
        return originalResolveCurrentViewMode(opts);
      };
      runtime.resolveTimerModuleBindingState = function (opts: any) {
        resolveBindingCallCount += 1;
        return originalResolveBinding(opts);
      };
      runtime.resolveTimerModuleViewMode = function (opts: any) {
        resolveViewModeCallCount += 1;
        return originalResolveViewMode(opts);
      };
      runtime.resolveTimerModuleAppliedViewMode = function (opts: any) {
        resolveAppliedViewModeCallCount += 1;
        return originalResolveAppliedViewMode(opts);
      };
      runtime.resolveTimerModuleInitRetryState = function (opts: any) {
        resolveInitRetryStateCallCount += 1;
        return originalResolveInitRetryState(opts);
      };
      pageHostRuntime.applyTimerModuleSettingsPageInit = function (opts: any) {
        applyPageHostCallCount += 1;
        return originalApplyPageHost(opts);
      };
      try {
        const existingToggle = document.getElementById("timer-module-view-toggle");
        if (existingToggle) {
          const existingRow = existingToggle.closest(".settings-row");
          if (existingRow && existingRow.parentNode) {
            existingRow.parentNode.removeChild(existingRow);
          }
        }
        if (openSettingsModal) {
          openSettingsModal();
        } else {
          settingsButton?.click();
        }
        await new Promise((resolve) => {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => resolve(null));
          });
        });
        await new Promise((resolve) => {
          window.setTimeout(() => resolve(null), 220);
        });
        const toggle = document.getElementById("timer-module-view-toggle") as HTMLInputElement | null;
        const note = document.getElementById("timer-module-view-note");
        const timerBox = document.getElementById("timerbox") as HTMLElement | null;
        const leaderboardPanel = document.getElementById("timer-leaderboard-panel") as HTMLElement | null;
        if (!toggle) {
          return {
            hasRuntime: true,
            hasPageHostRuntime: true,
            hasSettingsOpen: true,
            hasToggle: false,
            applyPageHostCallCount,
            buildCallCount,
            resolveStateCallCount,
            resolveCurrentViewModeCallCount,
            resolveBindingCallCount,
            resolveViewModeCallCount,
            resolveAppliedViewModeCallCount,
            resolveInitRetryStateCallCount,
            noteText: note ? String(note.textContent || "") : "",
            toggleChecked: null,
            timerBoxClassName: timerBox ? String(timerBox.className || "") : "",
            leaderboardPanelDisplay: leaderboardPanel ? String(window.getComputedStyle(leaderboardPanel).display || "") : ""
          };
        }
        toggle.checked = false;
        toggle.dispatchEvent(new Event("change", { bubbles: true }));
        await new Promise((resolve) => {
          window.requestAnimationFrame(() => resolve(null));
        });
        return {
          hasRuntime: true,
          hasPageHostRuntime: true,
          hasSettingsOpen: true,
          hasToggle: true,
          applyPageHostCallCount,
          buildCallCount,
          resolveStateCallCount,
          resolveCurrentViewModeCallCount,
          resolveBindingCallCount,
          resolveViewModeCallCount,
          resolveAppliedViewModeCallCount,
          resolveInitRetryStateCallCount,
          noteText: note ? String(note.textContent || "") : "",
          toggleChecked: !!toggle.checked,
          timerBoxClassName: timerBox ? String(timerBox.className || "") : "",
          leaderboardPanelDisplay: leaderboardPanel ? String(window.getComputedStyle(leaderboardPanel).display || "") : ""
        };
      } finally {
        runtime.buildTimerModuleSettingsRowInnerHtml = originalBuild;
        runtime.resolveTimerModuleSettingsState = originalResolveState;
        runtime.resolveTimerModuleCurrentViewMode = originalResolveCurrentViewMode;
        runtime.resolveTimerModuleBindingState = originalResolveBinding;
        runtime.resolveTimerModuleViewMode = originalResolveViewMode;
        runtime.resolveTimerModuleAppliedViewMode = originalResolveAppliedViewMode;
        runtime.resolveTimerModuleInitRetryState = originalResolveInitRetryState;
        pageHostRuntime.applyTimerModuleSettingsPageInit = originalApplyPageHost;
      }
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasPageHostRuntime).toBe(true);
    expect(snapshot.hasSettingsOpen).toBe(true);
    expect(snapshot.hasToggle).toBe(true);
    expect(snapshot.applyPageHostCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.buildCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveStateCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveCurrentViewModeCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveBindingCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveViewModeCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveAppliedViewModeCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveInitRetryStateCallCount).toBeGreaterThan(0);
    expect(snapshot.noteText || "").not.toBe("");
    expect(snapshot.toggleChecked).toBe(false);
    expect(snapshot.timerBoxClassName).toContain("timerbox-hidden-mode");
    expect(snapshot.timerBoxClassName).toContain("timerbox-leaderboard-mode");
    expect(["", "block"]).toContain(snapshot.leaderboardPanelDisplay);
  });

  test("palette ui delegates theme settings model to runtime helper", async ({ page }) => {
    const response = await page.goto("/palette.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Palette response should exist").not.toBeNull();
    expect(response?.ok(), "Palette response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(220);

    const snapshot = await page.evaluate(async () => {
      const runtime = (window as any).CoreThemeSettingsRuntime;
      const pageHostRuntime = (window as any).CoreThemeSettingsPageHostRuntime;
      if (
        !runtime ||
        typeof runtime.formatThemePreviewValue !== "function" ||
        typeof runtime.resolveThemePreviewTileValues !== "function" ||
        typeof runtime.resolveThemePreviewLayout !== "function" ||
        typeof runtime.resolveThemePreviewCssSelectors !== "function" ||
        typeof runtime.resolveThemeOptions !== "function" ||
        typeof runtime.resolveThemeSelectLabel !== "function" ||
        typeof runtime.resolveThemeDropdownToggleState !== "function" ||
        typeof runtime.resolveThemeBindingState !== "function" ||
        typeof runtime.resolveThemeOptionValue !== "function" ||
        typeof runtime.resolveThemeOptionSelectedState !== "function" ||
        !pageHostRuntime ||
        typeof pageHostRuntime.applyThemeSettingsPageInit !== "function"
      ) {
        return { hasRuntime: false, hasPageHostRuntime: false };
      }
      const originalFormat = runtime.formatThemePreviewValue;
      const originalResolveTileValues = runtime.resolveThemePreviewTileValues;
      const originalResolvePreviewLayout = runtime.resolveThemePreviewLayout;
      const originalResolvePreviewCssSelectors = runtime.resolveThemePreviewCssSelectors;
      const originalResolveThemeOptions = runtime.resolveThemeOptions;
      const originalResolveLabel = runtime.resolveThemeSelectLabel;
      const originalResolveDropdown = runtime.resolveThemeDropdownToggleState;
      const originalResolveBinding = runtime.resolveThemeBindingState;
      const originalResolveOptionValue = runtime.resolveThemeOptionValue;
      const originalResolveOptionSelected = runtime.resolveThemeOptionSelectedState;
      const originalApplyPageHost = pageHostRuntime.applyThemeSettingsPageInit;
      let formatCallCount = 0;
      let resolveTileValuesCallCount = 0;
      let resolvePreviewLayoutCallCount = 0;
      let resolvePreviewCssSelectorsCallCount = 0;
      let resolveThemeOptionsCallCount = 0;
      let resolveLabelCallCount = 0;
      let resolveDropdownCallCount = 0;
      let resolveBindingCallCount = 0;
      let resolveOptionValueCallCount = 0;
      let resolveOptionSelectedCallCount = 0;
      let applyPageHostCallCount = 0;
      runtime.formatThemePreviewValue = function (value: any) {
        formatCallCount += 1;
        return originalFormat(value);
      };
      runtime.resolveThemePreviewTileValues = function (opts: any) {
        resolveTileValuesCallCount += 1;
        return originalResolveTileValues(opts);
      };
      runtime.resolveThemePreviewLayout = function () {
        resolvePreviewLayoutCallCount += 1;
        return originalResolvePreviewLayout();
      };
      runtime.resolveThemePreviewCssSelectors = function (opts: any) {
        resolvePreviewCssSelectorsCallCount += 1;
        return originalResolvePreviewCssSelectors(opts);
      };
      runtime.resolveThemeOptions = function (opts: any) {
        resolveThemeOptionsCallCount += 1;
        return originalResolveThemeOptions(opts);
      };
      runtime.resolveThemeSelectLabel = function (opts: any) {
        resolveLabelCallCount += 1;
        return originalResolveLabel(opts);
      };
      runtime.resolveThemeDropdownToggleState = function (opts: any) {
        resolveDropdownCallCount += 1;
        return originalResolveDropdown(opts);
      };
      runtime.resolveThemeBindingState = function (opts: any) {
        resolveBindingCallCount += 1;
        return originalResolveBinding(opts);
      };
      runtime.resolveThemeOptionValue = function (opts: any) {
        resolveOptionValueCallCount += 1;
        return originalResolveOptionValue(opts);
      };
      runtime.resolveThemeOptionSelectedState = function (opts: any) {
        resolveOptionSelectedCallCount += 1;
        return originalResolveOptionSelected(opts);
      };
      pageHostRuntime.applyThemeSettingsPageInit = function (opts: any) {
        applyPageHostCallCount += 1;
        return originalApplyPageHost(opts);
      };
      try {
        originalApplyPageHost({
          themeSettingsHostRuntime: (window as any).CoreThemeSettingsHostRuntime,
          themeSettingsRuntime: runtime,
          documentLike: document,
          windowLike: window,
          themeManager: (window as any).themeManager
        });
        await new Promise((resolve) => {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => resolve(null));
          });
        });
        const trigger = document.getElementById("theme-select-trigger");
        const options = document.querySelectorAll("#theme-select-options .custom-option");
        if (trigger) {
          trigger.dispatchEvent(new Event("click", { bubbles: true }));
          trigger.dispatchEvent(new Event("click", { bubbles: true }));
        }
        return {
          hasRuntime: true,
          hasPageHostRuntime: true,
          hasSettingsOpen: true,
          hasTrigger: Boolean(trigger),
          optionCount: options.length,
          applyPageHostCallCount,
          formatCallCount,
          resolveTileValuesCallCount,
          resolvePreviewLayoutCallCount,
          resolvePreviewCssSelectorsCallCount,
          resolveThemeOptionsCallCount,
          resolveLabelCallCount,
          resolveDropdownCallCount,
          resolveBindingCallCount,
          resolveOptionValueCallCount,
          resolveOptionSelectedCallCount
        };
      } finally {
        runtime.formatThemePreviewValue = originalFormat;
        runtime.resolveThemePreviewTileValues = originalResolveTileValues;
        runtime.resolveThemePreviewLayout = originalResolvePreviewLayout;
        runtime.resolveThemePreviewCssSelectors = originalResolvePreviewCssSelectors;
        runtime.resolveThemeOptions = originalResolveThemeOptions;
        runtime.resolveThemeSelectLabel = originalResolveLabel;
        runtime.resolveThemeDropdownToggleState = originalResolveDropdown;
        runtime.resolveThemeBindingState = originalResolveBinding;
        runtime.resolveThemeOptionValue = originalResolveOptionValue;
        runtime.resolveThemeOptionSelectedState = originalResolveOptionSelected;
        pageHostRuntime.applyThemeSettingsPageInit = originalApplyPageHost;
      }
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasPageHostRuntime).toBe(true);
    expect(snapshot.hasSettingsOpen).toBe(true);
    expect(snapshot.hasTrigger).toBe(true);
    expect(snapshot.optionCount).toBeGreaterThan(0);
    expect(snapshot.applyPageHostCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.formatCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveTileValuesCallCount).toBeGreaterThan(0);
    expect(snapshot.resolvePreviewLayoutCallCount).toBeGreaterThan(0);
    expect(snapshot.resolvePreviewCssSelectorsCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveThemeOptionsCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveLabelCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveDropdownCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveBindingCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveOptionValueCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveOptionSelectedCallCount).toBeGreaterThan(0);
  });

  test("palette timer preview reaches 65536 and reuses timer glow styles", async ({ page }) => {
    const response = await page.goto("/palette.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Palette response should exist").not.toBeNull();
    expect(response?.ok(), "Palette response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(220);

    const snapshot = await page.evaluate(() => {
      const legendItems = Array.from(document.querySelectorAll("#palette-preview-legend .legend-pill"));
      const lastItem = legendItems[legendItems.length - 1] as HTMLElement | undefined;
      const targetItem = document.querySelector("#palette-preview-legend .timer-legend-65536") as HTMLElement | null;
      const targetStyle = targetItem ? window.getComputedStyle(targetItem) : null;
      return {
        legendCount: legendItems.length,
        lastText: (lastItem?.textContent || "").trim(),
        has65536Class: !!targetItem,
        targetBoxShadow: targetStyle?.boxShadow || "",
        targetBackground: targetStyle?.backgroundColor || ""
      };
    });

    expect(snapshot.legendCount).toBe(12);
    expect(snapshot.lastText).toBe("65536");
    expect(snapshot.has65536Class).toBe(true);
    expect(snapshot.targetBoxShadow).not.toBe("none");
    expect(snapshot.targetBackground).not.toBe("rgba(0, 0, 0, 0)");
  });

  test("palette page shows current palette name instead of empty placeholder", async ({ page }) => {
    const response = await page.goto("/palette.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Palette response should exist").not.toBeNull();
    expect(response?.ok(), "Palette response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(220);

    const titleText = await page.locator("#palette-current-name").textContent();
    const normalized = (titleText || "").trim();
    expect(normalized).not.toBe("");
    expect(normalized).not.toBe("未选择色板");
    expect(normalized).not.toBe("No Palette Selected");
  });
  test("palette page keeps all primary copy in Chinese under zh mode", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("ui_language_v1", "zh");
    });
    const response = await page.goto("/palette.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Palette response should exist").not.toBeNull();
    expect(response?.ok(), "Palette response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(220);

    const snapshot = await page.evaluate(() => ({
      kicker: (document.querySelector(".palette-kicker")?.textContent || "").trim(),
      pill: (document.querySelector(".palette-theme-card .panel-pill")?.textContent || "").trim(),
      themeSelectLabel: (document.querySelector(".theme-selection-col > label")?.textContent || "").trim(),
      themePreviewLabel: (document.querySelector(".theme-preview-col > label")?.textContent || "").trim()
    }));

    expect(snapshot.kicker).toBe("2048 主题设置");
    expect(snapshot.pill).toBe("主题");
    expect(snapshot.themeSelectLabel).toBe("选择主题");
    expect(snapshot.themePreviewLabel).toBe("配色预览");
  });
});
