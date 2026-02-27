import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("history page delegates toolbar action decisions to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      window.confirm = () => true;
      (window as any).__historyToolbarMismatchQueryCallCount = 0;
      (window as any).__historyToolbarClearAllCallCount = 0;
      (window as any).__historyToolbarExecuteClearAllCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryToolbarRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryMismatchExportQuery" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyToolbarMismatchQueryCallCount =
                Number((window as any).__historyToolbarMismatchQueryCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "resolveHistoryClearAllActionState" && typeof value === "function") {
            proxyTarget[prop] = function () {
              (window as any).__historyToolbarClearAllCallCount =
                Number((window as any).__historyToolbarClearAllCallCount || 0) + 1;
              return (value as () => unknown)();
            };
            return true;
          }
          if (prop === "executeHistoryClearAll" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyToolbarExecuteClearAllCallCount =
                Number((window as any).__historyToolbarExecuteClearAllCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.clearAll !== "function") {
        throw new Error("LocalHistoryStore.clearAll unavailable");
      }
      const originalClearAll = store.clearAll;
      store.clearAll = () => {};

      const mismatchBtn = document.querySelector("#history-export-mismatch-btn") as HTMLButtonElement | null;
      if (mismatchBtn && typeof mismatchBtn.click === "function") mismatchBtn.click();

      const clearAllBtn = document.querySelector("#history-clear-all-btn") as HTMLButtonElement | null;
      if (clearAllBtn && typeof clearAllBtn.click === "function") clearAllBtn.click();

      store.clearAll = originalClearAll;
      return {
        hasRuntime: Boolean(
          (window as any).CoreHistoryToolbarRuntime?.resolveHistoryMismatchExportQuery &&
            (window as any).CoreHistoryToolbarRuntime?.resolveHistoryClearAllActionState &&
            (window as any).CoreHistoryToolbarRuntime?.executeHistoryClearAll
        ),
        mismatchQueryCallCount: Number((window as any).__historyToolbarMismatchQueryCallCount || 0),
        clearAllCallCount: Number((window as any).__historyToolbarClearAllCallCount || 0),
        executeClearAllCallCount: Number((window as any).__historyToolbarExecuteClearAllCallCount || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.mismatchQueryCallCount).toBeGreaterThan(0);
    expect(snapshot.clearAllCallCount).toBeGreaterThan(0);
    expect(snapshot.executeClearAllCallCount).toBeGreaterThan(0);
  });

  test("history page delegates toolbar action execution orchestration to host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      window.confirm = () => true;
      (window as any).__historyToolbarHostExportAllCallCount = 0;
      (window as any).__historyToolbarHostMismatchCallCount = 0;
      (window as any).__historyToolbarHostClearAllCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryToolbarHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "applyHistoryExportAllAction" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyToolbarHostExportAllCallCount =
                Number((window as any).__historyToolbarHostExportAllCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "applyHistoryMismatchExportAction" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyToolbarHostMismatchCallCount =
                Number((window as any).__historyToolbarHostMismatchCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "applyHistoryClearAllAction" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyToolbarHostClearAllCallCount =
                Number((window as any).__historyToolbarHostClearAllCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.clearAll !== "function") {
        throw new Error("LocalHistoryStore.clearAll unavailable");
      }
      const originalClearAll = store.clearAll;
      store.clearAll = () => {};

      const exportAllBtn = document.querySelector("#history-export-all-btn") as HTMLButtonElement | null;
      if (exportAllBtn && typeof exportAllBtn.click === "function") exportAllBtn.click();

      const mismatchBtn = document.querySelector("#history-export-mismatch-btn") as HTMLButtonElement | null;
      if (mismatchBtn && typeof mismatchBtn.click === "function") mismatchBtn.click();

      const clearAllBtn = document.querySelector("#history-clear-all-btn") as HTMLButtonElement | null;
      if (clearAllBtn && typeof clearAllBtn.click === "function") clearAllBtn.click();

      store.clearAll = originalClearAll;

      return {
        hasRuntime: Boolean(
          (window as any).CoreHistoryToolbarHostRuntime?.applyHistoryExportAllAction &&
            (window as any).CoreHistoryToolbarHostRuntime?.applyHistoryMismatchExportAction &&
            (window as any).CoreHistoryToolbarHostRuntime?.applyHistoryClearAllAction
        ),
        exportAllCallCount: Number((window as any).__historyToolbarHostExportAllCallCount || 0),
        mismatchCallCount: Number((window as any).__historyToolbarHostMismatchCallCount || 0),
        clearAllCallCount: Number((window as any).__historyToolbarHostClearAllCallCount || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.exportAllCallCount).toBeGreaterThan(0);
    expect(snapshot.mismatchCallCount).toBeGreaterThan(0);
    expect(snapshot.clearAllCallCount).toBeGreaterThan(0);
  });

  test("history page delegates toolbar button binding orchestration to bind-host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__historyToolbarBindHostCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryToolbarBindHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "bindHistoryToolbarActionButtons" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyToolbarBindHostCallCount =
                Number((window as any).__historyToolbarBindHostCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => ({
      hasRuntime: Boolean((window as any).CoreHistoryToolbarBindHostRuntime?.bindHistoryToolbarActionButtons),
      bindCallCount: Number((window as any).__historyToolbarBindHostCallCount || 0)
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.bindCallCount).toBeGreaterThan(0);
  });

  test("history page delegates pager and keyword trigger decisions to toolbar-events runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyToolbarPrevPageCallCount = 0;
      (window as any).__historyToolbarNextPageCallCount = 0;
      (window as any).__historyToolbarKeywordCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryToolbarEventsRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryPrevPageState" && typeof value === "function") {
            proxyTarget[prop] = function (pageNo: unknown) {
              (window as any).__historyToolbarPrevPageCallCount =
                Number((window as any).__historyToolbarPrevPageCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(pageNo);
            };
            return true;
          }
          if (prop === "resolveHistoryNextPageState" && typeof value === "function") {
            proxyTarget[prop] = function (pageNo: unknown) {
              (window as any).__historyToolbarNextPageCallCount =
                Number((window as any).__historyToolbarNextPageCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(pageNo);
            };
            return true;
          }
          if (prop === "shouldHistoryKeywordTriggerReload" && typeof value === "function") {
            proxyTarget[prop] = function (key: unknown) {
              (window as any).__historyToolbarKeywordCallCount =
                Number((window as any).__historyToolbarKeywordCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(key);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      const nextBtn = document.querySelector("#history-next-page") as HTMLButtonElement | null;
      if (nextBtn) nextBtn.disabled = false;
      if (nextBtn && typeof nextBtn.click === "function") nextBtn.click();

      const prevBtn = document.querySelector("#history-prev-page") as HTMLButtonElement | null;
      if (prevBtn) prevBtn.disabled = false;
      if (prevBtn && typeof prevBtn.click === "function") prevBtn.click();

      const keyword = document.querySelector("#history-keyword") as HTMLInputElement | null;
      if (keyword) {
        const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
        keyword.dispatchEvent(event);
      }

      return {
        hasRuntime: Boolean(
          (window as any).CoreHistoryToolbarEventsRuntime?.resolveHistoryPrevPageState &&
            (window as any).CoreHistoryToolbarEventsRuntime?.resolveHistoryNextPageState &&
            (window as any).CoreHistoryToolbarEventsRuntime?.shouldHistoryKeywordTriggerReload
        ),
        prevPageCallCount: Number((window as any).__historyToolbarPrevPageCallCount || 0),
        nextPageCallCount: Number((window as any).__historyToolbarNextPageCallCount || 0),
        keywordCallCount: Number((window as any).__historyToolbarKeywordCallCount || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.prevPageCallCount).toBeGreaterThan(0);
    expect(snapshot.nextPageCallCount).toBeGreaterThan(0);
    expect(snapshot.keywordCallCount).toBeGreaterThan(0);
  });

  test(
    "history page delegates pager/filter event binding orchestration to toolbar-events host runtime helper",
    async ({ page }) => {
      await page.addInitScript(() => {
        (window as any).__historyToolbarEventsHostBindCallCount = 0;
        const target: Record<string, unknown> = {};
        (window as any).CoreHistoryToolbarEventsHostRuntime = new Proxy(target, {
          set(proxyTarget, prop, value) {
            if (prop === "bindHistoryToolbarPagerAndFilterEvents" && typeof value === "function") {
              proxyTarget[prop] = function (input: unknown) {
                (window as any).__historyToolbarEventsHostBindCallCount =
                  Number((window as any).__historyToolbarEventsHostBindCallCount || 0) + 1;
                return (value as (args: unknown) => unknown)(input);
              };
              return true;
            }
            proxyTarget[prop] = value;
            return true;
          }
        });
      });

      const response = await page.goto("/history.html", {
        waitUntil: "domcontentloaded"
      });
      expect(response, "History response should exist").not.toBeNull();
      expect(response?.ok(), "History response should be 2xx").toBeTruthy();
      await expect(page.locator("body")).toBeVisible();
      await page.waitForTimeout(200);

      const snapshot = await page.evaluate(() => ({
        hasRuntime: Boolean(
          (window as any).CoreHistoryToolbarEventsHostRuntime
            ?.bindHistoryToolbarPagerAndFilterEvents
        ),
        bindCallCount: Number((window as any).__historyToolbarEventsHostBindCallCount || 0)
      }));

      expect(snapshot.hasRuntime).toBe(true);
      expect(snapshot.bindCallCount).toBeGreaterThan(0);
    }
  );

  test("history page delegates record delete action decisions to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      window.confirm = () => true;
      (window as any).__historyDeleteActionCallCount = 0;
      (window as any).__historyDeleteExecuteCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryRecordActionsRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryDeleteActionState" && typeof value === "function") {
            proxyTarget[prop] = function (recordId: unknown) {
              (window as any).__historyDeleteActionCallCount =
                Number((window as any).__historyDeleteActionCallCount || 0) + 1;
              return (value as (id: unknown) => unknown)(recordId);
            };
            return true;
          }
          if (prop === "executeHistoryDeleteRecord" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyDeleteExecuteCallCount =
                Number((window as any).__historyDeleteExecuteCallCount || 0) + 1;
              return (value as (payload: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(200);

    await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.saveRecord !== "function" || typeof store.clearAll !== "function") {
        throw new Error("LocalHistoryStore unavailable");
      }

      store.clearAll();
      store.saveRecord({
        mode: "local",
        mode_key: "standard_4x4_pow2_no_undo",
        board_width: 4,
        board_height: 4,
        ruleset: "pow2",
        undo_enabled: false,
        rank_policy: "ranked",
        score: 128,
        best_tile: 16,
        duration_ms: 8000,
        final_board: [
          [2, 4, 8, 16],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        ended_at: new Date().toISOString(),
        replay_string: ""
      });
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.deleteById !== "function") {
        throw new Error("LocalHistoryStore.deleteById unavailable");
      }
      const originalDeleteById = store.deleteById;
      store.deleteById = () => true;

      const deleteBtn = document.querySelector(".history-delete-btn") as HTMLButtonElement | null;
      if (deleteBtn && typeof deleteBtn.click === "function") deleteBtn.click();

      store.deleteById = originalDeleteById;
      return {
        hasRuntime: Boolean(
          (window as any).CoreHistoryRecordActionsRuntime?.resolveHistoryDeleteActionState &&
            (window as any).CoreHistoryRecordActionsRuntime?.executeHistoryDeleteRecord
        ),
        deleteActionCallCount: Number((window as any).__historyDeleteActionCallCount || 0),
        deleteExecuteCallCount: Number((window as any).__historyDeleteExecuteCallCount || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.deleteActionCallCount).toBeGreaterThan(0);
    expect(snapshot.deleteExecuteCallCount).toBeGreaterThan(0);
  });

  test("history page delegates record item actions orchestration to host runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyRecordHostReplayCallCount = 0;
      (window as any).__historyRecordHostExportCallCount = 0;
      (window as any).__historyRecordHostDeleteCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryRecordHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryRecordReplayHref" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyRecordHostReplayCallCount =
                Number((window as any).__historyRecordHostReplayCallCount || 0) + 1;
              (value as (args: unknown) => unknown)(input);
              return "";
            };
            return true;
          }
          if (prop === "applyHistoryRecordExportAction" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyRecordHostExportCallCount =
                Number((window as any).__historyRecordHostExportCallCount || 0) + 1;
              (value as (args: unknown) => unknown)(input);
              return false;
            };
            return true;
          }
          if (prop === "applyHistoryRecordDeleteAction" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyRecordHostDeleteCallCount =
                Number((window as any).__historyRecordHostDeleteCallCount || 0) + 1;
              (value as (args: unknown) => unknown)(input);
              return {
                shouldSetStatus: false,
                statusText: "",
                isError: false,
                shouldReload: false
              };
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(200);

    await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.saveRecord !== "function" || typeof store.clearAll !== "function") {
        throw new Error("LocalHistoryStore unavailable");
      }
      store.clearAll();
      store.saveRecord({
        mode: "local",
        mode_key: "standard_4x4_pow2_no_undo",
        board_width: 4,
        board_height: 4,
        ruleset: "pow2",
        undo_enabled: false,
        rank_policy: "ranked",
        score: 64,
        best_tile: 8,
        duration_ms: 3000,
        final_board: [
          [2, 4, 8, 16],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        ended_at: new Date().toISOString(),
        replay_string: "[]"
      });
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      const runtime = (window as any).CoreHistoryRecordHostRuntime;
      if (!store || !runtime || typeof store.listRecords !== "function") {
        throw new Error("history record host runtime prerequisites unavailable");
      }
      const listResult = store.listRecords({
        mode_key: "",
        keyword: "",
        sort_by: "ended_desc",
        adapter_parity_filter: "all",
        page: 1,
        page_size: 1
      });
      const item = Array.isArray(listResult?.items) ? listResult.items[0] : null;
      const itemId = item?.id;

      if (typeof runtime.resolveHistoryRecordReplayHref === "function") {
        runtime.resolveHistoryRecordReplayHref({
          historyRecordActionsRuntime: {
            resolveHistoryReplayHref: () => ""
          },
          itemId
        });
      }
      if (typeof runtime.applyHistoryRecordExportAction === "function") {
        runtime.applyHistoryRecordExportAction({
          localHistoryStore: store,
          item,
          historyExportRuntime: {
            downloadHistorySingleRecord: () => false
          }
        });
      }
      if (typeof runtime.applyHistoryRecordDeleteAction === "function") {
        runtime.applyHistoryRecordDeleteAction({
          historyRecordActionsRuntime: {
            resolveHistoryDeleteActionState: (id: unknown) => ({
              confirmMessage: "确认删除这条记录吗？",
              recordId: id
            }),
            executeHistoryDeleteRecord: () => ({
              deleted: false,
              notice: "failed"
            }),
            resolveHistoryDeleteFailureNotice: () => "failed",
            resolveHistoryDeleteSuccessNotice: () => "ok"
          },
          localHistoryStore: store,
          itemId,
          confirmAction: () => true
        });
      }

      return {
        hasRuntime: Boolean(
          (window as any).CoreHistoryRecordHostRuntime?.resolveHistoryRecordReplayHref &&
            (window as any).CoreHistoryRecordHostRuntime?.applyHistoryRecordExportAction &&
            (window as any).CoreHistoryRecordHostRuntime?.applyHistoryRecordDeleteAction
        ),
        replayCallCount: Number((window as any).__historyRecordHostReplayCallCount || 0),
        exportCallCount: Number((window as any).__historyRecordHostExportCallCount || 0),
        deleteCallCount: Number((window as any).__historyRecordHostDeleteCallCount || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.replayCallCount).toBeGreaterThan(0);
    expect(snapshot.exportCallCount).toBeGreaterThan(0);
    expect(snapshot.deleteCallCount).toBeGreaterThan(0);
  });

  test("history page delegates mismatch export execution to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyExportMismatchCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryExportRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "downloadHistoryMismatchRecords" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyExportMismatchCallCount =
                Number((window as any).__historyExportMismatchCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(200);

    await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.saveRecord !== "function" || typeof store.clearAll !== "function") {
        throw new Error("LocalHistoryStore unavailable");
      }

      store.clearAll();
      store.saveRecord({
        mode: "local",
        mode_key: "standard_4x4_pow2_no_undo",
        board_width: 4,
        board_height: 4,
        ruleset: "pow2",
        undo_enabled: false,
        rank_policy: "ranked",
        score: 256,
        best_tile: 32,
        duration_ms: 12000,
        final_board: [
          [2, 4, 8, 16],
          [32, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        ended_at: new Date().toISOString(),
        replay_string: "",
        adapter_parity_report_v1: {
          adapterMode: "core-adapter",
          lastScoreFromSnapshot: 260,
          undoUsedFromSnapshot: 0,
          scoreDelta: 4,
          isScoreAligned: false
        },
        adapter_parity_ab_diff_v1: {
          comparable: true,
          scoreDelta: 4,
          undoUsedDelta: 0,
          overEventsDelta: 0,
          undoEventsDelta: 0,
          wonEventsDelta: 0,
          isScoreMatch: false,
          bothScoreAligned: false
        }
      });
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.download !== "function") {
        throw new Error("LocalHistoryStore download unavailable");
      }
      const originalDownload = store.download;
      (window as any).__historyExportLastFile = "";
      store.download = function (file: unknown, payload: unknown) {
        (window as any).__historyExportLastFile = String(file || "");
        (window as any).__historyExportPayloadLength = String(payload || "").length;
      };

      const button = document.querySelector("#history-export-mismatch-btn") as HTMLButtonElement | null;
      if (button && typeof button.click === "function") button.click();

      store.download = originalDownload;
      return {
        hasRuntime: Boolean((window as any).CoreHistoryExportRuntime?.downloadHistoryMismatchRecords),
        mismatchCallCount: Number((window as any).__historyExportMismatchCallCount || 0),
        statusText: (document.querySelector("#history-status")?.textContent || "").trim(),
        fileName: String((window as any).__historyExportLastFile || "")
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.mismatchCallCount).toBeGreaterThan(0);
    expect(snapshot.statusText).toContain("已导出 A/B 不一致记录");
    expect(snapshot.fileName).toContain("2048_local_history_mismatch_");
  });

});
