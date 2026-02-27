import { describe, expect, it, vi } from "vitest";

import { createMobileTimerboxPageResolvers } from "../../src/bootstrap/mobile-timerbox-page-host";

describe("bootstrap mobile timerbox page host", () => {
  it("creates timerbox resolvers and delegates sync/init orchestration", () => {
    const applyMobileTimerboxUiSyncFromContext = vi.fn(() => ({ didInvokeUiSync: true }));
    const applyMobileTimerboxToggleInit = vi.fn(() => ({ didRunSync: true }));
    const applyResponsiveRelayoutRequestFromContext = vi.fn(() => ({
      didInvokeRequest: true,
      timerRef: { id: "timer-1" }
    }));
    const documentLike = {
      getElementById: vi.fn((id: string) => ({ id }))
    };

    const resolvers = createMobileTimerboxPageResolvers({
      mobileTimerboxHostRuntime: {
        applyMobileTimerboxUiSyncFromContext,
        applyMobileTimerboxToggleInit
      },
      responsiveRelayoutHostRuntime: {
        applyResponsiveRelayoutRequestFromContext
      },
      mobileTimerboxRuntime: { id: "runtime" },
      responsiveRelayoutRuntime: { id: "relayout-runtime" },
      isTimerboxMobileScope: () => true,
      isTimerboxCollapseViewport: () => false,
      documentLike,
      storageRuntime: { id: "storage" },
      windowLike: { id: "window" },
      storageKey: "key",
      hiddenClassName: "hidden",
      expandedClassName: "expanded",
      defaultCollapsed: true,
      fallbackHiddenToggleDisplay: "none",
      fallbackVisibleToggleDisplay: "inline-flex",
      fallbackHiddenAriaExpanded: "false",
      fallbackExpandLabel: "expand",
      fallbackCollapseLabel: "collapse",
      syncMobileHintUI: vi.fn(),
      syncMobileTopActionsPlacement: vi.fn(),
      syncPracticeTopActionsPlacement: vi.fn(),
      syncMobileUndoTopButtonAvailability: vi.fn(),
      relayoutDelayMs: 120,
      clearTimeoutLike: vi.fn(),
      setTimeoutLike: vi.fn()
    });

    const syncResult = resolvers.syncMobileTimerboxUI({ persist: true });
    const initResult = resolvers.initMobileTimerboxToggle();
    const relayoutResult = resolvers.requestResponsiveGameRelayout();
    resolvers.requestResponsiveGameRelayout();

    expect(syncResult).toEqual({ didInvokeUiSync: true });
    expect(initResult).toEqual({ didRunSync: true });
    expect(relayoutResult).toEqual({ didInvokeRequest: true, timerRef: { id: "timer-1" } });
    expect(applyMobileTimerboxUiSyncFromContext).toHaveBeenCalledTimes(1);
    expect(applyMobileTimerboxToggleInit).toHaveBeenCalledTimes(1);
    expect(applyResponsiveRelayoutRequestFromContext).toHaveBeenCalledTimes(2);

    const syncPayload = applyMobileTimerboxUiSyncFromContext.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    expect(syncPayload.options).toEqual({ persist: true });
    expect(syncPayload.storageKey).toBe("key");
    expect(typeof syncPayload.getElementById).toBe("function");
    const getElementById = syncPayload.getElementById as ((id: string) => unknown) | undefined;
    expect(getElementById ? getElementById("timerbox") : null).toEqual({ id: "timerbox" });
    expect(documentLike.getElementById).toHaveBeenCalledWith("timerbox");

    const initPayload = applyMobileTimerboxToggleInit.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(typeof initPayload.syncMobileTimerboxUI).toBe("function");
    expect(typeof initPayload.getElementById).toBe("function");
    expect(typeof initPayload.requestResponsiveGameRelayout).toBe("function");

    const relayoutPayload = applyResponsiveRelayoutRequestFromContext.mock.calls[1]?.[0] as Record<
      string,
      unknown
    >;
    expect(relayoutPayload.existingTimer).toEqual({ id: "timer-1" });
    expect(typeof relayoutPayload.syncMobileTimerboxUI).toBe("function");
  });

  it("returns null when host runtime api is missing", () => {
    const resolvers = createMobileTimerboxPageResolvers({
      mobileTimerboxHostRuntime: {}
    });

    expect(resolvers.syncMobileTimerboxUI()).toBeNull();
    expect(resolvers.initMobileTimerboxToggle()).toBeNull();
    expect(resolvers.requestResponsiveGameRelayout()).toBeNull();
  });

  it("falls back to external relayout request when host runtime api is missing", () => {
    const fallback = vi.fn(() => ({ fromFallback: true }));
    const resolvers = createMobileTimerboxPageResolvers({
      mobileTimerboxHostRuntime: {},
      requestResponsiveGameRelayout: fallback
    });

    expect(resolvers.requestResponsiveGameRelayout()).toEqual({ fromFallback: true });
    expect(fallback).toHaveBeenCalledTimes(1);
  });
});
