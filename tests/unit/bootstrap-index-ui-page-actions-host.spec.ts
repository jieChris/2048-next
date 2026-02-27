import { describe, expect, it } from "vitest";

import { createIndexUiPageActionResolvers } from "../../src/bootstrap/index-ui-page-actions-host";

describe("bootstrap index ui page actions host", () => {
  it("creates page action resolvers by delegating to host runtimes", () => {
    const trace: string[] = [];

    const resolvers = createIndexUiPageActionResolvers({
      settingsModalPageHostRuntime: {
        createSettingsModalInitResolvers() {
          trace.push("settings:init");
          return {
            initThemeSettingsUI() {
              trace.push("settings:init-theme");
              return "theme";
            },
            removeLegacyUndoSettingsUI() {
              trace.push("settings:remove-legacy");
              return "remove-legacy";
            },
            initTimerModuleSettingsUI() {
              trace.push("settings:init-timer");
              return "timer";
            }
          };
        },
        createSettingsModalActionResolvers() {
          trace.push("settings:actions");
          return {
            openSettingsModal() {
              trace.push("settings:open");
              return "open";
            },
            closeSettingsModal() {
              trace.push("settings:close");
              return "close";
            }
          };
        }
      },
      practiceTransferPageHostRuntime: {
        createPracticeTransferPageActionResolvers() {
          trace.push("practice:actions");
          return {
            openPracticeBoardFromCurrent() {
              trace.push("practice:open");
              return "practice";
            }
          };
        }
      },
      homeGuidePageHostRuntime: {
        createHomeGuidePageResolvers() {
          trace.push("home-guide:page");
          return {
            isHomePage() {
              trace.push("home-guide:is-home");
              return true;
            },
            getHomeGuideSteps() {
              trace.push("home-guide:steps");
              return [];
            },
            ensureHomeGuideDom() {
              trace.push("home-guide:ensure-dom");
            },
            clearHomeGuideHighlight() {
              trace.push("home-guide:clear");
            },
            elevateHomeGuideTarget() {
              trace.push("home-guide:elevate");
            },
            positionHomeGuidePanel() {
              trace.push("home-guide:position");
            },
            isElementVisibleForGuide() {
              trace.push("home-guide:visible");
              return true;
            },
            showHomeGuideDoneNotice() {
              trace.push("home-guide:done");
            },
            finishHomeGuide() {
              trace.push("home-guide:finish");
            },
            showHomeGuideStep() {
              trace.push("home-guide:step");
            },
            startHomeGuide() {
              trace.push("home-guide:start");
            }
          };
        },
        createHomeGuideLifecycleResolvers() {
          trace.push("home-guide:lifecycle");
          return {
            initHomeGuideSettingsUI() {
              trace.push("home-guide:init-settings");
              return "guide-settings";
            },
            autoStartHomeGuideIfNeeded() {
              trace.push("home-guide:auto-start");
              return "guide-auto";
            }
          };
        }
      },
      replayPageHostRuntime: {
        createReplayPageActionResolvers() {
          trace.push("replay:actions");
          return {
            showReplayModal() {
              trace.push("replay:show");
              return "show";
            },
            closeReplayModal() {
              trace.push("replay:close");
              return "close-replay";
            },
            exportReplay() {
              trace.push("replay:export");
              return "export";
            }
          };
        }
      }
    });

    expect(resolvers.initThemeSettingsUI()).toBe("theme");
    expect(resolvers.removeLegacyUndoSettingsUI()).toBe("remove-legacy");
    expect(resolvers.initTimerModuleSettingsUI()).toBe("timer");
    expect(resolvers.openPracticeBoardFromCurrent()).toBe("practice");
    expect(resolvers.initHomeGuideSettingsUI()).toBe("guide-settings");
    expect(resolvers.autoStartHomeGuideIfNeeded()).toBe("guide-auto");
    expect(resolvers.exportReplay()).toBe("export");
    expect(resolvers.closeReplayModal()).toBe("close-replay");
    expect(resolvers.openSettingsModal()).toBe("open");
    expect(resolvers.closeSettingsModal()).toBe("close");

    expect(trace).toContain("settings:init");
    expect(trace).toContain("practice:actions");
    expect(trace).toContain("home-guide:page");
    expect(trace).toContain("home-guide:lifecycle");
    expect(trace).toContain("replay:actions");
  });

  it("throws when required page action host runtime contract is missing", () => {
    expect(() => createIndexUiPageActionResolvers({ settingsModalPageHostRuntime: {} })).toThrowError(
      "CoreSettingsModalPageHostRuntime is required"
    );
  });

  it("throws when home guide page resolver contract is incomplete", () => {
    expect(() =>
      createIndexUiPageActionResolvers({
        settingsModalPageHostRuntime: {
          createSettingsModalInitResolvers() {
            return {
              initThemeSettingsUI() {},
              removeLegacyUndoSettingsUI() {},
              initTimerModuleSettingsUI() {}
            };
          },
          createSettingsModalActionResolvers() {
            return {
              openSettingsModal() {},
              closeSettingsModal() {}
            };
          }
        },
        practiceTransferPageHostRuntime: {
          createPracticeTransferPageActionResolvers() {
            return {
              openPracticeBoardFromCurrent() {}
            };
          }
        },
        homeGuidePageHostRuntime: {
          createHomeGuidePageResolvers() {
            return {
              isHomePage() {
                return true;
              }
            };
          },
          createHomeGuideLifecycleResolvers() {
            return {
              initHomeGuideSettingsUI() {},
              autoStartHomeGuideIfNeeded() {}
            };
          }
        },
        replayPageHostRuntime: {
          createReplayPageActionResolvers() {
            return {
              showReplayModal() {},
              closeReplayModal() {},
              exportReplay() {}
            };
          }
        }
      })
    ).toThrowError("CoreHomeGuidePageHostRuntime is required");
  });
});
