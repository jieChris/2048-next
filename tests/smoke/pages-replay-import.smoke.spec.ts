import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("replay page supports paste-based replay import", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("replay_guide_shown_v1", "true");
      } catch {
        // ignore storage errors in smoke setup
      }
    });

    const response = await page.goto("/replay.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Replay page response should exist").not.toBeNull();
    expect(response?.ok(), "Replay page response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();

    const importTextButton = page.locator("#import-replay-text-btn");
    await expect(importTextButton).toBeVisible();

    await page.waitForFunction(() => {
      const manager = (window as any).game_manager;
      return !!manager && typeof manager.import === "function";
    });

    await page.evaluate(() => {
      (window as any).__replayImportTextCalls = [];
      const manager = (window as any).game_manager;
      manager.import = function (payload: unknown) {
        (window as any).__replayImportTextCalls.push(String(payload));
        return true;
      };
    });

    await importTextButton.click();
    await expect(page.locator("#replay-modal")).toBeVisible();
    await page.locator("#replay-textarea").fill("test-replay-payload");
    await page.locator("#replay-action-btn").click();

    const snapshot = await page.evaluate(() => {
      const modal = document.getElementById("replay-modal");
      return {
        calls: Array.isArray((window as any).__replayImportTextCalls)
          ? (window as any).__replayImportTextCalls.slice()
          : [],
        modalDisplay: modal ? modal.style.display : null
      };
    });

    expect(snapshot.calls).toContain("test-replay-payload");
    expect(snapshot.modalDisplay).toBe("none");
  });
});
