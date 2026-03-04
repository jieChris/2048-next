import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("core-adapter shadow path updates parity state", async ({ page }) => {
    const legacyResponse = await page.goto("/index.html?engine_adapter=legacy-bridge", {
      waitUntil: "domcontentloaded"
    });
    expect(legacyResponse, "Legacy seed response should exist").not.toBeNull();
    expect(legacyResponse?.ok(), "Legacy seed response should be 2xx").toBeTruthy();

    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(300);

    const seededLegacy = await page.evaluate(() => {
      const payload = (window as any).__legacyEngine;
      const manager = (window as any).game_manager;
      if (
        !payload ||
        payload.adapterMode !== "legacy-bridge" ||
        typeof payload.readAdapterParityReport !== "function" ||
        !manager ||
        typeof manager.publishAdapterMoveResult !== "function"
      ) {
        return false;
      }

      manager.publishAdapterMoveResult({
        reason: "smoke-ab-legacy",
        direction: 1,
        moved: true
      });

      const report = payload.readAdapterParityReport();
      return Boolean(report && report.adapterMode === "legacy-bridge");
    });
    expect(seededLegacy, "legacy bridge parity seed failed").toBe(true);

    const response = await page.goto("/index.html?engine_adapter=core-adapter", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Document response should exist").not.toBeNull();
    expect(response?.ok(), "Document response should be 2xx").toBeTruthy();

    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(400);

    const result = await page.evaluate(() => {
      const payload = (window as any).__legacyEngine;
      const manager = (window as any).game_manager;
      if (
        !payload ||
        payload.adapterMode !== "core-adapter" ||
        typeof payload.readAdapterParityState !== "function" ||
        typeof payload.readAdapterParityReport !== "function" ||
        typeof payload.readAdapterParityABDiff !== "function" ||
        !manager ||
        typeof manager.publishAdapterMoveResult !== "function"
      ) {
        return null;
      }

      const before = payload.readAdapterParityState();
      const beforeReport = payload.readAdapterParityReport();
      const beforeABDiff = payload.readAdapterParityABDiff();
      manager.publishAdapterMoveResult({
        reason: "smoke-core-adapter",
        direction: 2,
        moved: true
      });
      const after = payload.readAdapterParityState();
      const afterReport = payload.readAdapterParityReport();
      const afterABDiff = payload.readAdapterParityABDiff();
      return {
        payloadModeKey: payload.modeKey || "unknown",
        payloadParityReport: payload.adapterParityReport || null,
        payloadParityABDiff: payload.adapterParityABDiff || null,
        before,
        after,
        beforeReport,
        afterReport,
        beforeABDiff,
        afterABDiff
      };
    });

    expect(result, "core-adapter payload contract mismatch").not.toBeNull();
    const beforeTotal = result?.before?.counters?.totalEvents || 0;
    const beforeMoved = result?.before?.counters?.movedEvents || 0;
    expect(result?.after?.lastReason).toBe("smoke-core-adapter");
    expect(result?.after?.lastDirection).toBe(2);
    expect(result?.after?.counters?.totalEvents).toBe(beforeTotal + 1);
    expect(result?.after?.counters?.movedEvents).toBe(beforeMoved + 1);
    expect(result?.afterReport?.modeKey).toBe(result?.payloadModeKey);
    expect(result?.afterReport?.adapterMode).toBe("core-adapter");
    expect(result?.afterReport?.undoEvents).toBe(result?.after?.counters?.undoEvents);
    expect(result?.afterReport?.wonEvents).toBe(result?.after?.counters?.wonEvents);
    expect(result?.afterReport?.overEvents).toBe(result?.after?.counters?.overEvents);
    expect(result?.afterReport?.isScoreAligned).toBe(true);
    expect(result?.payloadParityReport?.modeKey).toBe(result?.payloadModeKey);
    expect(result?.payloadParityReport?.isScoreAligned).toBe(true);
    expect(result?.beforeABDiff?.modeKey).toBe(result?.payloadModeKey);
    expect(result?.afterABDiff?.modeKey).toBe(result?.payloadModeKey);
    expect(result?.afterABDiff?.hasCoreReport).toBe(true);
    expect(result?.afterABDiff?.hasLegacyReport).toBe(true);
    // This smoke seeds legacy/core reports across two page sessions, so strict session
    // matching should mark AB diff as non-comparable.
    expect(result?.afterABDiff?.isSessionMatch).toBe(false);
    expect(result?.afterABDiff?.comparable).toBe(false);
    expect(result?.afterABDiff?.isScoreMatch).toBeNull();
    expect(result?.payloadParityABDiff?.modeKey).toBe(result?.payloadModeKey);
  });

  test("adapter rollout default and rollback switch are respected", async ({ page }) => {
    const defaultFallbackResponse = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(defaultFallbackResponse, "Default-fallback response should exist").not.toBeNull();
    expect(defaultFallbackResponse?.ok(), "Default-fallback response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const defaultFallbackMode = await page.evaluate(() => {
      const payload = (window as any).__legacyEngine;
      return payload && typeof payload.adapterMode === "string" ? payload.adapterMode : null;
    });
    expect(defaultFallbackMode).toBe("core-adapter");

    const defaultCoreResponse = await page.goto("/index.html?engine_adapter_default=core-adapter", {
      waitUntil: "domcontentloaded"
    });
    expect(defaultCoreResponse, "Default-core response should exist").not.toBeNull();
    expect(defaultCoreResponse?.ok(), "Default-core response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const defaultCoreMode = await page.evaluate(() => {
      const payload = (window as any).__legacyEngine;
      return payload && typeof payload.adapterMode === "string" ? payload.adapterMode : null;
    });
    expect(defaultCoreMode).toBe("core-adapter");

    const forcedLegacyResponse = await page.goto(
      "/index.html?engine_adapter_default=core-adapter&engine_adapter_force_legacy=1",
      { waitUntil: "domcontentloaded" }
    );
    expect(forcedLegacyResponse, "Forced-legacy response should exist").not.toBeNull();
    expect(forcedLegacyResponse?.ok(), "Forced-legacy response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const forcedLegacyMode = await page.evaluate(() => {
      const payload = (window as any).__legacyEngine;
      return payload && typeof payload.adapterMode === "string" ? payload.adapterMode : null;
    });
    expect(forcedLegacyMode).toBe("legacy-bridge");
  });
});
