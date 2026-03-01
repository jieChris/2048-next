import { describe, expect, it } from "vitest";

import { createMobileTopButtonsPageResolvers } from "../../src/bootstrap/mobile-top-buttons-page-host";

describe("bootstrap mobile top buttons page host", () => {
  it("creates top button resolvers and delegates with game scope", () => {
    const calls: Array<{ name: string; payload: unknown }> = [];
    const runtime = {
      ensureMobileUndoTopButtonDom(payload: unknown) {
        calls.push({ name: "undo", payload });
        return "undo-node";
      },
      ensureMobileHintToggleButtonDom(payload: unknown) {
        calls.push({ name: "hint", payload });
        return "hint-node";
      }
    };
    const availabilityHostRuntime = {
      applyMobileUndoTopAvailabilitySyncFromContext(payload: unknown) {
        calls.push({ name: "availability", payload });
        return "availability-synced";
      }
    };
    const mobileUndoTopHostRuntime = {
      applyMobileUndoTopInit(payload: unknown) {
        calls.push({ name: "init", payload });
        return "undo-init";
      }
    };
    const documentLike = { id: "doc" };
    const bodyLike = { id: "body" };
    const windowLike = { id: "window" };
    const tryUndoFromUi = () => true;
    const resolvers = createMobileTopButtonsPageResolvers({
      mobileTopButtonsRuntime: runtime,
      mobileUndoTopAvailabilityHostRuntime: availabilityHostRuntime,
      mobileUndoTopHostRuntime,
      mobileUndoTopRuntime: { id: "mobile-undo-top-runtime" },
      undoActionRuntime: { id: "undo-action-runtime" },
      documentLike,
      bodyLike,
      windowLike,
      isGamePageScope() {
        return true;
      },
      isCompactGameViewport() {
        return false;
      },
      tryUndoFromUi
    });

    expect(resolvers.ensureMobileUndoTopButton()).toBe("undo-node");
    expect(resolvers.ensureMobileHintToggleButton()).toBe("hint-node");
    expect(resolvers.syncMobileUndoTopButtonAvailability()).toBe("availability-synced");
    expect(resolvers.initMobileUndoTopButton()).toBe("undo-init");
    expect(calls).toEqual([
      {
        name: "undo",
        payload: { isGamePageScope: true, documentLike }
      },
      {
        name: "hint",
        payload: { isGamePageScope: true, documentLike }
      },
      {
        name: "availability",
        payload: {
          isGamePageScope: expect.any(Function),
          ensureMobileUndoTopButton: expect.any(Function),
          isCompactGameViewport: expect.any(Function),
          bodyLike,
          windowLike,
          undoActionRuntime: { id: "undo-action-runtime" },
          mobileUndoTopRuntime: { id: "mobile-undo-top-runtime" },
          fallbackLabel: "撤回"
        }
      },
      {
        name: "init",
        payload: {
          isGamePageScope: expect.any(Function),
          ensureMobileUndoTopButton: expect.any(Function),
          tryUndoFromUi,
          syncMobileUndoTopButtonAvailability: expect.any(Function)
        }
      }
    ]);
  });

  it("returns null when runtime api is missing", () => {
    const resolvers = createMobileTopButtonsPageResolvers({
      mobileTopButtonsRuntime: {},
      documentLike: {}
    });

    expect(resolvers.ensureMobileUndoTopButton()).toBeNull();
    expect(resolvers.ensureMobileHintToggleButton()).toBeNull();
    expect(resolvers.syncMobileUndoTopButtonAvailability()).toBeNull();
    expect(resolvers.initMobileUndoTopButton()).toBeNull();
  });
});
