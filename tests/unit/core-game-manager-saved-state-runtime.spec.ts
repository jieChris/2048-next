import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it, vi } from "vitest";

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

function loadSavedStateRuntime(slotIds: number[], extraContext?: Record<string, unknown>) {
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
    },
    ...(extraContext || {})
  } as Record<string, unknown>;

  vm.runInNewContext(script, context);
  return context as {
    applySavedTimerFixedRowsState: (manager: Record<string, unknown>, saved: Record<string, unknown>, cappedState: Record<string, unknown>) => void;
    applySavedTimerPostRestoreState: (manager: Record<string, unknown>, saved: Record<string, unknown>, cappedState: Record<string, unknown>) => void;
    collectSavedTimerFixedRowsState: (manager: Record<string, unknown>) => Record<string, unknown>;
    buildSavedGameStateDiagnosticsPayload: (manager: Record<string, unknown>) => Record<string, unknown>;
    buildSavedGameStateTimerCorePayload: (manager: Record<string, unknown>) => Record<string, unknown>;
    buildSavedGameStatePayload: (manager: Record<string, unknown>, now: number) => Record<string, unknown> | null;
    buildLiteSavedGameStatePayloadFallback: (
      manager: Record<string, unknown>,
      payload: Record<string, unknown>
    ) => Record<string, unknown> | null;
    resolveLatestSavedPayloadCandidate: (
      candidates: Array<Record<string, unknown> | null | undefined>
    ) => Record<string, unknown> | null;
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

  it("builds diagnostics index entries from manager helper with stable options", () => {
    const runtime = loadSavedStateRuntime([32768]);
    const optionSnapshots: Array<Record<string, unknown>> = [];
    const manager = {
      resolveSecondaryTimerPlacementDiagnosticsIndexEntry(options: Record<string, unknown>) {
        optionSnapshots.push({ ...options });
        return {
          key: "secondaryTimerPlacement",
          schemaVersion: 1,
          payload: { placed: 1 }
        };
      }
    };

    expect(runtime.buildSavedGameStateDiagnosticsPayload(manager)).toEqual({
      diagnostics_index_entries: [
        {
          key: "secondaryTimerPlacement",
          schemaVersion: 1,
          payload: { placed: 1 }
        }
      ]
    });
    expect(optionSnapshots).toEqual([
      {
        failureOnly: false,
        includeWhenNoActivity: false,
        maxDedupeKeys: 3
      }
    ]);
  });

  it("falls back to global diagnostics entry resolver when manager helper is unavailable", () => {
    const runtime = loadSavedStateRuntime([32768], {
      resolveSecondaryTimerPlacementDiagnosticsIndexEntry(manager: Record<string, unknown>, options: Record<string, unknown>) {
        return {
          key: "secondaryTimerPlacement",
          schemaVersion: 1,
          payload: {
            mode: manager.modeKey || "unknown",
            options
          }
        };
      }
    });
    const manager = {
      modeKey: "classic"
    };

    expect(runtime.buildSavedGameStateDiagnosticsPayload(manager)).toEqual({
      diagnostics_index_entries: [
        {
          key: "secondaryTimerPlacement",
          schemaVersion: 1,
          payload: {
            mode: "classic",
            options: {
              failureOnly: false,
              includeWhenNoActivity: false,
              maxDedupeKeys: 3
            }
          }
        }
      ]
    });
  });

  it("includes diagnostics index entries in full and lite saved payloads", () => {
    const runtime = loadSavedStateRuntime([32768]);
    const manager = {
      modeKey: "classic",
      mode: "classic",
      width: 4,
      height: 4,
      ruleset: "classic",
      score: 123,
      over: false,
      won: false,
      keepPlaying: false,
      initialSeed: 1,
      seed: 2,
      spawnValueCounts: { "2": 5, "4": 1 },
      reached32k: false,
      cappedMilestoneCount: 0,
      capped64Unlocked: null,
      moveHistory: [],
      ipsInputCount: 0,
      undoStack: [],
      redoStack: [],
      replayCompactLog: "",
      sessionReplayV3: null,
      comboStreak: 0,
      successfulMoveCount: 0,
      undoUsed: 0,
      challengeId: null,
      lockConsumedAtMoveCount: -1,
      lockedDirectionTurn: null,
      lockedDirection: null,
      hasGameStarted: true,
      getDurationMs() {
        return 4567;
      },
      getFinalBoardMatrix() {
        return [
          [2, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ];
      },
      safeClonePlain(value: unknown, fallback: unknown) {
        try {
          return JSON.parse(JSON.stringify(value));
        } catch {
          return fallback;
        }
      },
      clonePlain(value: unknown) {
        return JSON.parse(JSON.stringify(value));
      },
      resolveSecondaryTimerPlacementDiagnosticsIndexEntry() {
        return {
          key: "secondaryTimerPlacement",
          schemaVersion: 1,
          payload: { validPlacementDescriptors: 2 }
        };
      }
    };

    const fullPayload = runtime.buildSavedGameStatePayload(manager, 1000) as Record<string, unknown>;
    expect(fullPayload.diagnostics_index_entries).toEqual([
      {
        key: "secondaryTimerPlacement",
        schemaVersion: 1,
        payload: { validPlacementDescriptors: 2 }
      }
    ]);

    const litePayload = runtime.buildLiteSavedGameStatePayloadFallback(manager, fullPayload) as Record<string, unknown>;
    expect(litePayload.diagnostics_index_entries).toEqual([
      {
        key: "secondaryTimerPlacement",
        schemaVersion: 1,
        payload: { validPlacementDescriptors: 2 }
      }
    ]);
  });

  it("prefers richer saved payloads when timestamps are equal", () => {
    const runtime = loadSavedStateRuntime([32768]);
    const savedAt = 1700000000000;
    const litePayload = {
      saved_at: savedAt,
      mode_key: "practice",
      board: [[2, 0, 0, 0]],
      replay_compact_log: ""
    };
    const fullWindowPayload = {
      saved_at: savedAt,
      mode_key: "practice",
      board: [[2, 0, 0, 0]],
      replay_compact_log: "m1",
      timer_fixed_rows: {},
      timer_dynamic_rows_capped: [],
      timer_dynamic_rows_overflow: [],
      timer_secondary_rows: []
    };

    expect(
      runtime.resolveLatestSavedPayloadCandidate([null, litePayload, fullWindowPayload])
    ).toEqual(fullWindowPayload);
  });

  it("saves terminal timer state as frozen and non-resumable", () => {
    const runtime = loadSavedStateRuntime([32768]);
    const payload = runtime.buildSavedGameStateTimerCorePayload({
      timerStatus: 1,
      over: true,
      won: false,
      keepPlaying: false,
      hasGameStarted: true,
      getDurationMs() {
        return 1234;
      }
    });

    expect(payload).toEqual({
      timer_status: 0,
      duration_ms: 1234,
      has_game_started: true,
      timer_frozen: true
    });
  });

  it("does not auto-resume timer on restore when saved state is frozen", () => {
    const runtime = loadSavedStateRuntime([32768]);
    const startTimer = vi.fn();
    const manager = {
      accumulatedTime: 4321,
      over: false,
      won: false,
      timerStatus: 0,
      timerFrozen: false,
      timerModuleView: "timer",
      elements: {
        timer: {
          textContent: ""
        }
      },
      resolveProvidedCappedModeState() {
        return {
          isCappedMode: false,
          cappedTargetValue: null,
          isProgressiveCapped64Mode: false
        };
      },
      pretty(value: number) {
        return String(value);
      },
      callWindowMethod() {},
      startTimer
    };

    runtime.applySavedTimerPostRestoreState(
      manager,
      {
        timer_module_view: "timer",
        timer_status: 1,
        timer_frozen: true
      },
      { isCappedMode: false }
    );

    expect(manager.timerFrozen).toBe(true);
    expect(startTimer).not.toHaveBeenCalled();
    expect((manager.elements.timer as { textContent: string }).textContent).toBe("4321");
  });
});
