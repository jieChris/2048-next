import { expect, test } from "@playwright/test";
import { waitForWindowCondition } from "./support/runtime-ready";

test.describe("Legacy Multi-Page Smoke", () => {
  test("application handle_undo delegates to undo-action runtime", async ({ page }) => {
    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForWindowCondition(page, () => {
      const runtime = (window as any).CoreUndoActionRuntime;
      return (
        !!runtime &&
        typeof runtime.tryTriggerUndo === "function" &&
        typeof (window as any).handle_undo === "function"
      );
    });

    const snapshot = await page.evaluate(() => {
      const runtime = (window as any).CoreUndoActionRuntime;
      const handleUndo = (window as any).handle_undo;
      if (!runtime || typeof runtime.tryTriggerUndo !== "function") {
        return { hasRuntime: false, hasCapabilityApi: false, hasHandler: typeof handleUndo === "function" };
      }
      if (typeof handleUndo !== "function") {
        return {
          hasRuntime: true,
          hasCapabilityApi: Boolean(
            typeof runtime.resolveUndoModeIdFromBody === "function" &&
            typeof runtime.resolveUndoModeId === "function" &&
            typeof runtime.isUndoCapableMode === "function" &&
            typeof runtime.isUndoInteractionEnabled === "function"
          ),
          hasHandler: false
        };
      }

      const originalManager = (window as any).game_manager;
      const originalTryTriggerUndo = runtime.tryTriggerUndo;
      let callCount = 0;
      let usedDirection: number | null = null;
      let moveDirection: number | null = null;
      const fakeManager = {
        isUndoInteractionEnabled() {
          return true;
        },
        move(direction: number) {
          moveDirection = direction;
        }
      };

      runtime.tryTriggerUndo = function (manager: any, direction: number) {
        callCount += 1;
        usedDirection = direction;
        return originalTryTriggerUndo(manager, direction);
      };
      (window as any).game_manager = fakeManager;

      try {
        handleUndo();
        return {
          hasRuntime: true,
          hasCapabilityApi: Boolean(
            typeof runtime.resolveUndoModeIdFromBody === "function" &&
            typeof runtime.resolveUndoModeId === "function" &&
            typeof runtime.isUndoCapableMode === "function" &&
            typeof runtime.isUndoInteractionEnabled === "function"
          ),
          hasHandler: true,
          callCount,
          usedDirection,
          moveDirection
        };
      } finally {
        runtime.tryTriggerUndo = originalTryTriggerUndo;
        (window as any).game_manager = originalManager;
      }
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasCapabilityApi).toBe(true);
    expect(snapshot.hasHandler).toBe(true);
    expect(snapshot.callCount).toBeGreaterThan(0);
    expect(snapshot.usedDirection).toBe(-1);
    expect(snapshot.moveDirection).toBe(-1);
  });

  test("application startup delegates to home startup host runtime", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__homeRuntimeContractCallCount = 0;
      (window as any).__homeStartupHostCallCount = 0;
      (window as any).__homeModeContextCallCount = 0;

      const runtimeContractTarget: Record<string, unknown> = {};
      (window as any).CoreHomeRuntimeContractRuntime = new Proxy(runtimeContractTarget, {
        set(target, prop, value) {
          if (prop === "resolveHomeRuntimeContracts" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__homeRuntimeContractCallCount =
                Number((window as any).__homeRuntimeContractCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const startupHostTarget: Record<string, unknown> = {};
      (window as any).CoreHomeStartupHostRuntime = new Proxy(startupHostTarget, {
        set(target, prop, value) {
          if (prop === "resolveHomeStartupFromContext" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__homeStartupHostCallCount =
                Number((window as any).__homeStartupHostCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const homeModeRuntimeTarget: Record<string, unknown> = {};
      (window as any).CoreHomeModeRuntime = new Proxy(homeModeRuntimeTarget, {
        set(target, prop, value) {
          if (prop === "resolveHomeModeSelectionFromContext" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__homeModeContextCallCount =
                Number((window as any).__homeModeContextCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => {
      const cfg = (window as any).GAME_MODE_CONFIG;
      return {
        hasHomeRuntimeContractRuntime: Boolean(
          (window as any).CoreHomeRuntimeContractRuntime?.resolveHomeRuntimeContracts
        ),
        hasHomeStartupHostRuntime: Boolean(
          (window as any).CoreHomeStartupHostRuntime?.resolveHomeStartupFromContext
        ),
        hasHomeModeContextRuntime: Boolean(
          (window as any).CoreHomeModeRuntime?.resolveHomeModeSelectionFromContext
        ),
        homeRuntimeContractCallCount: Number((window as any).__homeRuntimeContractCallCount || 0),
        homeStartupHostCallCount: Number((window as any).__homeStartupHostCallCount || 0),
        homeModeContextCallCount: Number((window as any).__homeModeContextCallCount || 0),
        modeKey: cfg && typeof cfg.key === "string" ? cfg.key : null
      };
    });

    expect(snapshot.hasHomeRuntimeContractRuntime).toBe(true);
    expect(snapshot.hasHomeStartupHostRuntime).toBe(true);
    expect(snapshot.hasHomeModeContextRuntime).toBe(true);
    expect(snapshot.homeRuntimeContractCallCount).toBeGreaterThan(0);
    expect(snapshot.homeStartupHostCallCount).toBeGreaterThan(0);
    expect(snapshot.homeModeContextCallCount).toBeGreaterThan(0);
    expect(snapshot.modeKey).toBe("standard_4x4_pow2_no_undo");
  });

  test("practice transfer flow delegates transfer navigation plan to runtime helper", async ({ page }) => {
    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await waitForWindowCondition(page, () => {
      const runtime = (window as any).CorePracticeTransferRuntime;
      const pageHostRuntime = (window as any).CorePracticeTransferPageHostRuntime;
      return (
        !!runtime &&
        typeof runtime.createPracticeTransferNavigationPlan === "function" &&
        typeof runtime.resolvePracticeTransferPrecheck === "function" &&
        !!pageHostRuntime &&
        typeof pageHostRuntime.createPracticeTransferPageActionResolvers === "function" &&
        typeof pageHostRuntime.applyPracticeTransferPageAction === "function" &&
        typeof pageHostRuntime.applyPracticeTransferPageActionFromContext === "function" &&
        typeof (window as any).openPracticeBoardFromCurrent === "function"
      );
    });

    const snapshot = await page.evaluate(() => {
      const runtime = (window as any).CorePracticeTransferRuntime;
      const pageHostRuntime = (window as any).CorePracticeTransferPageHostRuntime;
      const openPracticeBoardFromCurrent = (window as any).openPracticeBoardFromCurrent;
      if (
        !runtime ||
        typeof runtime.createPracticeTransferNavigationPlan !== "function" ||
        typeof runtime.resolvePracticeTransferPrecheck !== "function" ||
        !pageHostRuntime ||
        typeof pageHostRuntime.createPracticeTransferPageActionResolvers !== "function" ||
        typeof pageHostRuntime.applyPracticeTransferPageAction !== "function" ||
        typeof pageHostRuntime.applyPracticeTransferPageActionFromContext !== "function"
      ) {
        return {
          hasRuntime: false,
          hasPageHostRuntime: false,
          hasOpenFn: typeof openPracticeBoardFromCurrent === "function"
        };
      }
      if (typeof openPracticeBoardFromCurrent !== "function") {
        return { hasRuntime: true, hasPageHostRuntime: true, hasOpenFn: false };
      }

      const originalCreatePracticeTransferNavigationPlan = runtime.createPracticeTransferNavigationPlan;
      const originalResolvePracticeTransferPrecheck = runtime.resolvePracticeTransferPrecheck;
      const originalApplyPracticeTransferPageAction = pageHostRuntime.applyPracticeTransferPageAction;
      const originalApplyPracticeTransferPageActionFromContext =
        pageHostRuntime.applyPracticeTransferPageActionFromContext;
      const originalManager = (window as any).game_manager;
      const originalOpen = window.open;
      let createPlanCallCount = 0;
      let precheckCallCount = 0;
      let pageHostCallCount = 0;
      let pageHostContextCallCount = 0;
      let openedUrl = "";

      runtime.createPracticeTransferNavigationPlan = function (opts: any) {
        createPlanCallCount += 1;
        return originalCreatePracticeTransferNavigationPlan(opts);
      };
      runtime.resolvePracticeTransferPrecheck = function (opts: any) {
        precheckCallCount += 1;
        return originalResolvePracticeTransferPrecheck(opts);
      };
      pageHostRuntime.applyPracticeTransferPageAction = function (opts: any) {
        pageHostCallCount += 1;
        return originalApplyPracticeTransferPageAction(opts);
      };
      pageHostRuntime.applyPracticeTransferPageActionFromContext = function (opts: any) {
        pageHostContextCallCount += 1;
        return originalApplyPracticeTransferPageActionFromContext(opts);
      };
      (window as any).game_manager = {
        width: 4,
        height: 4,
        modeConfig: {
          ruleset: "pow2",
          spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }]
        },
        getFinalBoardMatrix() {
          return [
            [2, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
          ];
        }
      };
      try {
        window.localStorage.setItem("practice_guide_shown_v2", "1");
      } catch (_err) {}
      window.open = function (url?: string | URL | undefined) {
        openedUrl = String(url || "");
        return null as any;
      };

      try {
        openPracticeBoardFromCurrent();
        return {
          hasRuntime: true,
          hasPageHostRuntime: true,
          hasOpenFn: true,
          precheckCallCount,
          createPlanCallCount,
          pageHostCallCount,
          pageHostContextCallCount,
          openedUrl
        };
      } finally {
        runtime.createPracticeTransferNavigationPlan = originalCreatePracticeTransferNavigationPlan;
        runtime.resolvePracticeTransferPrecheck = originalResolvePracticeTransferPrecheck;
        pageHostRuntime.applyPracticeTransferPageAction = originalApplyPracticeTransferPageAction;
        pageHostRuntime.applyPracticeTransferPageActionFromContext =
          originalApplyPracticeTransferPageActionFromContext;
        (window as any).game_manager = originalManager;
        window.open = originalOpen;
      }
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasPageHostRuntime).toBe(true);
    expect(snapshot.hasOpenFn).toBe(true);
    expect(snapshot.precheckCallCount).toBeGreaterThan(0);
    expect(snapshot.createPlanCallCount).toBeGreaterThan(0);
    expect(snapshot.pageHostCallCount).toBe(0);
    expect(snapshot.pageHostContextCallCount).toBeGreaterThan(0);
    expect(snapshot.openedUrl).toContain("Practice_board.html");
    expect(snapshot.openedUrl).toContain("practice_token=");
    expect(snapshot.openedUrl).toContain("practice_ruleset=pow2");
    expect(snapshot.openedUrl).toContain("practice_guide_seen=1");
  });

});
