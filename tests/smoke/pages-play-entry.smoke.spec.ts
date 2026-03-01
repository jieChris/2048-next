import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("play application delegates entry resolution to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__playEntryPlanCallCount = 0;
      (window as any).__playRuntimeContractCallCount = 0;
      (window as any).__playChallengeIntroCallCount = 0;
      (window as any).__playChallengeIntroUiCallCount = 0;
      (window as any).__playChallengeIntroActionCallCount = 0;
      (window as any).__playChallengeIntroHostCallCount = 0;
      (window as any).__playChallengeContextCallCount = 0;
      (window as any).__playHeaderStateCallCount = 0;
      (window as any).__playHeaderHostCallCount = 0;
      (window as any).__playStartGuardCallCount = 0;
      (window as any).__playStartupPayloadCallCount = 0;
      (window as any).__playStartupContextCallCount = 0;
      (window as any).__playStartupHostCallCount = 0;
      (window as any).__playPageContextCustomSpawnCallCount = 0;
      (window as any).__playPageContextHeaderCallCount = 0;
      (window as any).__playCustomSpawnHostCallCount = 0;
      const runtimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayEntryRuntime = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "resolvePlayEntryPlan" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__playEntryPlanCallCount =
                Number((window as any).__playEntryPlanCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const runtimeContractTarget: Record<string, unknown> = {};
      (window as any).CorePlayRuntimeContractRuntime = new Proxy(runtimeContractTarget, {
        set(target, prop, value) {
          if (prop === "resolvePlayRuntimeContracts" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__playRuntimeContractCallCount =
                Number((window as any).__playRuntimeContractCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const pageContextRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayPageContextRuntime = new Proxy(pageContextRuntimeTarget, {
        set(target, prop, value) {
          if (
            prop === "resolvePlayCustomSpawnModeConfigFromPageContext" &&
            typeof value === "function"
          ) {
            target[prop] = function (opts: unknown) {
              (window as any).__playPageContextCustomSpawnCallCount =
                Number((window as any).__playPageContextCustomSpawnCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          if (prop === "applyPlayHeaderFromPageContext" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__playPageContextHeaderCallCount =
                Number((window as any).__playPageContextHeaderCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const challengeIntroRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayChallengeIntroRuntime = new Proxy(challengeIntroRuntimeTarget, {
        set(target, prop, value) {
          if (prop === "resolvePlayChallengeIntroModel" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__playChallengeIntroCallCount =
                Number((window as any).__playChallengeIntroCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const challengeIntroUiRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayChallengeIntroUiRuntime = new Proxy(challengeIntroUiRuntimeTarget, {
        set(target, prop, value) {
          if (prop === "resolvePlayChallengeIntroUiState" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__playChallengeIntroUiCallCount =
                Number((window as any).__playChallengeIntroUiCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const challengeIntroActionRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayChallengeIntroActionRuntime = new Proxy(
        challengeIntroActionRuntimeTarget,
        {
          set(target, prop, value) {
            if (prop === "resolvePlayChallengeIntroActionState" && typeof value === "function") {
              target[prop] = function (opts: unknown) {
                (window as any).__playChallengeIntroActionCallCount =
                  Number((window as any).__playChallengeIntroActionCallCount || 0) + 1;
                return (value as (input: unknown) => unknown)(opts);
              };
              return true;
            }
            target[prop] = value;
            return true;
          }
        }
      );
      const challengeContextRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayChallengeContextRuntime = new Proxy(challengeContextRuntimeTarget, {
        set(target, prop, value) {
          if (prop === "resolvePlayChallengeContext" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__playChallengeContextCallCount =
                Number((window as any).__playChallengeContextCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const challengeIntroHostRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayChallengeIntroHostRuntime = new Proxy(
        challengeIntroHostRuntimeTarget,
        {
          set(target, prop, value) {
            if (prop === "resolvePlayChallengeIntroFromContext" && typeof value === "function") {
              target[prop] = function (opts: unknown) {
                (window as any).__playChallengeIntroHostCallCount =
                  Number((window as any).__playChallengeIntroHostCallCount || 0) + 1;
                return (value as (input: unknown) => unknown)(opts);
              };
              return true;
            }
            target[prop] = value;
            return true;
          }
        }
      );
      const playCustomSpawnHostRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayCustomSpawnHostRuntime = new Proxy(
        playCustomSpawnHostRuntimeTarget,
        {
          set(target, prop, value) {
            if (
              prop === "resolvePlayCustomSpawnModeConfigFromContext" &&
              typeof value === "function"
            ) {
              target[prop] = function (opts: unknown) {
                (window as any).__playCustomSpawnHostCallCount =
                  Number((window as any).__playCustomSpawnHostCallCount || 0) + 1;
                return (value as (input: unknown) => unknown)(opts);
              };
              return true;
            }
            target[prop] = value;
            return true;
          }
        }
      );
      const startGuardRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayStartGuardRuntime = new Proxy(startGuardRuntimeTarget, {
        set(target, prop, value) {
          if (prop === "resolvePlayStartGuardState" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__playStartGuardCallCount =
                Number((window as any).__playStartGuardCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const startupPayloadRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayStartupPayloadRuntime = new Proxy(startupPayloadRuntimeTarget, {
        set(target, prop, value) {
          if (prop === "resolvePlayStartupPayload" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__playStartupPayloadCallCount =
                Number((window as any).__playStartupPayloadCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const startupContextRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayStartupContextRuntime = new Proxy(startupContextRuntimeTarget, {
        set(target, prop, value) {
          if (prop === "resolvePlayStartupContext" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__playStartupContextCallCount =
                Number((window as any).__playStartupContextCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const startupHostRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayStartupHostRuntime = new Proxy(startupHostRuntimeTarget, {
        set(target, prop, value) {
          if (prop === "resolvePlayStartupFromContext" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__playStartupHostCallCount =
                Number((window as any).__playStartupHostCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const headerHostRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayHeaderHostRuntime = new Proxy(headerHostRuntimeTarget, {
        set(target, prop, value) {
          if (prop === "resolvePlayHeaderFromContext" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__playHeaderHostCallCount =
                Number((window as any).__playHeaderHostCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const headerRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayHeaderRuntime = new Proxy(headerRuntimeTarget, {
        set(target, prop, value) {
          if (prop === "resolvePlayHeaderState" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__playHeaderStateCallCount =
                Number((window as any).__playHeaderStateCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/play.html?mode_key=standard_4x4_pow2_no_undo", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Play response should exist").not.toBeNull();
    expect(response?.ok(), "Play response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => ({
      hasRuntime: Boolean((window as any).CorePlayEntryRuntime?.resolvePlayEntryPlan),
      hasRuntimeContract: Boolean(
        (window as any).CorePlayRuntimeContractRuntime?.resolvePlayRuntimeContracts
      ),
      hasPageContextRuntime: Boolean(
        (window as any).CorePlayPageContextRuntime?.resolvePlayCustomSpawnModeConfigFromPageContext &&
        (window as any).CorePlayPageContextRuntime?.applyPlayHeaderFromPageContext
      ),
      hasChallengeIntroRuntime: Boolean(
        (window as any).CorePlayChallengeIntroRuntime?.resolvePlayChallengeIntroModel
      ),
      hasChallengeIntroUiRuntime: Boolean(
        (window as any).CorePlayChallengeIntroUiRuntime?.resolvePlayChallengeIntroUiState
      ),
      hasChallengeIntroActionRuntime: Boolean(
        (window as any).CorePlayChallengeIntroActionRuntime?.resolvePlayChallengeIntroActionState
      ),
      hasChallengeIntroHostRuntime: Boolean(
        (window as any).CorePlayChallengeIntroHostRuntime?.resolvePlayChallengeIntroFromContext
      ),
      hasChallengeContextRuntime: Boolean(
        (window as any).CorePlayChallengeContextRuntime?.resolvePlayChallengeContext
      ),
      hasPlayCustomSpawnHostRuntime: Boolean(
        (window as any).CorePlayCustomSpawnHostRuntime?.resolvePlayCustomSpawnModeConfigFromContext
      ),
      hasStartGuardRuntime: Boolean(
        (window as any).CorePlayStartGuardRuntime?.resolvePlayStartGuardState
      ),
      hasStartupPayloadRuntime: Boolean(
        (window as any).CorePlayStartupPayloadRuntime?.resolvePlayStartupPayload
      ),
      hasStartupContextRuntime: Boolean(
        (window as any).CorePlayStartupContextRuntime?.resolvePlayStartupContext
      ),
      hasStartupHostRuntime: Boolean(
        (window as any).CorePlayStartupHostRuntime?.resolvePlayStartupFromContext
      ),
      hasHeaderHostRuntime: Boolean(
        (window as any).CorePlayHeaderHostRuntime?.resolvePlayHeaderFromContext
      ),
      hasHeaderStateRuntime: Boolean(
        (window as any).CorePlayHeaderRuntime?.resolvePlayHeaderState
      ),
      entryCallCount: Number((window as any).__playEntryPlanCallCount || 0),
      runtimeContractCallCount: Number((window as any).__playRuntimeContractCallCount || 0),
      pageContextCustomSpawnCallCount: Number(
        (window as any).__playPageContextCustomSpawnCallCount || 0
      ),
      pageContextHeaderCallCount: Number((window as any).__playPageContextHeaderCallCount || 0),
      challengeIntroCallCount: Number((window as any).__playChallengeIntroCallCount || 0),
      challengeIntroUiCallCount: Number((window as any).__playChallengeIntroUiCallCount || 0),
      challengeIntroActionCallCount: Number(
        (window as any).__playChallengeIntroActionCallCount || 0
      ),
      challengeIntroHostCallCount: Number((window as any).__playChallengeIntroHostCallCount || 0),
      challengeContextCallCount: Number((window as any).__playChallengeContextCallCount || 0),
      playCustomSpawnHostCallCount: Number((window as any).__playCustomSpawnHostCallCount || 0),
      startGuardCallCount: Number((window as any).__playStartGuardCallCount || 0),
      startupPayloadCallCount: Number((window as any).__playStartupPayloadCallCount || 0),
      startupContextCallCount: Number((window as any).__playStartupContextCallCount || 0),
      startupHostCallCount: Number((window as any).__playStartupHostCallCount || 0),
      headerHostCallCount: Number((window as any).__playHeaderHostCallCount || 0),
      headerStateCallCount: Number((window as any).__playHeaderStateCallCount || 0),
      modeKey:
        (window as any).GAME_MODE_CONFIG && typeof (window as any).GAME_MODE_CONFIG.key === "string"
          ? (window as any).GAME_MODE_CONFIG.key
          : null,
      challengeContext: (window as any).GAME_CHALLENGE_CONTEXT,
      topIntroDisplay: (() => {
        const node = document.getElementById("top-mode-intro-btn");
        if (!node) return null;
        const htmlNode = node as HTMLElement;
        return htmlNode.style.display || "";
      })()
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasRuntimeContract).toBe(true);
    expect(snapshot.hasPageContextRuntime).toBe(true);
    expect(snapshot.hasChallengeIntroRuntime).toBe(true);
    expect(snapshot.hasChallengeIntroUiRuntime).toBe(true);
    expect(snapshot.hasChallengeIntroActionRuntime).toBe(true);
    expect(snapshot.hasChallengeIntroHostRuntime).toBe(true);
    expect(snapshot.hasChallengeContextRuntime).toBe(true);
    expect(snapshot.hasPlayCustomSpawnHostRuntime).toBe(true);
    expect(snapshot.hasStartGuardRuntime).toBe(true);
    expect(snapshot.hasStartupPayloadRuntime).toBe(true);
    expect(snapshot.hasStartupContextRuntime).toBe(true);
    expect(snapshot.hasStartupHostRuntime).toBe(true);
    expect(snapshot.hasHeaderHostRuntime).toBe(true);
    expect(snapshot.hasHeaderStateRuntime).toBe(true);
    expect(snapshot.entryCallCount).toBeGreaterThan(0);
    expect(snapshot.runtimeContractCallCount).toBeGreaterThan(0);
    expect(snapshot.pageContextCustomSpawnCallCount).toBeGreaterThan(0);
    expect(snapshot.pageContextHeaderCallCount).toBeGreaterThan(0);
    expect(snapshot.challengeIntroCallCount).toBeGreaterThan(0);
    expect(snapshot.challengeIntroUiCallCount).toBeGreaterThan(0);
    expect(snapshot.challengeIntroActionCallCount).toBeGreaterThan(0);
    expect(snapshot.challengeIntroHostCallCount).toBeGreaterThan(0);
    expect(snapshot.challengeContextCallCount).toBeGreaterThan(0);
    expect(snapshot.playCustomSpawnHostCallCount).toBeGreaterThan(0);
    expect(snapshot.startGuardCallCount).toBeGreaterThan(0);
    expect(snapshot.startupPayloadCallCount).toBeGreaterThan(0);
    expect(snapshot.startupContextCallCount).toBeGreaterThan(0);
    expect(snapshot.startupHostCallCount).toBeGreaterThan(0);
    expect(snapshot.headerHostCallCount).toBeGreaterThan(0);
    expect(snapshot.headerStateCallCount).toBeGreaterThan(0);
    expect(snapshot.modeKey).toBe("standard_4x4_pow2_no_undo");
    expect(snapshot.challengeContext).toBeNull();
    expect(snapshot.topIntroDisplay).toBe("none");
  });
});
