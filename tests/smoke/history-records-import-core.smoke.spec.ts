import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("history page delegates import action decisions to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      window.confirm = () => false;
      (window as any).__historyImportActionCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryImportRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryImportActionState" && typeof value === "function") {
            proxyTarget[prop] = function (action: unknown) {
              (window as any).__historyImportActionCallCount =
                Number((window as any).__historyImportActionCallCount || 0) + 1;
              return (value as (name: unknown) => unknown)(action);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });

      const originalClick = HTMLInputElement.prototype.click;
      HTMLInputElement.prototype.click = function () {
        if (this && this.type === "file") return;
        return originalClick.apply(this);
      };
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      const mergeBtn = document.querySelector("#history-import-btn") as HTMLButtonElement | null;
      if (mergeBtn && typeof mergeBtn.click === "function") mergeBtn.click();

      const replaceBtn = document.querySelector("#history-import-replace-btn") as HTMLButtonElement | null;
      if (replaceBtn && typeof replaceBtn.click === "function") replaceBtn.click();

      return {
        hasRuntime: Boolean((window as any).CoreHistoryImportRuntime?.resolveHistoryImportActionState),
        actionCallCount: Number((window as any).__historyImportActionCallCount || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.actionCallCount).toBeGreaterThan(1);
  });

  test("history page delegates import file helpers to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyImportFileSelectedCallCount = 0;
      (window as any).__historyImportFilePayloadCallCount = 0;
      (window as any).__historyImportFileEncodingCallCount = 0;
      (window as any).__historyImportFileResetCallCount = 0;
      (window as any).__historyImportExecuteCallCount = 0;
      (window as any).__historyImportFileSeenEncoding = null;
      {
        const target: Record<string, unknown> = {};
        (window as any).CoreHistoryImportRuntime = new Proxy(target, {
          set(proxyTarget, prop, value) {
            if (prop === "executeHistoryImport" && typeof value === "function") {
              proxyTarget[prop] = function (input: unknown) {
                (window as any).__historyImportExecuteCallCount =
                  Number((window as any).__historyImportExecuteCallCount || 0) + 1;
                return (value as (args: unknown) => unknown)(input);
              };
              return true;
            }
            proxyTarget[prop] = value;
            return true;
          }
        });
      }
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryImportFileRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryImportSelectedFile" && typeof value === "function") {
            proxyTarget[prop] = function (files: unknown) {
              (window as any).__historyImportFileSelectedCallCount =
                Number((window as any).__historyImportFileSelectedCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(files);
            };
            return true;
          }
          if (prop === "resolveHistoryImportPayloadText" && typeof value === "function") {
            proxyTarget[prop] = function (readerResult: unknown) {
              (window as any).__historyImportFilePayloadCallCount =
                Number((window as any).__historyImportFilePayloadCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(readerResult);
            };
            return true;
          }
          if (prop === "resolveHistoryImportReadEncoding" && typeof value === "function") {
            proxyTarget[prop] = function () {
              (window as any).__historyImportFileEncodingCallCount =
                Number((window as any).__historyImportFileEncodingCallCount || 0) + 1;
              return (value as () => unknown)();
            };
            return true;
          }
          if (prop === "resolveHistoryImportInputResetValue" && typeof value === "function") {
            proxyTarget[prop] = function () {
              (window as any).__historyImportFileResetCallCount =
                Number((window as any).__historyImportFileResetCallCount || 0) + 1;
              return (value as () => unknown)();
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });

      class MockFileReader {
        result: unknown = "{\"records\":[]}";
        onload: ((event: Event) => void) | null = null;
        onerror: ((event: Event) => void) | null = null;

        readAsText(_file: unknown, encoding?: string) {
          (window as any).__historyImportFileSeenEncoding = encoding ?? null;
          if (typeof this.onload === "function") {
            this.onload(new Event("load"));
          }
        }
      }

      (window as any).FileReader = MockFileReader;
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(async () => {
      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.importRecords !== "function") {
        throw new Error("LocalHistoryStore.importRecords unavailable");
      }
      const originalImportRecords = store.importRecords;
      store.importRecords = () => ({ imported: 0, replaced: 0 });

      const importInput = document.querySelector("#history-import-file") as HTMLInputElement | null;
      if (!importInput) {
        throw new Error("history import input unavailable");
      }

      const fakeFile = { name: "history.json" };
      Object.defineProperty(importInput, "files", {
        configurable: true,
        get() {
          return {
            0: fakeFile,
            length: 1,
            item(index: number) {
              return index === 0 ? fakeFile : null;
            }
          };
        }
      });

      importInput.dispatchEvent(new Event("change"));
      await new Promise((resolve) => setTimeout(resolve, 0));

      store.importRecords = originalImportRecords;
      return {
        hasRuntime: Boolean((window as any).CoreHistoryImportFileRuntime?.resolveHistoryImportSelectedFile),
        hasImportRuntime: Boolean((window as any).CoreHistoryImportRuntime?.executeHistoryImport),
        selectedCallCount: Number((window as any).__historyImportFileSelectedCallCount || 0),
        payloadCallCount: Number((window as any).__historyImportFilePayloadCallCount || 0),
        encodingCallCount: Number((window as any).__historyImportFileEncodingCallCount || 0),
        resetCallCount: Number((window as any).__historyImportFileResetCallCount || 0),
        executeCallCount: Number((window as any).__historyImportExecuteCallCount || 0),
        seenEncoding: (window as any).__historyImportFileSeenEncoding
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasImportRuntime).toBe(true);
    expect(snapshot.selectedCallCount).toBeGreaterThan(0);
    expect(snapshot.payloadCallCount).toBeGreaterThan(0);
    expect(snapshot.encodingCallCount).toBeGreaterThan(0);
    expect(snapshot.resetCallCount).toBeGreaterThan(0);
    expect(snapshot.executeCallCount).toBeGreaterThan(0);
    expect(snapshot.seenEncoding).toBe("utf-8");
  });

  test("history page delegates import orchestration to host runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      window.confirm = () => true;
      (window as any).__historyImportHostMergeClickCallCount = 0;
      (window as any).__historyImportHostReplaceClickCallCount = 0;
      (window as any).__historyImportHostFileSelectionCallCount = 0;
      (window as any).__historyImportHostApplyReadResultCallCount = 0;
      const hostTarget: Record<string, unknown> = {};
      (window as any).CoreHistoryImportHostRuntime = new Proxy(hostTarget, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryImportMergeClickState" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyImportHostMergeClickCallCount =
                Number((window as any).__historyImportHostMergeClickCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "resolveHistoryImportReplaceClickState" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyImportHostReplaceClickCallCount =
                Number((window as any).__historyImportHostReplaceClickCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "resolveHistoryImportFileSelectionState" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyImportHostFileSelectionCallCount =
                Number((window as any).__historyImportHostFileSelectionCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "applyHistoryImportFromFileReadResult" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyImportHostApplyReadResultCallCount =
                Number((window as any).__historyImportHostApplyReadResultCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });

      const originalClick = HTMLInputElement.prototype.click;
      HTMLInputElement.prototype.click = function () {
        if (this && this.type === "file") return;
        return originalClick.apply(this);
      };

      class MockFileReader {
        result: unknown = "{\"records\":[]}";
        onload: ((event: Event) => void) | null = null;
        onerror: ((event: Event) => void) | null = null;

        readAsText(_file: unknown, _encoding?: string) {
          if (typeof this.onload === "function") {
            this.onload(new Event("load"));
          }
        }
      }

      (window as any).FileReader = MockFileReader;
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(async () => {
      const mergeBtn = document.querySelector("#history-import-btn") as HTMLButtonElement | null;
      if (mergeBtn && typeof mergeBtn.click === "function") mergeBtn.click();

      const replaceBtn = document.querySelector("#history-import-replace-btn") as HTMLButtonElement | null;
      if (replaceBtn && typeof replaceBtn.click === "function") replaceBtn.click();

      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.importRecords !== "function") {
        throw new Error("LocalHistoryStore.importRecords unavailable");
      }
      const originalImportRecords = store.importRecords;
      store.importRecords = () => ({ imported: 0, replaced: 0 });

      const importInput = document.querySelector("#history-import-file") as HTMLInputElement | null;
      if (!importInput) {
        throw new Error("history import input unavailable");
      }
      const fakeFile = { name: "history.json" };
      Object.defineProperty(importInput, "files", {
        configurable: true,
        get() {
          return {
            0: fakeFile,
            length: 1,
            item(index: number) {
              return index === 0 ? fakeFile : null;
            }
          };
        }
      });

      importInput.dispatchEvent(new Event("change"));
      await new Promise((resolve) => setTimeout(resolve, 0));

      store.importRecords = originalImportRecords;
      return {
        hasRuntime: Boolean(
          (window as any).CoreHistoryImportHostRuntime?.resolveHistoryImportMergeClickState &&
            (window as any).CoreHistoryImportHostRuntime?.resolveHistoryImportReplaceClickState &&
            (window as any).CoreHistoryImportHostRuntime?.resolveHistoryImportFileSelectionState &&
            (window as any).CoreHistoryImportHostRuntime?.applyHistoryImportFromFileReadResult
        ),
        mergeClickCallCount: Number((window as any).__historyImportHostMergeClickCallCount || 0),
        replaceClickCallCount: Number((window as any).__historyImportHostReplaceClickCallCount || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.mergeClickCallCount).toBeGreaterThan(0);
    expect(snapshot.replaceClickCallCount).toBeGreaterThan(0);
  });
});
