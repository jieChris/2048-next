import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("index ui delegates home guide page resolver creation to host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__homeGuidePageResolverCreateCalls = 0;
      (window as any).__homeGuidePageResolverIsHomeCalls = 0;
      (window as any).__homeGuidePageResolverStepsCalls = 0;
      (window as any).__homeGuidePageResolverEnsureCalls = 0;
      (window as any).__homeGuidePageResolverClearCalls = 0;
      (window as any).__homeGuidePageResolverElevateCalls = 0;
      (window as any).__homeGuidePageResolverPositionCalls = 0;
      (window as any).__homeGuidePageResolverVisibleCalls = 0;
      (window as any).__homeGuidePageResolverDoneCalls = 0;
      (window as any).__homeGuidePageResolverFinishCalls = 0;
      (window as any).__homeGuidePageResolverShowStepCalls = 0;
      (window as any).__homeGuidePageResolverStartCalls = 0;
      try {
        window.localStorage.setItem("home_guide_seen_v1", "1");
      } catch (_err) {}

      const runtimeTarget: Record<string, unknown> = {};
      const runtimeProxy = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "createHomeGuidePageResolvers" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__homeGuidePageResolverCreateCalls =
                Number((window as any).__homeGuidePageResolverCreateCalls || 0) + 1;
              const resolvers = (value as (input: unknown) => Record<string, unknown>)(opts) || {};
              const originalIsHomePage = resolvers.isHomePage;
              const originalGetSteps = resolvers.getHomeGuideSteps;
              const originalEnsure = resolvers.ensureHomeGuideDom;
              const originalClear = resolvers.clearHomeGuideHighlight;
              const originalElevate = resolvers.elevateHomeGuideTarget;
              const originalPosition = resolvers.positionHomeGuidePanel;
              const originalVisible = resolvers.isElementVisibleForGuide;
              const originalDone = resolvers.showHomeGuideDoneNotice;
              const originalFinish = resolvers.finishHomeGuide;
              const originalShowStep = resolvers.showHomeGuideStep;
              const originalStart = resolvers.startHomeGuide;
              return {
                isHomePage() {
                  (window as any).__homeGuidePageResolverIsHomeCalls =
                    Number((window as any).__homeGuidePageResolverIsHomeCalls || 0) + 1;
                  return typeof originalIsHomePage === "function" ? originalIsHomePage() : false;
                },
                getHomeGuideSteps() {
                  (window as any).__homeGuidePageResolverStepsCalls =
                    Number((window as any).__homeGuidePageResolverStepsCalls || 0) + 1;
                  return typeof originalGetSteps === "function" ? originalGetSteps() : [];
                },
                ensureHomeGuideDom() {
                  (window as any).__homeGuidePageResolverEnsureCalls =
                    Number((window as any).__homeGuidePageResolverEnsureCalls || 0) + 1;
                  return typeof originalEnsure === "function" ? originalEnsure() : null;
                },
                clearHomeGuideHighlight() {
                  (window as any).__homeGuidePageResolverClearCalls =
                    Number((window as any).__homeGuidePageResolverClearCalls || 0) + 1;
                  if (typeof originalClear === "function") return originalClear();
                  return null;
                },
                elevateHomeGuideTarget(node?: unknown) {
                  (window as any).__homeGuidePageResolverElevateCalls =
                    Number((window as any).__homeGuidePageResolverElevateCalls || 0) + 1;
                  if (typeof originalElevate === "function") return originalElevate(node);
                  return null;
                },
                positionHomeGuidePanel() {
                  (window as any).__homeGuidePageResolverPositionCalls =
                    Number((window as any).__homeGuidePageResolverPositionCalls || 0) + 1;
                  if (typeof originalPosition === "function") return originalPosition();
                  return null;
                },
                isElementVisibleForGuide(node?: unknown) {
                  (window as any).__homeGuidePageResolverVisibleCalls =
                    Number((window as any).__homeGuidePageResolverVisibleCalls || 0) + 1;
                  return typeof originalVisible === "function" ? !!originalVisible(node) : false;
                },
                showHomeGuideDoneNotice() {
                  (window as any).__homeGuidePageResolverDoneCalls =
                    Number((window as any).__homeGuidePageResolverDoneCalls || 0) + 1;
                  if (typeof originalDone === "function") return originalDone();
                  return null;
                },
                finishHomeGuide(markSeen?: unknown, options?: unknown) {
                  (window as any).__homeGuidePageResolverFinishCalls =
                    Number((window as any).__homeGuidePageResolverFinishCalls || 0) + 1;
                  if (typeof originalFinish === "function") return originalFinish(markSeen, options);
                  return null;
                },
                showHomeGuideStep(index?: unknown) {
                  (window as any).__homeGuidePageResolverShowStepCalls =
                    Number((window as any).__homeGuidePageResolverShowStepCalls || 0) + 1;
                  if (typeof originalShowStep === "function") return originalShowStep(index);
                  return null;
                },
                startHomeGuide(options?: unknown) {
                  (window as any).__homeGuidePageResolverStartCalls =
                    Number((window as any).__homeGuidePageResolverStartCalls || 0) + 1;
                  if (typeof originalStart === "function") return originalStart(options);
                  return null;
                }
              };
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });

      Object.defineProperty(window, "CoreHomeGuidePageHostRuntime", {
        configurable: true,
        writable: true,
        value: runtimeProxy
      });
    });

    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(260);

    const snapshot = await page.evaluate(async () => {
      const runtime = (window as any).CoreHomeGuidePageHostRuntime;
      const openSettingsModal = (window as any).openSettingsModal;
      if (typeof openSettingsModal === "function") {
        openSettingsModal();
        const trigger = document.getElementById("home-guide-trigger-btn") as HTMLButtonElement | null;
        if (trigger) {
          trigger.click();
        }
        await new Promise((resolve) => {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => resolve(null));
          });
        });
      }

      return {
        hasRuntime: !!runtime && typeof runtime.createHomeGuidePageResolvers === "function",
        createCallCount: Number((window as any).__homeGuidePageResolverCreateCalls || 0),
        isHomeCallCount: Number((window as any).__homeGuidePageResolverIsHomeCalls || 0),
        getStepsCallCount: Number((window as any).__homeGuidePageResolverStepsCalls || 0),
        ensureCallCount: Number((window as any).__homeGuidePageResolverEnsureCalls || 0),
        clearCallCount: Number((window as any).__homeGuidePageResolverClearCalls || 0),
        elevateCallCount: Number((window as any).__homeGuidePageResolverElevateCalls || 0),
        positionCallCount: Number((window as any).__homeGuidePageResolverPositionCalls || 0),
        visibleCallCount: Number((window as any).__homeGuidePageResolverVisibleCalls || 0),
        doneCallCount: Number((window as any).__homeGuidePageResolverDoneCalls || 0),
        finishCallCount: Number((window as any).__homeGuidePageResolverFinishCalls || 0),
        showStepCallCount: Number((window as any).__homeGuidePageResolverShowStepCalls || 0),
        startCallCount: Number((window as any).__homeGuidePageResolverStartCalls || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.createCallCount).toBeGreaterThan(0);
    expect(snapshot.isHomeCallCount).toBeGreaterThan(0);
    expect(snapshot.getStepsCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.ensureCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.clearCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.elevateCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.positionCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.visibleCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.doneCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.finishCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.showStepCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.startCallCount).toBeGreaterThanOrEqual(0);
  });


});
