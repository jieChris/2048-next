import { expect, test } from "@playwright/test";
import { waitForWindowCondition } from "./support/runtime-ready";

test.describe("Legacy Multi-Page Smoke", () => {
  test("index ui delegates storage resolution to runtime helper", async ({ page }) => {
    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForWindowCondition(page, () => {
      const runtime = (window as any).CoreStorageRuntime;
      return (
        !!runtime &&
        typeof runtime.resolveStorageByName === "function" &&
        typeof runtime.safeReadStorageItem === "function" &&
        typeof runtime.safeSetStorageItem === "function" &&
        typeof (window as any).syncMobileTimerboxUI === "function" &&
        typeof (window as any).openSettingsModal === "function"
      );
    });

    const snapshot = await page.evaluate(async () => {
      const runtime = (window as any).CoreStorageRuntime;
      if (
        !runtime ||
        typeof runtime.resolveStorageByName !== "function" ||
        typeof runtime.safeReadStorageItem !== "function" ||
        typeof runtime.safeSetStorageItem !== "function"
      ) {
        return { hasRuntime: false };
      }
      const originalResolveStorageByName = runtime.resolveStorageByName;
      const practiceRuntime = (window as any).CorePracticeTransferRuntime;
      const originalResolvePrecheck =
        practiceRuntime && typeof practiceRuntime.resolvePracticeTransferPrecheck === "function"
          ? practiceRuntime.resolvePracticeTransferPrecheck
          : null;
      const originalCreatePlan =
        practiceRuntime && typeof practiceRuntime.createPracticeTransferNavigationPlan === "function"
          ? practiceRuntime.createPracticeTransferNavigationPlan
          : null;
      const originalWindowOpen = window.open;
      let resolveStorageByNameCallCount = 0;
      runtime.resolveStorageByName = function (opts: any) {
        resolveStorageByNameCallCount += 1;
        return originalResolveStorageByName(opts);
      };
      try {
        const syncMobileTimerboxUI = (window as any).syncMobileTimerboxUI;
        if (typeof syncMobileTimerboxUI === "function") {
          syncMobileTimerboxUI();
        }
        if (practiceRuntime && originalResolvePrecheck && originalCreatePlan) {
          practiceRuntime.resolvePracticeTransferPrecheck = function () {
            return {
              canOpen: true,
              board: [[0]],
              alertMessage: ""
            };
          };
          practiceRuntime.createPracticeTransferNavigationPlan = function () {
            return {
              openUrl: "about:blank"
            };
          };
          (window as any).open = function () {
            return null;
          };
          const openPracticeBoardFromCurrent = (window as any).openPracticeBoardFromCurrent;
          if (typeof openPracticeBoardFromCurrent === "function") {
            openPracticeBoardFromCurrent();
          }
        }
        const openSettingsModal = (window as any).openSettingsModal;
        if (typeof openSettingsModal === "function") {
          openSettingsModal();
        }
        await new Promise((resolve) => {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => resolve(null));
          });
        });
        const settingsModal = document.getElementById("settings-modal");
        return {
          hasRuntime: true,
          hasSyncMobileTimerboxUI: typeof syncMobileTimerboxUI === "function",
          hasOpenSettingsModal: typeof openSettingsModal === "function",
          settingsVisible: Boolean(settingsModal && settingsModal.style.display === "flex"),
          resolveStorageByNameCallCount
        };
      } finally {
        runtime.resolveStorageByName = originalResolveStorageByName;
        if (practiceRuntime && originalResolvePrecheck) {
          practiceRuntime.resolvePracticeTransferPrecheck = originalResolvePrecheck;
        }
        if (practiceRuntime && originalCreatePlan) {
          practiceRuntime.createPracticeTransferNavigationPlan = originalCreatePlan;
        }
        (window as any).open = originalWindowOpen;
      }
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasSyncMobileTimerboxUI).toBe(true);
    expect(snapshot.hasOpenSettingsModal).toBe(true);
    expect(snapshot.settingsVisible).toBe(true);
    expect(snapshot.resolveStorageByNameCallCount).toBeGreaterThan(0);
  });

});
