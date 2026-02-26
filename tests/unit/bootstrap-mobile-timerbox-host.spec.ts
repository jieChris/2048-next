import { describe, expect, it, vi } from "vitest";

import {
  applyMobileTimerboxToggleInit,
  applyMobileTimerboxUiSync,
  applyMobileTimerboxUiSyncFromContext
} from "../../src/bootstrap/mobile-timerbox-host";

describe("bootstrap mobile timerbox host", () => {
  it("returns early when page scope is not mobile timerbox scope", () => {
    const result = applyMobileTimerboxToggleInit({
      isTimerboxMobileScope() {
        return false;
      }
    });

    expect(result).toEqual({
      isScope: false,
      hasToggle: false,
      hasTimerbox: false,
      didBindToggle: false,
      didRunSync: false
    });
  });

  it("returns element availability when toggle or timerbox is missing", () => {
    const result = applyMobileTimerboxToggleInit({
      isTimerboxMobileScope() {
        return true;
      },
      getElementById(id: string) {
        if (id === "timerbox") return { id: "timerbox" };
        return null;
      }
    });

    expect(result).toEqual({
      isScope: true,
      hasToggle: false,
      hasTimerbox: true,
      didBindToggle: false,
      didRunSync: false
    });
  });

  it("binds toggle click and applies startup sync chain", () => {
    const handlers: Record<string, (eventLike: unknown) => void> = {};
    const addEventListener = vi.fn((name: string, handler: (eventLike: unknown) => void) => {
      handlers[name] = handler;
    });
    const toggleBtn = {
      __mobileTimerboxBound: false,
      addEventListener
    };
    const timerBox = {
      classList: {
        contains(name: string) {
          return name === "is-mobile-expanded";
        }
      }
    };

    const syncMobileTimerboxUI = vi.fn();
    const requestResponsiveGameRelayout = vi.fn();
    const syncMobileTopActionsPlacement = vi.fn();
    const syncPracticeTopActionsPlacement = vi.fn();
    const syncMobileUndoTopButtonAvailability = vi.fn();

    const result = applyMobileTimerboxToggleInit({
      isTimerboxMobileScope() {
        return true;
      },
      getElementById(id: string) {
        if (id === "timerbox-toggle-btn") return toggleBtn;
        if (id === "timerbox") return timerBox;
        return null;
      },
      syncMobileTimerboxUI,
      requestResponsiveGameRelayout,
      syncMobileTopActionsPlacement,
      syncPracticeTopActionsPlacement,
      syncMobileUndoTopButtonAvailability
    });

    expect(result).toEqual({
      isScope: true,
      hasToggle: true,
      hasTimerbox: true,
      didBindToggle: true,
      didRunSync: true
    });
    expect(toggleBtn.__mobileTimerboxBound).toBe(true);
    expect(addEventListener).toHaveBeenCalledTimes(1);
    expect(syncMobileTopActionsPlacement).toHaveBeenCalledTimes(1);
    expect(syncPracticeTopActionsPlacement).toHaveBeenCalledTimes(1);
    expect(syncMobileUndoTopButtonAvailability).toHaveBeenCalledTimes(1);
    expect(syncMobileTimerboxUI).toHaveBeenCalledTimes(1);
    expect(syncMobileTimerboxUI).toHaveBeenNthCalledWith(1);

    const preventDefault = vi.fn();
    handlers.click({ preventDefault });
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(syncMobileTimerboxUI).toHaveBeenNthCalledWith(2, {
      collapsed: true,
      persist: true
    });
    expect(requestResponsiveGameRelayout).toHaveBeenCalledTimes(1);
  });

  it("skips rebinding when toggle already has bound marker", () => {
    const addEventListener = vi.fn();
    const toggleBtn = {
      __mobileTimerboxBound: true,
      addEventListener
    };

    const result = applyMobileTimerboxToggleInit({
      isTimerboxMobileScope() {
        return true;
      },
      getElementById(id: string) {
        if (id === "timerbox-toggle-btn") return toggleBtn;
        if (id === "timerbox") return { classList: { contains: () => false } };
        return null;
      },
      syncMobileTimerboxUI: vi.fn()
    });

    expect(result.didBindToggle).toBe(false);
    expect(addEventListener).not.toHaveBeenCalled();
  });

  it("returns early when timerbox ui sync scope is false", () => {
    const result = applyMobileTimerboxUiSync({
      isTimerboxMobileScope() {
        return false;
      }
    });

    expect(result).toEqual({
      isScope: false,
      hasTimerbox: false,
      hasToggle: false,
      didApply: false,
      didPersist: false,
      collapsible: false,
      timerModuleHidden: false
    });
  });

  it("applies hidden timerbox model when module is hidden", () => {
    const remove = vi.fn();
    const setAttribute = vi.fn();
    const timerBox = {
      classList: {
        contains(name: string) {
          return name === "timerbox-hidden-mode";
        },
        remove
      }
    };
    const toggleBtn = {
      style: { display: "" },
      setAttribute
    };
    const runtime = {
      resolveMobileTimerboxDisplayModel: vi.fn(() => ({
        toggleDisplay: "none",
        ariaExpanded: "false",
        label: "展开计时器",
        iconSvg: "<svg/>",
        expanded: false
      })),
      resolveMobileTimerboxAppliedModel: vi.fn((opts: any) => opts.displayModel)
    };

    const result = applyMobileTimerboxUiSync({
      options: {},
      isTimerboxMobileScope() {
        return true;
      },
      isTimerboxCollapseViewport() {
        return true;
      },
      getElementById(id: string) {
        if (id === "timerbox") return timerBox;
        if (id === "timerbox-toggle-btn") return toggleBtn;
        return null;
      },
      mobileTimerboxRuntime: runtime,
      getTimerboxToggleIconSvg() {
        return "<svg hidden />";
      }
    });

    expect(result).toEqual({
      isScope: true,
      hasTimerbox: true,
      hasToggle: true,
      didApply: true,
      didPersist: false,
      collapsible: true,
      timerModuleHidden: true
    });
    expect(runtime.resolveMobileTimerboxDisplayModel).toHaveBeenCalledTimes(1);
    expect(runtime.resolveMobileTimerboxAppliedModel).toHaveBeenCalledTimes(1);
    expect(toggleBtn.style.display).toBe("none");
    expect(setAttribute).toHaveBeenCalledWith("aria-expanded", "false");
    expect(remove).toHaveBeenCalledWith("is-mobile-expanded");
  });

  it("applies expanded timerbox model and persists collapsed state", () => {
    const toggles: Array<{ name: string; force: boolean }> = [];
    const attrs: Record<string, string> = {};
    const timerBox = {
      classList: {
        contains() {
          return false;
        },
        toggle(name: string, force?: boolean) {
          toggles.push({ name, force: !!force });
        }
      }
    };
    const toggleBtn = {
      style: { display: "" },
      setAttribute(name: string, value: string) {
        attrs[name] = value;
      },
      innerHTML: ""
    };
    const writeCollapsed = vi.fn();
    const runtime = {
      resolveMobileTimerboxCollapsedValue: vi.fn(() => false),
      resolveMobileTimerboxDisplayModel: vi.fn(() => ({
        toggleDisplay: "inline-flex",
        ariaExpanded: "true",
        label: "收起计时器",
        iconSvg: "<svg expanded />",
        expanded: true
      })),
      resolveMobileTimerboxAppliedModel: vi.fn((opts: any) => opts.displayModel)
    };

    const result = applyMobileTimerboxUiSync({
      options: {
        collapsed: false,
        persist: true
      },
      isTimerboxMobileScope() {
        return true;
      },
      isTimerboxCollapseViewport() {
        return true;
      },
      getElementById(id: string) {
        if (id === "timerbox") return timerBox;
        if (id === "timerbox-toggle-btn") return toggleBtn;
        return null;
      },
      readMobileTimerboxCollapsed() {
        return true;
      },
      writeMobileTimerboxCollapsed: writeCollapsed,
      mobileTimerboxRuntime: runtime,
      getTimerboxToggleIconSvg() {
        return "<svg fallback />";
      }
    });

    expect(result).toEqual({
      isScope: true,
      hasTimerbox: true,
      hasToggle: true,
      didApply: true,
      didPersist: true,
      collapsible: true,
      timerModuleHidden: false
    });
    expect(runtime.resolveMobileTimerboxCollapsedValue).toHaveBeenCalledTimes(1);
    expect(runtime.resolveMobileTimerboxDisplayModel).toHaveBeenCalledTimes(1);
    expect(runtime.resolveMobileTimerboxAppliedModel).toHaveBeenCalledTimes(1);
    expect(toggleBtn.style.display).toBe("inline-flex");
    expect(toggles).toEqual([{ name: "is-mobile-expanded", force: true }]);
    expect(attrs["aria-expanded"]).toBe("true");
    expect(attrs["aria-label"]).toBe("收起计时器");
    expect(attrs["title"]).toBe("收起计时器");
    expect(toggleBtn.innerHTML).toBe("<svg expanded />");
    expect(writeCollapsed).toHaveBeenCalledWith(false);
  });

  it("resolves localStorage from context and delegates timerbox ui sync", () => {
    const attrs: Record<string, string> = {};
    const timerBox = {
      classList: {
        contains() {
          return false;
        },
        toggle() {}
      }
    };
    const toggleBtn = {
      style: { display: "" },
      setAttribute(name: string, value: string) {
        attrs[name] = value;
      },
      innerHTML: ""
    };
    const storageLike = { getItem: vi.fn(() => "0"), setItem: vi.fn() };
    const runtime = {
      resolveStoredMobileTimerboxCollapsed: vi.fn(() => false),
      persistMobileTimerboxCollapsed: vi.fn(() => true),
      getTimerboxToggleIconSvg: vi.fn(() => "<svg ctx />"),
      resolveMobileTimerboxCollapsedValue: vi.fn(() => false),
      resolveMobileTimerboxDisplayModel: vi.fn(() => ({
        toggleDisplay: "inline-flex",
        ariaExpanded: "true",
        label: "收起计时器",
        iconSvg: "<svg expanded />",
        expanded: true
      })),
      resolveMobileTimerboxAppliedModel: vi.fn((opts: any) => opts.displayModel)
    };

    const result = applyMobileTimerboxUiSyncFromContext({
      options: { persist: true },
      isTimerboxMobileScope() {
        return true;
      },
      isTimerboxCollapseViewport() {
        return true;
      },
      getElementById(id: string) {
        if (id === "timerbox") return timerBox;
        if (id === "timerbox-toggle-btn") return toggleBtn;
        return null;
      },
      storageRuntime: {
        resolveStorageByName(payload: { storageName?: string }) {
          return payload.storageName === "localStorage" ? storageLike : null;
        }
      },
      windowLike: { localStorage: storageLike },
      mobileTimerboxRuntime: runtime,
      storageKey: "ui_timerbox_collapsed_mobile_v1"
    });

    expect(result.didInvokeUiSync).toBe(true);
    expect(result.localStorageResolved).toBe(true);
    expect(result.syncResult.didApply).toBe(true);
    expect(runtime.resolveStoredMobileTimerboxCollapsed).toHaveBeenCalledWith({
      storageLike,
      storageKey: "ui_timerbox_collapsed_mobile_v1",
      defaultCollapsed: true
    });
    expect(runtime.persistMobileTimerboxCollapsed).toHaveBeenCalledWith({
      storageLike,
      storageKey: "ui_timerbox_collapsed_mobile_v1",
      collapsed: false
    });
    expect(attrs["aria-expanded"]).toBe("true");
  });
});
