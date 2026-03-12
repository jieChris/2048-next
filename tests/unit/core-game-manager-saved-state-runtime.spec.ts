import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it } from "vitest";

function createElement(options?: {
  display?: string;
  visibility?: string;
  pointerEvents?: string;
  attributes?: Record<string, string>;
  legend?: { text?: string; className?: string; fontSize?: string } | null;
}) {
  const attrs = new Map<string, string>(Object.entries(options?.attributes || {}));
  const legendOptions = options?.legend || null;
  const legend = legendOptions
    ? {
        textContent: legendOptions.text || "",
        className: legendOptions.className || "timertile",
        style: {
          fontSize: legendOptions.fontSize || ""
        }
      }
    : null;

  return {
    style: {
      display: options?.display || "",
      visibility: options?.visibility || "",
      pointerEvents: options?.pointerEvents || ""
    },
    textContent: "",
    getAttribute(name: string) {
      return attrs.has(name) ? String(attrs.get(name)) : null;
    },
    setAttribute(name: string, value: string) {
      attrs.set(String(name), String(value));
    },
    removeAttribute(name: string) {
      attrs.delete(String(name));
    },
    querySelector(selector: string) {
      if (selector === ".timertile") return legend;
      return null;
    }
  };
}

function loadSavedStateRuntime(slotIds: number[]) {
  const scriptPath = path.resolve(process.cwd(), "js/core_game_manager_saved_state_helpers_runtime.js");
  const script = readFileSync(scriptPath, "utf8");
  const context = {
    console,
    GameManager: {
      TIMER_SLOT_IDS: slotIds
    },
    isNonArrayObject(value: unknown) {
      return !!value && typeof value === "object" && !Array.isArray(value);
    },
    resolveManagerElementById(manager: Record<string, unknown>, id: string) {
      const elements = (manager.elements || {}) as Record<string, unknown>;
      return Object.prototype.hasOwnProperty.call(elements, id) ? elements[id] : null;
    },
    resolveManagerDocumentLike() {
      return null;
    }
  } as Record<string, unknown>;

  vm.runInNewContext(script, context);
  return context as {
    applySavedTimerFixedRowsState: (manager: Record<string, unknown>, saved: Record<string, unknown>, cappedState: Record<string, unknown>) => void;
    collectSavedTimerFixedRowsState: (manager: Record<string, unknown>) => Record<string, unknown>;
  };
}

describe("core game manager saved state runtime", () => {
  it("does not persist scroll-hidden fixed timer rows as business-hidden", () => {
    const runtime = loadSavedStateRuntime([32768, 65536]);
    const row32k = createElement({
      display: "",
      legend: { text: "32768", className: "timertile timer-legend-32768", fontSize: "13px" }
    });
    const row64k = createElement({
      display: "none",
      attributes: { "data-scroll-hidden": "1" },
      legend: { text: "65536", className: "timertile timer-legend-65536", fontSize: "12px" }
    });
    const manager = {
      getTimerRowEl(slotId: string) {
        return slotId === "32768" ? row32k : slotId === "65536" ? row64k : null;
      },
      elements: {
        timer32768: { textContent: "1:23.456" },
        timer65536: { textContent: "2:34.567" }
      }
    };

    const snapshot = runtime.collectSavedTimerFixedRowsState(manager);

    expect((snapshot["32768"] as Record<string, unknown>).display).toBe("");
    expect((snapshot["65536"] as Record<string, unknown>).display).toBe("");
    expect((snapshot["65536"] as Record<string, unknown>).timerText).toBe("2:34.567");
  });

  it("ignores legacy scroll-hidden display:none when restoring fixed timer rows", () => {
    const runtime = loadSavedStateRuntime([32768, 65536]);
    const row32k = createElement({
      display: "",
      legend: { text: "32768", className: "timertile timer-legend-32768", fontSize: "13px" }
    });
    const row64k = createElement({
      display: "none",
      attributes: { "data-scroll-hidden": "1" },
      legend: { text: "65536", className: "timertile timer-legend-65536", fontSize: "12px" }
    });
    const timer32k = { textContent: "" };
    const timer64k = { textContent: "" };
    const manager = {
      getTimerRowEl(slotId: string) {
        return slotId === "32768" ? row32k : slotId === "65536" ? row64k : null;
      },
      elements: {
        timer32768: timer32k,
        timer65536: timer64k
      },
      getCappedTimerLegendClass() {
        return "timertile";
      }
    };

    runtime.applySavedTimerFixedRowsState(
      manager,
      {
        timer_fixed_rows: {
          "32768": {
            display: "none",
            visibility: "",
            pointerEvents: "",
            repeat: "",
            timerText: "3:21.000",
            legendText: "32768",
            legendClass: "timertile timer-legend-32768",
            legendFontSize: "13px"
          },
          "65536": {
            display: "none",
            visibility: "",
            pointerEvents: "",
            repeat: "",
            timerText: "6:42.000",
            legendText: "65536",
            legendClass: "timertile timer-legend-65536",
            legendFontSize: "12px"
          }
        }
      },
      { isCappedMode: false }
    );

    expect(row32k.style.display).toBe("");
    expect(row64k.style.display).toBe("none");
    expect(timer32k.textContent).toBe("3:21.000");
    expect(timer64k.textContent).toBe("6:42.000");
  });

  it("preserves legitimate business-hidden fixed rows on restore", () => {
    const runtime = loadSavedStateRuntime([32768]);
    const row32k = createElement({
      display: "none",
      legend: { text: "32768", className: "timertile timer-legend-32768", fontSize: "13px" }
    });
    const timer32k = { textContent: "" };
    const manager = {
      getTimerRowEl() {
        return row32k;
      },
      elements: {
        timer32768: timer32k
      },
      getCappedTimerLegendClass() {
        return "timertile";
      }
    };

    runtime.applySavedTimerFixedRowsState(
      manager,
      {
        timer_fixed_rows: {
          "32768": {
            display: "none",
            visibility: "",
            pointerEvents: "",
            repeat: "",
            timerText: "",
            legendText: "32768",
            legendClass: "timertile timer-legend-32768",
            legendFontSize: "13px"
          }
        }
      },
      { isCappedMode: false }
    );

    expect(row32k.style.display).toBe("none");
  });
});
