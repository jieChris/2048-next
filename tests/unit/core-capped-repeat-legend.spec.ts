import { describe, expect, it, vi } from "vitest";

import {
  createCappedRepeatLegendRuntime,
  normalizeCappedRepeatLegendClasses,
  installCappedRepeatLegendRuntime,
  type CappedRepeatLegendRuntime
} from "../../src/core/capped-repeat-legend";

function createLegend() {
  return {
    className: "timertile",
    style: {
      color: "",
      fontSize: ""
    }
  };
}

describe("core capped repeat legend runtime", () => {
  it("normalizes repeat-row legend classes and styles for capped mode restores", () => {
    const firstLegend = createLegend();
    const secondLegend = createLegend();
    const rows = [
      { querySelector: vi.fn(() => firstLegend) },
      { querySelector: vi.fn(() => secondLegend) }
    ];
    const documentLike = {
      querySelectorAll: vi.fn(() => rows)
    };
    const cappedState = { mode: "capped" };
    const manager = {
      resolveProvidedCappedModeState: vi.fn(() => ({
        isCappedMode: true,
        cappedTargetValue: 65536
      })),
      getCappedTimerLegendClass: vi.fn(() => "timertile timer-legend-65536"),
      getCappedTimerLegendFontSize: vi.fn(() => "12px"),
      callWindowNamespaceMethod: vi.fn()
    };
    const operations = {
      resolveManagerDocumentLike: vi.fn(() => documentLike)
    };

    normalizeCappedRepeatLegendClasses(manager, cappedState, operations);

    expect(manager.resolveProvidedCappedModeState).toHaveBeenCalledWith(cappedState);
    expect(documentLike.querySelectorAll).toHaveBeenCalledWith("#timerbox [data-capped-repeat]");
    expect(manager.getCappedTimerLegendClass).toHaveBeenCalledWith(65536);
    expect(manager.getCappedTimerLegendFontSize).toHaveBeenCalledWith(65536);
    expect(rows[0].querySelector).toHaveBeenCalledWith(".timertile");
    expect(rows[1].querySelector).toHaveBeenCalledWith(".timertile");
    expect(firstLegend).toEqual({
      className: "timertile timer-legend-65536",
      style: {
        color: "#f9f6f2",
        fontSize: "12px"
      }
    });
    expect(secondLegend).toEqual(firstLegend);
    expect(manager.callWindowNamespaceMethod).toHaveBeenCalledWith(
      "ThemeManager",
      "syncTimerLegendStyles"
    );
  });

  it("falls back to capped timer font size when legend-specific sizing is unavailable", () => {
    const legend = createLegend();
    const documentLike = {
      querySelectorAll: vi.fn(() => [{ querySelector: vi.fn(() => legend) }])
    };
    const manager = {
      resolveProvidedCappedModeState: vi.fn(() => ({
        isCappedMode: true,
        cappedTargetValue: 32768
      })),
      getCappedTimerLegendClass: vi.fn(() => "timertile timer-legend-32768"),
      getCappedTimerFontSize: vi.fn(() => "13px"),
      callWindowNamespaceMethod: vi.fn()
    };

    normalizeCappedRepeatLegendClasses(manager, {}, { resolveManagerDocumentLike: () => documentLike });

    expect(manager.getCappedTimerFontSize).toHaveBeenCalledWith(32768);
    expect(legend.style.fontSize).toBe("13px");
  });

  it("does not query repeat rows or sync theme styles outside capped mode", () => {
    const documentLike = {
      querySelectorAll: vi.fn()
    };
    const manager = {
      resolveProvidedCappedModeState: vi.fn(() => ({
        isCappedMode: false,
        cappedTargetValue: 0
      })),
      getCappedTimerLegendClass: vi.fn(),
      callWindowNamespaceMethod: vi.fn()
    };

    normalizeCappedRepeatLegendClasses(manager, {}, { resolveManagerDocumentLike: () => documentLike });

    expect(documentLike.querySelectorAll).not.toHaveBeenCalled();
    expect(manager.getCappedTimerLegendClass).not.toHaveBeenCalled();
    expect(manager.callWindowNamespaceMethod).not.toHaveBeenCalled();
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createCappedRepeatLegendRuntime();
    expect(runtime.normalizeCappedRepeatLegendClasses).toBe(normalizeCappedRepeatLegendClasses);

    const windowLike: { CoreCappedRepeatLegendRuntime?: CappedRepeatLegendRuntime } = {};
    expect(installCappedRepeatLegendRuntime({ windowLike })).toBe(
      windowLike.CoreCappedRepeatLegendRuntime
    );
    expect(windowLike.CoreCappedRepeatLegendRuntime?.normalizeCappedRepeatLegendClasses).toBe(
      normalizeCappedRepeatLegendClasses
    );

    const existing = { normalizeCappedRepeatLegendClasses: vi.fn() };
    expect(
      installCappedRepeatLegendRuntime({
        windowLike: { CoreCappedRepeatLegendRuntime: existing }
      })
    ).toBe(existing);
  });
});
