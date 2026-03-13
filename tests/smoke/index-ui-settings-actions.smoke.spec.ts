import { expect, test } from "@playwright/test";
import { waitForWindowCondition } from "./support/runtime-ready";

test.describe("Legacy Multi-Page Smoke", () => {
  test("index ui delegates settings modal orchestration to host runtime helper", async ({ page }) => {
    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForWindowCondition(page, () => {
      const runtime = (window as any).CoreSettingsModalHostRuntime;
      const pageHostRuntime = (window as any).CoreSettingsModalPageHostRuntime;
      return (
        !!runtime &&
        typeof runtime.applySettingsModalOpenOrchestration === "function" &&
        typeof runtime.applySettingsModalCloseOrchestration === "function" &&
        !!pageHostRuntime &&
        typeof pageHostRuntime.applySettingsModalPageOpen === "function" &&
        typeof pageHostRuntime.applySettingsModalPageClose === "function" &&
        typeof (window as any).openSettingsModal === "function" &&
        typeof (window as any).closeSettingsModal === "function"
      );
    });

    const snapshot = await page.evaluate(async () => {
      const runtime = (window as any).CoreSettingsModalHostRuntime;
      const pageHostRuntime = (window as any).CoreSettingsModalPageHostRuntime;
      if (
        !runtime ||
        typeof runtime.applySettingsModalOpenOrchestration !== "function" ||
        typeof runtime.applySettingsModalCloseOrchestration !== "function" ||
        !pageHostRuntime ||
        typeof pageHostRuntime.createSettingsModalInitResolvers !== "function" ||
        typeof pageHostRuntime.createSettingsModalActionResolvers !== "function" ||
        typeof pageHostRuntime.applySettingsModalPageOpen !== "function" ||
        typeof pageHostRuntime.applySettingsModalPageClose !== "function"
      ) {
        return { hasRuntime: false, hasPageHostRuntime: false };
      }
      const openSettingsModal = (window as any).openSettingsModal;
      const closeSettingsModal = (window as any).closeSettingsModal;
      if (typeof openSettingsModal !== "function" || typeof closeSettingsModal !== "function") {
        return { hasRuntime: true, hasPageHostRuntime: true, hasBindings: false };
      }

      const originalOpen = runtime.applySettingsModalOpenOrchestration;
      const originalClose = runtime.applySettingsModalCloseOrchestration;
      const originalPageOpen = pageHostRuntime.applySettingsModalPageOpen;
      const originalPageClose = pageHostRuntime.applySettingsModalPageClose;
      let openCallCount = 0;
      let closeCallCount = 0;
      let pageOpenCallCount = 0;
      let pageCloseCallCount = 0;
      runtime.applySettingsModalOpenOrchestration = function (opts: any) {
        openCallCount += 1;
        return originalOpen(opts);
      };
      runtime.applySettingsModalCloseOrchestration = function (opts: any) {
        closeCallCount += 1;
        return originalClose(opts);
      };
      pageHostRuntime.applySettingsModalPageOpen = function (opts: any) {
        pageOpenCallCount += 1;
        return originalPageOpen(opts);
      };
      pageHostRuntime.applySettingsModalPageClose = function (opts: any) {
        pageCloseCallCount += 1;
        return originalPageClose(opts);
      };

      try {
        openSettingsModal();
        await new Promise((resolve) => {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => resolve(null));
          });
        });

        const modal = document.getElementById("settings-modal");
        const openDisplay = modal ? String((modal as HTMLElement).style.display || "") : "";

        closeSettingsModal();
        await new Promise((resolve) => {
          window.requestAnimationFrame(() => resolve(null));
        });
        const closeDisplay = modal ? String((modal as HTMLElement).style.display || "") : "";

        return {
          hasRuntime: true,
          hasPageHostRuntime: true,
          hasBindings: true,
          openCallCount,
          closeCallCount,
          pageOpenCallCount,
          pageCloseCallCount,
          openDisplay,
          closeDisplay
        };
      } finally {
        runtime.applySettingsModalOpenOrchestration = originalOpen;
        runtime.applySettingsModalCloseOrchestration = originalClose;
        pageHostRuntime.applySettingsModalPageOpen = originalPageOpen;
        pageHostRuntime.applySettingsModalPageClose = originalPageClose;
      }
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasPageHostRuntime).toBe(true);
    expect(snapshot.hasBindings).toBe(true);
    expect(snapshot.openCallCount).toBeGreaterThan(0);
    expect(snapshot.closeCallCount).toBeGreaterThan(0);
    expect(snapshot.pageOpenCallCount).toBeGreaterThan(0);
    expect(snapshot.pageCloseCallCount).toBeGreaterThan(0);
    expect(snapshot.openDisplay).toBe("flex");
    expect(snapshot.closeDisplay).toBe("none");
  });

  test("index ui delegates replay modal and export page actions to host runtime helper", async ({
    page
  }) => {
    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForWindowCondition(page, () => {
      const pageHostRuntime = (window as any).CoreReplayPageHostRuntime;
      const modalRuntime = (window as any).CoreReplayModalRuntime;
      const exportRuntime = (window as any).CoreReplayExportRuntime;
      return (
        !!pageHostRuntime &&
        typeof pageHostRuntime.applyReplayModalPageOpen === "function" &&
        typeof pageHostRuntime.applyReplayModalPageClose === "function" &&
        typeof pageHostRuntime.applyReplayExportPageActionFromContext === "function" &&
        !!modalRuntime &&
        typeof modalRuntime.applyReplayModalOpen === "function" &&
        typeof modalRuntime.applyReplayModalClose === "function" &&
        !!exportRuntime &&
        typeof exportRuntime.applyReplayExport === "function" &&
        typeof (window as any).exportReplay === "function" &&
        typeof (window as any).closeReplayModal === "function"
      );
    });

    const snapshot = await page.evaluate(async () => {
      const pageHostRuntime = (window as any).CoreReplayPageHostRuntime;
      const modalRuntime = (window as any).CoreReplayModalRuntime;
      const exportRuntime = (window as any).CoreReplayExportRuntime;
      if (
        !pageHostRuntime ||
        typeof pageHostRuntime.createReplayPageActionResolvers !== "function" ||
        typeof pageHostRuntime.applyReplayModalPageOpen !== "function" ||
        typeof pageHostRuntime.applyReplayModalPageClose !== "function" ||
        typeof pageHostRuntime.applyReplayExportPageAction !== "function" ||
        typeof pageHostRuntime.applyReplayExportPageActionFromContext !== "function" ||
        !modalRuntime ||
        typeof modalRuntime.applyReplayModalOpen !== "function" ||
        typeof modalRuntime.applyReplayModalClose !== "function" ||
        !exportRuntime ||
        typeof exportRuntime.applyReplayExport !== "function"
      ) {
        return { hasPageHostRuntime: false };
      }

      const exportReplay = (window as any).exportReplay;
      const closeReplayModal = (window as any).closeReplayModal;
      if (typeof exportReplay !== "function" || typeof closeReplayModal !== "function") {
        return { hasPageHostRuntime: true, hasBindings: false };
      }

      const originalPageOpen = pageHostRuntime.applyReplayModalPageOpen;
      const originalPageClose = pageHostRuntime.applyReplayModalPageClose;
      const originalPageExport = pageHostRuntime.applyReplayExportPageActionFromContext;
      const originalRuntimeExport = exportRuntime.applyReplayExport;
      let pageOpenCallCount = 0;
      let pageCloseCallCount = 0;
      let pageExportCallCount = 0;
      let runtimeExportCallCount = 0;
      pageHostRuntime.applyReplayModalPageOpen = function (opts: any) {
        pageOpenCallCount += 1;
        return originalPageOpen(opts);
      };
      pageHostRuntime.applyReplayModalPageClose = function (opts: any) {
        pageCloseCallCount += 1;
        return originalPageClose(opts);
      };
      pageHostRuntime.applyReplayExportPageActionFromContext = function (opts: any) {
        pageExportCallCount += 1;
        return originalPageExport(opts);
      };
      exportRuntime.applyReplayExport = function (opts: any) {
        runtimeExportCallCount += 1;
        const maybeShowReplayModal = opts && opts.showReplayModal;
        if (typeof maybeShowReplayModal === "function") {
          maybeShowReplayModal("回放内容", "seed payload", "确定", function () {
            return null;
          });
        }
        return { simulated: true };
      };

      try {
        exportReplay();
        await new Promise((resolve) => {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => resolve(null));
          });
        });

        const replayModal = document.getElementById("replay-modal");
        const openDisplay = replayModal ? String((replayModal as HTMLElement).style.display || "") : "";

        closeReplayModal();
        await new Promise((resolve) => {
          window.requestAnimationFrame(() => resolve(null));
        });
        const closeDisplay = replayModal ? String((replayModal as HTMLElement).style.display || "") : "";

        return {
          hasPageHostRuntime: true,
          hasBindings: true,
          pageOpenCallCount,
          pageCloseCallCount,
          pageExportCallCount,
          runtimeExportCallCount,
          openDisplay,
          closeDisplay
        };
      } finally {
        pageHostRuntime.applyReplayModalPageOpen = originalPageOpen;
        pageHostRuntime.applyReplayModalPageClose = originalPageClose;
        pageHostRuntime.applyReplayExportPageActionFromContext = originalPageExport;
        exportRuntime.applyReplayExport = originalRuntimeExport;
      }
    });

    expect(snapshot.hasPageHostRuntime).toBe(true);
    expect(snapshot.hasBindings).toBe(true);
    expect(snapshot.pageOpenCallCount).toBeGreaterThan(0);
    expect(snapshot.pageCloseCallCount).toBeGreaterThan(0);
    expect(snapshot.pageExportCallCount).toBeGreaterThan(0);
    expect(snapshot.runtimeExportCallCount).toBeGreaterThan(0);
    expect(snapshot.openDisplay).toBe("flex");
    expect(snapshot.closeDisplay).toBe("none");
  });
});
