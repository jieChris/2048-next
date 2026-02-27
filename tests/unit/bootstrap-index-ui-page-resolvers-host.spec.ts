import { describe, expect, it } from "vitest";

import { createIndexUiMobileResolvers } from "../../src/bootstrap/index-ui-page-resolvers-host";

describe("bootstrap index ui page resolvers host", () => {
  it("creates mobile resolvers by delegating to page host runtimes", () => {
    const trace: string[] = [];

    const resolvers = createIndexUiMobileResolvers({
      mobileViewportPageHostRuntime: {
        createMobileViewportPageResolvers() {
          trace.push("viewport:create");
          return {
            isGamePageScope() {
              trace.push("viewport:game");
              return true;
            },
            isTimerboxMobileScope() {
              trace.push("viewport:timerbox-scope");
              return true;
            },
            isPracticePageScope() {
              trace.push("viewport:practice");
              return false;
            },
            isMobileGameViewport() {
              trace.push("viewport:mobile");
              return true;
            },
            isCompactGameViewport() {
              trace.push("viewport:compact");
              return true;
            },
            isTimerboxCollapseViewport() {
              trace.push("viewport:collapse");
              return true;
            }
          };
        }
      },
      mobileTopButtonsPageHostRuntime: {
        createMobileTopButtonsPageResolvers() {
          trace.push("top-buttons:create");
          return {
            ensureMobileUndoTopButton() {
              trace.push("top-buttons:undo");
              return "undo";
            },
            ensureMobileHintToggleButton() {
              trace.push("top-buttons:hint");
              return "hint";
            },
            syncMobileUndoTopButtonAvailability() {
              trace.push("top-buttons:sync");
              return "synced";
            },
            initMobileUndoTopButton() {
              trace.push("top-buttons:init");
              return "inited";
            }
          };
        }
      },
      topActionsPageHostRuntime: {
        createTopActionsPageResolvers() {
          trace.push("top-actions:create");
          return {
            syncMobileTopActionsPlacement() {
              trace.push("top-actions:mobile");
              return "mobile";
            },
            syncPracticeTopActionsPlacement() {
              trace.push("top-actions:practice");
              return "practice";
            }
          };
        }
      },
      mobileHintPageHostRuntime: {
        createMobileHintPageResolvers() {
          trace.push("hint:create");
          return {
            ensureMobileHintModalDom() {
              trace.push("hint:ensure");
              return "modal";
            },
            openMobileHintModal() {
              trace.push("hint:open");
              return "opened";
            },
            closeMobileHintModal() {
              trace.push("hint:close");
              return "closed";
            },
            syncMobileHintUI() {
              trace.push("hint:sync");
              return "hint-synced";
            },
            initMobileHintToggle() {
              trace.push("hint:init");
              return "hint-inited";
            }
          };
        }
      },
      mobileTimerboxPageHostRuntime: {
        createMobileTimerboxPageResolvers() {
          trace.push("timerbox:create");
          return {
            syncMobileTimerboxUI() {
              trace.push("timerbox:sync");
              return "timerbox-synced";
            },
            initMobileTimerboxToggle() {
              trace.push("timerbox:init");
              return "timerbox-inited";
            },
            requestResponsiveGameRelayout() {
              trace.push("timerbox:relayout");
              return "relayout";
            }
          };
        }
      }
    });

    expect(typeof resolvers.isGamePageScope).toBe("function");
    expect(resolvers.isGamePageScope()).toBe(true);
    expect(resolvers.isCompactGameViewport()).toBe(true);
    expect(resolvers.ensureMobileUndoTopButton()).toBe("undo");
    expect(resolvers.syncMobileUndoTopButtonAvailability()).toBe("synced");
    expect(resolvers.syncMobileTopActionsPlacement()).toBe("mobile");
    expect(resolvers.initMobileHintToggle()).toBe("hint-inited");
    expect(resolvers.syncMobileTimerboxUI()).toBe("timerbox-synced");
    expect(resolvers.requestResponsiveGameRelayout()).toBe("relayout");

    expect(trace).toContain("viewport:create");
    expect(trace).toContain("top-buttons:create");
    expect(trace).toContain("top-actions:create");
    expect(trace).toContain("hint:create");
    expect(trace).toContain("timerbox:create");
  });

  it("throws when required page host runtime contract is missing", () => {
    expect(() => createIndexUiMobileResolvers({ mobileViewportPageHostRuntime: {} })).toThrowError(
      "CoreMobileViewportPageHostRuntime is required"
    );
  });

  it("throws when resolver return contract is incomplete", () => {
    expect(() =>
      createIndexUiMobileResolvers({
        mobileViewportPageHostRuntime: {
          createMobileViewportPageResolvers() {
            return {
              isGamePageScope() {
                return true;
              }
            };
          }
        }
      })
    ).toThrowError("CoreMobileViewportPageHostRuntime is required");
  });
});
