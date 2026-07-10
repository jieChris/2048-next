import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it, vi } from "vitest";

import { createCappedRepeatLegendRuntime } from "../../src/core/capped-repeat-legend";
import { createSavedManagerReplayStateRuntime } from "../../src/core/saved-manager-replay-state";
import { createSavedManagerTimerStateRuntime } from "../../src/core/saved-manager-timer-state";
import { createSavedPayloadRichnessRuntime } from "../../src/core/saved-payload-richness";

function createElement(options?: {
  display?: string;
  visibility?: string;
  pointerEvents?: string;
  attributes?: Record<string, string>;
  legend?: { text?: string; className?: string; color?: string; fontSize?: string } | null;
}) {
  const attrs = new Map<string, string>(Object.entries(options?.attributes || {}));
  const legendOptions = options?.legend || null;
  const legend = legendOptions
    ? {
        textContent: legendOptions.text || "",
        className: legendOptions.className || "timertile",
        style: {
          color: legendOptions.color || "",
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
  const clientRecordScriptPath = path.resolve(
    process.cwd(),
    "js/core_game_manager_client_record_id_runtime.js"
  );
  const scriptPath = path.resolve(process.cwd(), "js/core_game_manager_saved_state_helpers_runtime.js");
  const clientRecordScript = readFileSync(clientRecordScriptPath, "utf8");
  const script = readFileSync(scriptPath, "utf8");
    const context = {
      console,
      GameManager: {
      TIMER_SLOT_IDS: slotIds,
      SAVED_GAME_STATE_VERSION: 1,
      SAVED_GAME_STATE_KEY_PREFIX: "savedGameStateByMode:v1:",
      SAVED_GAME_STATE_LITE_KEY_PREFIX: "savedGameStateLiteByMode:v1:",
      SAVED_GAME_STATE_WINDOW_NAME_KEY: "__gm_saved_state_v1__"
    },
    isNonArrayObject(value: unknown) {
      return !!value && typeof value === "object" && !Array.isArray(value);
    },
    shouldRestoreSavedStateUndoHistory() {
      return true;
    },
    resolveManagerElementById(manager: Record<string, unknown>, id: string) {
      const elements = (manager.elements || {}) as Record<string, unknown>;
      return Object.prototype.hasOwnProperty.call(elements, id) ? elements[id] : null;
    },
    resolveManagerDocumentLike() {
      return null;
    },
    CoreCappedRepeatLegendRuntime: createCappedRepeatLegendRuntime(),
    CoreSavedManagerReplayStateRuntime: createSavedManagerReplayStateRuntime(),
    CoreSavedManagerTimerStateRuntime: createSavedManagerTimerStateRuntime(),
    CoreSavedPayloadRichnessRuntime: createSavedPayloadRichnessRuntime(),
    ...(extraContext || {})
  } as Record<string, unknown>;

  vm.runInNewContext(clientRecordScript, context);
  vm.runInNewContext(script, context);
  return context as {
    applySavedTimerFixedRowsState: (manager: Record<string, unknown>, saved: Record<string, unknown>, cappedState: Record<string, unknown>) => void;
    applySavedDynamicTimerRowsState: (manager: Record<string, unknown>, container: Record<string, unknown>, rowsState: unknown[], cappedState: Record<string, unknown>) => void;
    applySavedTimerPostRestoreState: (manager: Record<string, unknown>, saved: Record<string, unknown>, cappedState: Record<string, unknown>) => void;
    applySavedManagerReplayState: (manager: Record<string, unknown>, saved: Record<string, unknown>) => void;
    applySavedManagerProgressState: (manager: Record<string, unknown>, saved: Record<string, unknown>) => void;
    applySavedManagerBaseState: (manager: Record<string, unknown>, saved: Record<string, unknown>) => void;
    collectSavedTimerFixedRowsState: (manager: Record<string, unknown>) => Record<string, unknown>;
    buildSavedGameStateDiagnosticsPayload: (manager: Record<string, unknown>) => Record<string, unknown>;
    buildSavedGameStateTimerCorePayload: (manager: Record<string, unknown>) => Record<string, unknown>;
    applySavedManagerTimerState: (manager: Record<string, unknown>, saved: Record<string, unknown>) => void;
    normalizeCappedRepeatLegendClasses: (
      manager: Record<string, unknown>,
      cappedState: Record<string, unknown>
    ) => void;
    buildSavedGameStateProgressPayload: (manager: Record<string, unknown>) => Record<string, unknown>;
    buildSavedGameStateNoXSelectionPayload: (manager: Record<string, unknown>) => Record<string, unknown>;
    applySavedNoXSelectionState: (
      manager: Record<string, unknown>,
      saved: Record<string, unknown>
    ) => void;
    buildSavedGameStatePayload: (manager: Record<string, unknown>, now: number) => Record<string, unknown> | null;
    resolveReplayStringForSavedPayload: (
      manager: Record<string, unknown>,
      now: number,
      saveOptions?: Record<string, unknown>
    ) => string;
    collectSavedTimerSubState: (
      manager: Record<string, unknown>,
      documentLike: Record<string, unknown> | null
    ) => Record<string, unknown>;
    resolveLegacySecondaryTimerSubStateFromRows: (rows: unknown) => Record<string, unknown>;
    buildLiteSavedGameStatePayloadFallback: (
      manager: Record<string, unknown>,
      payload: Record<string, unknown>
    ) => Record<string, unknown> | null;
    buildLiteSavedGameStatePayload: (
      manager: Record<string, unknown>,
      payload: Record<string, unknown>
    ) => Record<string, unknown> | null;
    clearSavedGameState: (manager: Record<string, unknown>, modeKey?: string) => void;
    resolveSavedPayloadRichnessScore: (payload: unknown) => number;
    resolveSavedStateRestoreDecision: (
      manager: Record<string, unknown>,
      saved: Record<string, unknown>
    ) => { canRestore: boolean; shouldClearSavedState: boolean };
    resolveLatestSavedPayloadCandidate: (
      candidates: Array<Record<string, unknown> | null | undefined>
    ) => Record<string, unknown> | null;
    applySavedGameStatePersistTimestamps: (
      manager: Record<string, unknown>,
      persistPlan: Record<string, unknown>,
      persistResult: Record<string, unknown>,
      now: number
    ) => void;
    persistSavedPayloadWithLiteFallback: (
      manager: Record<string, unknown>,
      key: string,
      liteKey: string,
      fullPayload: Record<string, unknown> | null,
      litePayload: Record<string, unknown>
    ) => Record<string, unknown>;
  };
}

describe("core game manager saved state runtime", () => {
  it("delegates saved payload richness scoring to the TypeScript runtime", () => {
    const resolveSavedPayloadRichnessScore = vi.fn(() => 7);
    const runtime = loadSavedStateRuntime([32768], {
      CoreSavedPayloadRichnessRuntime: {
        resolveSavedPayloadRichnessScore
      }
    });
    const payload = {
      replay_string: "REPLAY_v1RPL_B64_saved"
    };

    expect(runtime.resolveSavedPayloadRichnessScore(payload)).toBe(7);
    expect(resolveSavedPayloadRichnessScore).toHaveBeenCalledWith(payload);
  });

  it("delegates latest saved payload candidate selection to the TypeScript runtime", () => {
    const resolveLatestSavedPayloadCandidate = vi.fn(() => ({ saved_at: 2 }));
    const runtime = loadSavedStateRuntime([32768], {
      CoreSavedPayloadCandidateRuntime: {
        resolveLatestSavedPayloadCandidate
      }
    });
    const candidates = [{ saved_at: 1 }, { saved_at: 2 }];

    expect(runtime.resolveLatestSavedPayloadCandidate(candidates)).toEqual({ saved_at: 2 });
    expect(resolveLatestSavedPayloadCandidate).toHaveBeenCalledWith(candidates);
  });

  it("delegates saved payload persist fallback sequencing to the TypeScript runtime", () => {
    const persistSavedPayloadWithLiteFallback = vi.fn(() => ({
      persisted: true,
      persistedFull: false
    }));
    const runtime = loadSavedStateRuntime([32768], {
      CoreSavedPayloadPersistFallbackRuntime: {
        persistSavedPayloadWithLiteFallback
      }
    });
    const manager = { modeKey: "practice" };
    const fullPayload = { saved_at: 1 };
    const litePayload = { saved_at: 1, lite: true };

    expect(
      runtime.persistSavedPayloadWithLiteFallback(
        manager,
        "full-key",
        "lite-key",
        fullPayload,
        litePayload
      )
    ).toEqual({ persisted: true, persistedFull: false });
    expect(persistSavedPayloadWithLiteFallback).toHaveBeenCalledWith(
      { manager, key: "full-key", liteKey: "lite-key", fullPayload, litePayload },
      expect.objectContaining({
        persistPayload: expect.any(Function),
        clearSavedState: expect.any(Function)
      })
    );
  });

  it("delegates saved payload replay string resolution to the TypeScript runtime", () => {
    const resolveReplayStringForSavedPayload = vi.fn(() => "REPLAY_v1RPL_B64_runtime");
    const serializeReplay = vi.fn(() => "REPLAY_v1RPL_B64_live");
    const runtime = loadSavedStateRuntime([32768], {
      CoreSavedPayloadReplayStringRuntime: {
        resolveReplayStringForSavedPayload
      },
      serializeReplay
    });
    const manager = {
      rescueReplayString: "REPLAY_v1RPL_B64_rescue"
    };
    const saveOptions = { force: true };

    expect(runtime.resolveReplayStringForSavedPayload(manager, 10_000, saveOptions)).toBe(
      "REPLAY_v1RPL_B64_runtime"
    );
    expect(resolveReplayStringForSavedPayload).toHaveBeenCalledWith(
      manager,
      10_000,
      saveOptions,
      expect.objectContaining({
        serializeReplay: expect.any(Function)
      })
    );
  });

  it("delegates saved manager base state restore to the TypeScript runtime", () => {
    const applySavedManagerBaseState = vi.fn();
    const runtime = loadSavedStateRuntime([32768], {
      CoreSavedManagerBaseStateRuntime: {
        applySavedManagerBaseState
      }
    });
    const manager = {
      setRuntimeScore: vi.fn(),
      clonePlain: vi.fn((value) => ({ cloned: value }))
    };
    const saved = {
      score: 128,
      client_record_id: "rec_saved"
    };

    runtime.applySavedManagerBaseState(manager, saved);

    expect(applySavedManagerBaseState).toHaveBeenCalledWith(
      manager,
      saved,
      expect.objectContaining({
        setRuntimeScore: expect.any(Function),
        clonePlain: expect.any(Function),
        assignClientRecordId: expect.any(Function)
      })
    );
  });

  it("delegates saved-state persist timestamp updates to the TypeScript runtime", () => {
    const applySavedStatePersistTimestamps = vi.fn();
    const runtime = loadSavedStateRuntime([32768], {
      CoreSavedStatePersistTimestampsRuntime: {
        applySavedStatePersistTimestamps
      }
    });
    const manager = {};
    const fullPayload = { saved_at: 123 };

    runtime.applySavedGameStatePersistTimestamps(
      manager,
      { fullPayload },
      { persistedFull: true },
      1234
    );

    expect(applySavedStatePersistTimestamps).toHaveBeenCalledWith(manager, {
      now: 1234,
      hasFullPayload: true,
      persistedFull: true
    });
  });

  it("delegates saved manager replay state restore to the TypeScript runtime", () => {
    const applySavedManagerReplayState = vi.fn();
    const runtime = loadSavedStateRuntime([32768], {
      CoreSavedManagerReplayStateRuntime: {
        applySavedManagerReplayState
      }
    });
    const manager = {
      moveHistory: [],
      setRuntimeUndoStack: vi.fn(),
      setRuntimeRedoStack: vi.fn()
    };
    const saved = {
      move_history: [0, 1],
      replay_compact_log: "compact"
    };

    runtime.applySavedManagerReplayState(manager, saved);

    expect(applySavedManagerReplayState).toHaveBeenCalledWith(
      manager,
      saved,
      expect.objectContaining({
        normalizeSavedReplayV1Session: expect.any(Function),
        shouldRestoreSavedStateUndoHistory: expect.any(Function)
      })
    );
  });

  it("delegates saved manager progress state restore to the TypeScript runtime", () => {
    const applySavedManagerProgressState = vi.fn();
    const runtime = loadSavedStateRuntime([32768], {
      CoreSavedManagerProgressStateRuntime: {
        applySavedManagerProgressState
      }
    });
    const manager = {
      moveHistory: [0, -1]
    };
    const saved = {
      successful_move_count: 0,
      undo_used: 0
    };

    runtime.applySavedManagerProgressState(manager, saved);

    expect(applySavedManagerProgressState).toHaveBeenCalledWith(manager, saved);
  });

  it("delegates saved manager timer state restore to the TypeScript runtime", () => {
    const applySavedManagerTimerState = vi.fn();
    const runtime = loadSavedStateRuntime([32768], {
      CoreSavedManagerTimerStateRuntime: {
        applySavedManagerTimerState
      }
    });
    const manager = {
      accumulatedTime: 0
      ,
      setRuntimeUndoStack: vi.fn(),
      setRuntimeRedoStack: vi.fn()
    };
    const saved = {
      duration_ms: 1234
    };

    runtime.applySavedManagerTimerState(manager, saved);

    expect(applySavedManagerTimerState).toHaveBeenCalledWith(manager, saved);
  });

  it("delegates capped repeat legend normalization to the TypeScript runtime", () => {
    const normalizeCappedRepeatLegendClasses = vi.fn();
    const documentLike = { id: "document-like" };
    const resolveManagerDocumentLike = vi.fn(() => documentLike);
    const runtime = loadSavedStateRuntime([32768], {
      CoreCappedRepeatLegendRuntime: {
        normalizeCappedRepeatLegendClasses
      },
      resolveManagerDocumentLike
    });
    const manager = { id: "manager" };
    const cappedState = { isCappedMode: true };

    runtime.normalizeCappedRepeatLegendClasses(manager, cappedState);

    expect(normalizeCappedRepeatLegendClasses).toHaveBeenCalledWith(
      manager,
      cappedState,
      expect.objectContaining({
        resolveManagerDocumentLike: expect.any(Function)
      })
    );
    const operations = normalizeCappedRepeatLegendClasses.mock.calls[0]?.[2] as {
      resolveManagerDocumentLike: (manager: Record<string, unknown>) => unknown;
    };
    expect(operations.resolveManagerDocumentLike(manager)).toBe(documentLike);
    expect(resolveManagerDocumentLike).toHaveBeenCalledWith(manager);
  });

  it("delegates legacy secondary timer sub-state derivation to the TypeScript runtime", () => {
    const resolved = {
      timer_sub_8192: "0:08.192",
      timer_sub_16384: "0:16.384",
      timer_sub_visible: true
    };
    const resolveLegacySecondaryTimerSubStateFromRows = vi.fn(() => resolved);
    const runtime = loadSavedStateRuntime([32768], {
      CoreSavedManagerTimerStateRuntime: {
        applySavedManagerTimerState: vi.fn(),
        resolveLegacySecondaryTimerSubStateFromRows
      }
    });
    const rows = [{ parent: 32768, child: 8192, time: "0:08.192", display: "block" }];

    expect(runtime.resolveLegacySecondaryTimerSubStateFromRows(rows)).toBe(resolved);
    expect(resolveLegacySecondaryTimerSubStateFromRows).toHaveBeenCalledWith(rows);
  });

  it("persists and restores selected NO X target without reopening selection", () => {
    const buildSavedGameStateNoXSelectionPayload = vi.fn(() => ({
      no_x_target: 256,
      no_x_selection_pending: false
    }));
    const applySavedNoXSelectionState = vi.fn();
    const runtime = loadSavedStateRuntime([], {
      CoreNoXSelectionRuntime: {
        buildSavedGameStateNoXSelectionPayload,
        applySavedNoXSelectionState
      }
    });
    const manager = {
      modeKey: "nox_4x4_pow2_no_undo",
      mode: "nox_4x4_pow2_no_undo",
      specialRules: { no_x_enabled: true, no_x_target: 256 },
      modeConfig: {
        key: "nox_4x4_pow2_no_undo",
        special_rules: { no_x_enabled: true, no_x_target: 256 }
      },
      noXSelectionPending: false
    };

    expect(runtime.buildSavedGameStateNoXSelectionPayload(manager)).toEqual({
      no_x_target: 256,
      no_x_selection_pending: false
    });
    const restoredManager = {
      modeKey: "nox_4x4_pow2_no_undo",
      mode: "nox_4x4_pow2_no_undo",
      specialRules: { no_x_enabled: true, no_x_target: 8192 },
      modeConfig: {
        key: "nox_4x4_pow2_no_undo",
        special_rules: { no_x_enabled: true, no_x_target: 8192 }
      },
      noXSelectionPending: true
    };
    const saved = {
      no_x_target: 256,
      no_x_selection_pending: false
    };

    runtime.applySavedNoXSelectionState(restoredManager, saved);

    expect(buildSavedGameStateNoXSelectionPayload).toHaveBeenCalledWith(manager);
    expect(applySavedNoXSelectionState).toHaveBeenCalledWith(restoredManager, saved);
  });

  it("delegates saved timer sub-state composition to the TypeScript runtime", () => {
    const secondaryRows = [{ parent: 32768, child: 8192, time: "0:08.192" }];
    const expandedParents = [32768];
    const resolved = {
      timer_secondary_rows: secondaryRows,
      timer_secondary_expanded_parents: expandedParents,
      timer_sub_8192: "0:08.192",
      timer_sub_16384: "",
      timer_sub_visible: false
    };
    const buildSavedTimerSubState = vi.fn(() => resolved);
    const runtime = loadSavedStateRuntime([32768], {
      CoreSavedManagerTimerStateRuntime: {
        applySavedManagerTimerState: vi.fn(),
        buildSavedTimerSubState
      },
      collectSecondaryTimerRowsState: vi.fn(() => secondaryRows),
      collectSecondaryTimerExpandedParents: vi.fn(() => expandedParents)
    });
    const manager = { id: "manager" };

    expect(runtime.collectSavedTimerSubState(manager, {})).toBe(resolved);
    expect(buildSavedTimerSubState).toHaveBeenCalledWith({ secondaryRows, expandedParents });
  });

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

  it("uses client fixed timer legend font size when saved size is empty", () => {
    const runtime = loadSavedStateRuntime([4096, 32768]);
    const row4096 = createElement({
      legend: { text: "4096", className: "timertile timer-legend-4096", fontSize: "14px" }
    });
    const row32768 = createElement({
      legend: { text: "32768", className: "timertile timer-legend-32768", fontSize: "13px" }
    });
    const manager = {
      getTimerRowEl(slotId: string) {
        return slotId === "4096" ? row4096 : slotId === "32768" ? row32768 : null;
      },
      elements: {
        timer4096: { textContent: "" },
        timer32768: { textContent: "" }
      },
      getCappedTimerLegendClass() {
        return "timertile";
      }
    };

    runtime.applySavedTimerFixedRowsState(
      manager,
      {
        timer_fixed_rows: {
          "4096": {
            timerText: "15:51.578",
            legendText: "4096",
            legendClass: "timertile timer-legend-4096",
            legendFontSize: ""
          },
          "32768": {
            timerText: "1:39:11.334",
            legendText: "32768",
            legendClass: "timertile timer-legend-32768",
            legendFontSize: ""
          }
        }
      },
      { isCappedMode: false }
    );

    expect(row4096.querySelector(".timertile")?.style.fontSize).toBe("14px");
    expect(row32768.querySelector(".timertile")?.style.fontSize).toBe("11px");
  });

  it("self-heals empty restored fixed timer legend font size for five digit labels", () => {
    const runtime = loadSavedStateRuntime([32768, 65536]);
    const row32768 = createElement({
      legend: { text: "32768", className: "timertile timer-legend-32768", fontSize: "" }
    });
    const row65536 = createElement({
      legend: { text: "65536", className: "timertile timer-legend-65536", fontSize: "" }
    });
    const manager = {
      getTimerRowEl(slotId: string) {
        if (slotId === "32768") return row32768;
        if (slotId === "65536") return row65536;
        return null;
      },
      elements: {
        timer32768: { textContent: "" },
        timer65536: { textContent: "" }
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
            timerText: "1:39:11.334",
            legendText: "32768",
            legendClass: "timertile timer-legend-32768",
            legendFontSize: ""
          },
          "65536": {
            timerText: "2:00:00.000",
            legendText: "65536",
            legendClass: "timertile timer-legend-65536",
            legendFontSize: ""
          }
        }
      },
      { isCappedMode: false }
    );

    expect(row32768.querySelector(".timertile")?.style.fontSize).toBe("11px");
    expect(row65536.querySelector(".timertile")?.style.fontSize).toBe("11px");
  });

  it("self-heals legacy oversized restored fixed timer legend font size for five digit labels", () => {
    const runtime = loadSavedStateRuntime([16384, 32768]);
    const row16384 = createElement({
      legend: { text: "16384", className: "timertile timer-legend-16384", fontSize: "" }
    });
    const row32768 = createElement({
      legend: { text: "32768", className: "timertile timer-legend-32768", fontSize: "" }
    });
    const manager = {
      getTimerRowEl(slotId: string) {
        if (slotId === "16384") return row16384;
        if (slotId === "32768") return row32768;
        return null;
      },
      elements: {
        timer16384: { textContent: "" },
        timer32768: { textContent: "" }
      },
      getCappedTimerLegendClass() {
        return "timertile";
      }
    };

    runtime.applySavedTimerFixedRowsState(
      manager,
      {
        timer_fixed_rows: {
          "16384": {
            timerText: "48:00.000",
            legendText: "16384",
            legendClass: "timertile timer-legend-16384",
            legendFontSize: "13px"
          },
          "32768": {
            timerText: "1:39:11.334",
            legendText: "32768",
            legendClass: "timertile timer-legend-32768",
            legendFontSize: "12px"
          }
        }
      },
      { isCappedMode: false }
    );

    expect(row16384.querySelector(".timertile")?.style.fontSize).toBe("11px");
    expect(row32768.querySelector(".timertile")?.style.fontSize).toBe("11px");
  });

  it("ignores restored fixed timer row presentation styles and uses client rendering rules", () => {
    const runtime = loadSavedStateRuntime([1024, 2048, 4096, 8192, 16384, 32768]);
    const rows: Record<string, ReturnType<typeof createElement>> = {};
    const timers: Record<string, { textContent: string }> = {};
    for (const slotId of ["1024", "2048", "4096", "8192", "16384", "32768"]) {
      rows[slotId] = createElement({
        display: "",
        visibility: "",
        pointerEvents: "",
        legend: { text: slotId, className: `timertile timer-legend-${slotId}`, fontSize: "" }
      });
      timers[`timer${slotId}`] = { textContent: "" };
    }
    const manager = {
      getTimerRowEl(slotId: string) {
        return rows[slotId] || null;
      },
      elements: timers,
      getCappedTimerLegendClass() {
        return "timertile timer-legend-32768";
      }
    };

    runtime.applySavedTimerFixedRowsState(
      manager,
      {
        timer_fixed_rows: {
          "1024": { display: "none", visibility: "hidden", pointerEvents: "none", timerText: "1.000", legendText: "1024", legendClass: "timertile timer-legend-bad", legendFontSize: "40px" },
          "2048": { display: "none", visibility: "hidden", pointerEvents: "none", timerText: "2.000", legendText: "2048", legendClass: "timertile timer-legend-bad", legendFontSize: "40px" },
          "4096": { display: "none", visibility: "hidden", pointerEvents: "none", timerText: "3.000", legendText: "4096", legendClass: "timertile timer-legend-bad", legendFontSize: "40px" },
          "8192": { display: "none", visibility: "hidden", pointerEvents: "none", timerText: "4.000", legendText: "8192", legendClass: "timertile timer-legend-bad", legendFontSize: "40px" },
          "16384": { display: "none", visibility: "hidden", pointerEvents: "none", timerText: "5.000", legendText: "16384", legendClass: "timertile timer-legend-bad", legendFontSize: "40px" },
          "32768": { display: "none", visibility: "hidden", pointerEvents: "none", timerText: "6.000", legendText: "32768", legendClass: "timertile timer-legend-bad", legendFontSize: "40px" }
        }
      },
      { isCappedMode: false }
    );

    for (const slotId of ["1024", "2048", "4096", "8192"]) {
      expect(rows[slotId].style.display).toBe("");
      expect(rows[slotId].style.visibility).toBe("");
      expect(rows[slotId].style.pointerEvents).toBe("");
      expect(rows[slotId].querySelector(".timertile")?.className).toBe(`timertile timer-legend-${slotId}`);
      expect(rows[slotId].querySelector(".timertile")?.style.fontSize).toBe("14px");
    }
    for (const slotId of ["16384", "32768"]) {
      expect(rows[slotId].style.display).toBe("");
      expect(rows[slotId].style.visibility).toBe("");
      expect(rows[slotId].style.pointerEvents).toBe("");
      expect(rows[slotId].querySelector(".timertile")?.className).toBe(`timertile timer-legend-${slotId}`);
      expect(rows[slotId].querySelector(".timertile")?.style.fontSize).toBe("11px");
    }
    expect(timers.timer32768.textContent).toBe("6.000");
  });

  it("uses the legend font-size API for left timer labels without touching right timer values", () => {
    const runtime = loadSavedStateRuntime([32768]);
    const row32768 = createElement({
      legend: { text: "32768", className: "timertile timer-legend-32768", fontSize: "" }
    });
    const timer32768 = {
      textContent: "",
      style: { fontSize: "19px" }
    };
    const manager = {
      getTimerRowEl(slotId: string) {
        return slotId === "32768" ? row32768 : null;
      },
      elements: {
        timer32768
      },
      getCappedTimerLegendClass() {
        return "timertile timer-legend-32768";
      },
      getCappedTimerLegendFontSize() {
        return "11px";
      },
      getCappedTimerFontSize() {
        throw new Error("right timer font-size API must not be used for legend labels");
      }
    };

    runtime.applySavedTimerFixedRowsState(
      manager,
      {
        timer_fixed_rows: {
          "32768": {
            repeat: "2",
            timerText: "6.000",
            legendText: "32768"
          }
        }
      },
      { isCappedMode: true, cappedTargetValue: 32768 }
    );

    expect(row32768.querySelector(".timertile")?.className).toBe("timertile timer-legend-32768");
    expect(row32768.querySelector(".timertile")?.style.fontSize).toBe("11px");
    expect(timer32768.textContent).toBe("6.000");
    expect(timer32768.style.fontSize).toBe("19px");
  });

  it("ignores restored dynamic timer row presentation styles and uses client rendering rules", () => {
    type FakeElement = {
      children: FakeElement[];
      className: string;
      textContent: string;
      style: { cssText: string; color: string; fontSize: string };
      attributes: Map<string, string>;
      appendChild(child: FakeElement): void;
      setAttribute(name: string, value: string): void;
      getAttribute(name: string): string | null;
    };
    function createFakeElement(): FakeElement {
      const style = { color: "", fontSize: "" } as { cssText: string; color: string; fontSize: string };
      Object.defineProperty(style, "cssText", {
        get() {
          return `color: ${style.color}; font-size: ${style.fontSize};`;
        },
        set(value: string) {
          const colorMatch = String(value).match(/color:\s*([^;]+)/);
          const fontMatch = String(value).match(/font-size:\s*([^;]+)/);
          if (colorMatch) style.color = colorMatch[1].trim();
          if (fontMatch) style.fontSize = fontMatch[1].trim();
        }
      });
      return {
        children: [],
        className: "",
        textContent: "",
        style,
        attributes: new Map<string, string>(),
        appendChild(child: FakeElement) {
          this.children.push(child);
        },
        setAttribute(name: string, value: string) {
          this.attributes.set(name, value);
        },
        getAttribute(name: string) {
          return this.attributes.get(name) || null;
        }
      };
    }
    const runtime = loadSavedStateRuntime(
      [32768],
      {
        resolveManagerDocumentLike() {
          return { createElement: createFakeElement };
        }
      }
    );
    const container = createFakeElement();
    const manager = {
      resolveProvidedCappedModeState() {
        return { isCappedMode: false, cappedTargetValue: 32768 };
      },
      getCappedTimerLegendClass(value: number) {
        return `timertile timer-legend-${value}`;
      },
      getCappedTimerLegendFontSize() {
        return "11px";
      },
      getCappedTimerFontSize() {
        throw new Error("right timer font-size API must not be used for dynamic legend labels");
      }
    };

    runtime.applySavedDynamicTimerRowsState(
      manager,
      container,
      [
        {
          repeat: "",
          label: "32768",
          labelClass: "timertile timer-legend-bad",
          labelFontSize: "40px",
          time: "1:39:11.334"
        }
      ],
      { isCappedMode: false, cappedTargetValue: 32768 }
    );

    const row = container.children[0];
    const legend = row.children[0];
    const timer = row.children[1];
    expect(legend.className).toBe("timertile timer-legend-32768");
    expect(legend.style.fontSize).toBe("11px");
    expect(timer.style.fontSize).toBe("");
    expect(timer.textContent).toBe("1:39:11.334");
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

  it("persists session replay v1 in full and lite saved payloads", () => {
    const runtime = loadSavedStateRuntime([32768]);
    const sessionReplayV1 = {
      v: 1,
      mode_key: "classic_4x4_pow2_undo",
      ruleset: "pow2",
      board_width: 4,
      board_height: 4,
      start_unix_ms: 100,
      challenge_id: null,
      seed: 7,
      init_tiles: [
        { cellIndex: 0, valueBit: 0 },
        { cellIndex: 5, valueBit: 1 }
      ],
      records: [
        { kind: "move", dir: 1, spawnIndex: 2, spawnValueBit: 0, deltaMs: 50 }
      ],
      last_event_at_ms: 150,
      supported: true
    };
    const manager = {
      modeKey: "classic_4x4_pow2_undo",
      mode: "classic_4x4_pow2_undo",
      width: 4,
      height: 4,
      ruleset: "pow2",
      score: 32,
      over: false,
      won: false,
      keepPlaying: false,
      initialSeed: 7,
      seed: 9,
      spawnValueCounts: { "2": 3, "4": 1 },
      reached32k: false,
      cappedMilestoneCount: 0,
      capped64Unlocked: null,
      moveHistory: [0, 1],
      ipsInputCount: 2,
      undoStack: [],
      redoStack: [],
      replayCompactLog: "ab",
      sessionReplayV1,
      sessionReplayV3: null,
      comboStreak: 0,
      successfulMoveCount: 2,
      undoUsed: 0,
      challengeId: null,
      lockConsumedAtMoveCount: -1,
      lockedDirectionTurn: null,
      lockedDirection: null,
      hasGameStarted: true,
      getDurationMs() {
        return 500;
      },
      getFinalBoardMatrix() {
        return [
          [2, 0, 0, 0],
          [0, 4, 0, 0],
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
      setRuntimeUndoStack: vi.fn(),
      setRuntimeRedoStack: vi.fn()
    };

    const fullPayload = runtime.buildSavedGameStatePayload(manager, 1000) as Record<string, unknown>;
    expect(fullPayload.session_replay_v1).toEqual(sessionReplayV1);
    expect(fullPayload.session_replay_v1).not.toBe(sessionReplayV1);

    const litePayload = runtime.buildLiteSavedGameStatePayloadFallback(manager, fullPayload) as Record<string, unknown>;
    expect(litePayload.session_replay_v1).toEqual(sessionReplayV1);
    expect(litePayload.session_replay_v1).not.toBe(sessionReplayV1);
  });

  it("delegates lite saved payload construction to the core storage runtime with manager context", () => {
    const buildLiteSavedGameStatePayload = vi.fn(() => ({
      v: 1,
      board: [[2]],
      session_replay_v1: null
    }));
    const runtime = loadSavedStateRuntime([32768], {
      callCoreStorageRuntime(
        _manager: Record<string, unknown>,
        method: string,
        payload: Record<string, unknown>
      ) {
        if (method === "buildLiteSavedGameStatePayload") {
          return buildLiteSavedGameStatePayload(payload);
        }
        return undefined;
      }
    });
    const manager = {
      modeKey: "standard_4x4_pow2_no_undo",
      width: 4,
      height: 4,
      ruleset: "pow2",
      score: 128,
      initialSeed: 11,
      seed: 22,
      getDurationMs: () => 3000,
      getFinalBoardMatrix: () => [[2, 0, 0, 0]],
      clonePlain: (value: unknown) => JSON.parse(JSON.stringify(value)),
      safeClonePlain: (value: unknown, fallback: unknown) => {
        try {
          return JSON.parse(JSON.stringify(value));
        } catch {
          return fallback;
        }
      },
      resolveNormalizedCoreValueOrFallback(value: unknown) {
        return value;
      },
      isNonArrayObject(value: unknown) {
        return !!value && typeof value === "object" && !Array.isArray(value);
      }
    };
    const sourcePayload = {
      saved_at: 1,
      board: [[4]],
      session_replay_v1: {
        board_width: 4,
        board_height: 4,
        init_tiles: [],
        records: []
      }
    };

    runtime.buildLiteSavedGameStatePayload(manager, sourcePayload);

    expect(buildLiteSavedGameStatePayload).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: sourcePayload,
        savedStateVersion: 1,
        modeKey: "standard_4x4_pow2_no_undo",
        width: 4,
        height: 4,
        ruleset: "pow2",
        score: 128,
        initialSeed: 11,
        seed: 22,
        durationMs: 3000,
        finalBoardMatrix: [[2, 0, 0, 0]]
      })
    );
  });

  it("uses rescue replay string when live replay serialization is unavailable during save", () => {
    const runtime = loadSavedStateRuntime([32768]);
    const manager = {
      modeKey: "standard_4x4_pow2_no_undo",
      mode: "standard_4x4_pow2_no_undo",
      width: 4,
      height: 4,
      ruleset: "pow2",
      score: 1024,
      over: false,
      won: false,
      keepPlaying: false,
      initialSeed: 1,
      seed: 2,
      spawnValueCounts: {},
      moveHistory: [],
      undoStack: [],
      redoStack: [],
      replayCompactLog: "",
      sessionReplayV1: null,
      sessionReplayV3: null,
      rescueReplayString: "REPLAY_v1RPL_B64_rescue_saved",
      hasGameStarted: true,
      getDurationMs() {
        return 1234;
      },
      getFinalBoardMatrix() {
        return [
          [2, 0, 0, 0],
          [0, 4, 0, 0],
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
      }
    };

    const fullPayload = runtime.buildSavedGameStatePayload(manager, 1000, { force: true }) as Record<string, unknown>;

    expect(fullPayload.replay_string).toBe("REPLAY_v1RPL_B64_rescue_saved");
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

  it("keeps richer rescue saved payloads ahead of newer lite snapshots", () => {
    const runtime = loadSavedStateRuntime([32768]);
    const fullRescuePayload = {
      saved_at: 1700000000000,
      mode_key: "standard_4x4_pow2_no_undo",
      board: [
        [16, 64, 128, 32768],
        [8, 2, 2, 0],
        [4, 0, 0, 0],
        [0, 2, 0, 0]
      ],
      move_history: [0, 1, 2],
      replay_string: "REPLAY_v1RPL_B64_rescue",
      timer_fixed_rows: {
        "32768": { timerText: "1:23.456", legendText: "32768" }
      },
      timer_secondary_rows: [
        { parent: 32768, child: 8192, time: "1:20.000" }
      ]
    };
    const newerLitePayload = {
      saved_at: 1700000001000,
      mode_key: "standard_4x4_pow2_no_undo",
      board: [
        [16, 64, 128, 32768],
        [8, 2, 2, 0],
        [4, 0, 0, 0],
        [0, 2, 0, 0]
      ],
      move_history: [],
      replay_string: "",
      timer_fixed_rows: undefined,
      timer_secondary_rows: undefined
    };

    expect(
      runtime.resolveLatestSavedPayloadCandidate([fullRescuePayload, newerLitePayload])
    ).toEqual(fullRescuePayload);
  });

  it("accepts newer lite snapshots after the saved board position changes", () => {
    const runtime = loadSavedStateRuntime([32768]);
    const fullRescuePayload = {
      saved_at: 1700000000000,
      mode_key: "standard_4x4_pow2_no_undo",
      score: 65536,
      board: [
        [16, 64, 128, 32768],
        [8, 2, 2, 0],
        [4, 0, 0, 0],
        [0, 2, 0, 0]
      ],
      move_history: [0, 1, 2],
      replay_string: "REPLAY_v1RPL_B64_rescue",
      timer_fixed_rows: {
        "32768": { timerText: "1:23.456", legendText: "32768" }
      },
      timer_secondary_rows: [
        { parent: 32768, child: 8192, time: "1:20.000" }
      ]
    };
    const newerLitePayload = {
      saved_at: 1700000001000,
      mode_key: "standard_4x4_pow2_no_undo",
      score: 65540,
      board: [
        [16, 64, 128, 32768],
        [8, 4, 0, 0],
        [4, 0, 0, 0],
        [0, 2, 0, 2]
      ],
      move_history: [],
      replay_string: "",
      timer_fixed_rows: undefined,
      timer_secondary_rows: undefined
    };

    expect(
      runtime.resolveLatestSavedPayloadCandidate([fullRescuePayload, newerLitePayload])
    ).toEqual(newerLitePayload);
  });

  it("resets saved-state throttles when clearing a restarted game", () => {
    const runtime = loadSavedStateRuntime([32768], {
      callCoreStorageRuntime() {
        return undefined;
      },
      resolveSavedGameStateStorageKey(
        manager: Record<string, unknown>,
        keyPrefix: string,
        modeKey?: string
      ) {
        return keyPrefix + String(modeKey || manager.modeKey || manager.mode || "");
      },
      getSavedGameStateStorages(manager: Record<string, unknown>) {
        const windowLike =
          typeof manager.getWindowLike === "function"
            ? (manager.getWindowLike as () => Record<string, unknown>)()
            : null;
        return windowLike && windowLike.localStorage ? [windowLike.localStorage] : [];
      },
      resolveSavedStatePathname(windowLike: Record<string, unknown> | null) {
        const locationLike = windowLike?.location as Record<string, unknown> | undefined;
        return typeof locationLike?.pathname === "string" ? locationLike.pathname : "";
      },
      writeWindowNameSavedPayload() {
        return true;
      }
    });
    const removedKeys: string[] = [];
    const manager = {
      modeKey: "classic_4x4_pow2_undo",
      mode: "classic_4x4_pow2_undo",
      replayMode: false,
      lastSavedGameStateAt: 1000,
      lastSavedGameStateFullAt: 1000,
      lastSavedGameStateFullAttemptAt: 1000,
      lastSavedStateSyncPublishedAt: 1000,
      lastReplayStringSavedAt: 1000,
      getWindowLike() {
        return {
          name: "",
          location: { pathname: "/undo_2048.html" },
          localStorage: {
            removeItem(key: string) {
              removedKeys.push(key);
            }
          }
        };
      },
      resolveCoreBooleanCallOrFallback(value: unknown, fallback: () => boolean) {
        return typeof value === "boolean" ? value : fallback();
      },
      createCoreModeContextPayload(payload: Record<string, unknown>) {
        return payload;
      },
      resolveNormalizedCoreValueOrFallbackAllowNull(
        value: unknown,
        _normalizer: (payload: unknown) => unknown,
        fallback: () => unknown
      ) {
        return typeof value === "undefined" ? fallback() : value;
      },
      resolveNormalizedCoreValueOrFallback(
        value: unknown,
        _normalizer: (payload: unknown) => unknown,
        fallback: () => unknown
      ) {
        return typeof value === "undefined" ? fallback() : value;
      },
      isNonArrayObject(value: unknown) {
        return !!value && typeof value === "object" && !Array.isArray(value);
      }
    } as Record<string, unknown>;

    runtime.clearSavedGameState(manager, "classic_4x4_pow2_undo");

    expect(manager.lastSavedGameStateAt).toBe(0);
    expect(manager.lastSavedGameStateFullAt).toBe(0);
    expect(manager.lastSavedGameStateFullAttemptAt).toBe(0);
    expect(manager.lastSavedStateSyncPublishedAt).toBe(0);
    expect(manager.lastReplayStringSavedAt).toBe(0);
    expect(removedKeys).toEqual([
      "savedGameStateByMode:v1:classic_4x4_pow2_undo",
      "savedGameStateLiteByMode:v1:classic_4x4_pow2_undo"
    ]);
  });

  it("persists ranked session identity in saved progress payloads", () => {
    const runtime = loadSavedStateRuntime([32768]);
    const payload = runtime.buildSavedGameStateProgressPayload({
      comboStreak: 1,
      successfulMoveCount: 2,
      undoUsed: 0,
      challengeId: "ranked-active",
      rankedSessionToken: "ranked-token",
      lockConsumedAtMoveCount: -1,
      lockedDirectionTurn: null,
      lockedDirection: null
    });

    expect(payload.challenge_id).toBe("ranked-active");
    expect(payload.ranked_session_token).toBe("ranked-token");
  });

  it("allows ranked saved-state restore when active session identity matches", () => {
    const runtime = loadSavedStateRuntime([32768]);
    const modeKey = "standard_4x4_pow2_no_undo";
    const saved = {
      v: 1,
      mode_key: modeKey,
      board_width: 4,
      board_height: 4,
      ruleset: "pow2",
      board: [
        [2, 0, 0, 0],
        [0, 4, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],
      over: false,
      won: false,
      keep_playing: false,
      initial_seed: 101,
      challenge_id: "ranked-active",
      ranked_session_token: "ranked-token"
    };
    const manager = {
      modeKey,
      mode: modeKey,
      rankPolicy: "ranked",
      modeConfig: { rank_policy: "ranked" },
      width: 4,
      height: 4,
      ruleset: "pow2",
      initialSeed: 101,
      challengeId: "ranked-active",
      rankedSessionToken: "ranked-token"
    };

    expect(runtime.resolveSavedStateRestoreDecision(manager, saved)).toEqual({
      canRestore: true,
      shouldClearSavedState: true
    });
  });

  it("clears ranked saved-state restore when restart advanced to a new session", () => {
    const runtime = loadSavedStateRuntime([32768]);
    const modeKey = "standard_4x4_pow2_no_undo";
    const saved = {
      v: 1,
      mode_key: modeKey,
      board_width: 4,
      board_height: 4,
      ruleset: "pow2",
      board: [
        [2, 0, 0, 0],
        [0, 4, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],
      over: false,
      won: false,
      keep_playing: false,
      initial_seed: 101,
      challenge_id: "old-ranked",
      ranked_session_token: "old-token"
    };
    const manager = {
      modeKey,
      mode: modeKey,
      rankPolicy: "ranked",
      modeConfig: { rank_policy: "ranked" },
      width: 4,
      height: 4,
      ruleset: "pow2",
      initialSeed: 202,
      challengeId: "new-ranked",
      rankedSessionToken: "new-token"
    };

    expect(runtime.resolveSavedStateRestoreDecision(manager, saved)).toEqual({
      canRestore: false,
      shouldClearSavedState: true
    });
  });

  it("restores ranked saved-state from its saved identity when the current session context is missing or expired", () => {
    const runtime = loadSavedStateRuntime([32768]);
    const modeKey = "standard_4x4_pow2_no_undo";
    const saved = {
      v: 1,
      mode_key: modeKey,
      board_width: 4,
      board_height: 4,
      ruleset: "pow2",
      board: [
        [2, 0, 0, 0],
        [0, 4, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],
      over: false,
      won: false,
      keep_playing: false,
      initial_seed: 101,
      challenge_id: "ranked-active",
      ranked_session_token: "ranked-token"
    };
    const manager = {
      modeKey,
      mode: modeKey,
      rankPolicy: "ranked",
      modeConfig: { rank_policy: "ranked" },
      width: 4,
      height: 4,
      ruleset: "pow2",
      initialSeed: undefined,
      challengeId: null,
      rankedSessionToken: "",
      getWindowLike() {
        return {
          RankedSessionRuntime: {
            getCurrentContext() {
              return null;
            }
          },
          GAME_CHALLENGE_CONTEXT: null
        };
      }
    };

    expect(runtime.resolveSavedStateRestoreDecision(manager, saved)).toEqual({
      canRestore: true,
      shouldClearSavedState: true
    });
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
      timer_started_at_ms: null,
      timer_elapsed_offset_ms: null,
      timer_anchor_local_ms: null,
      timer_anchor_server_ms: null,
      has_game_started: true,
      timer_frozen: true
    });
  });

  it("saves active timer anchors for resumable ranked games", () => {
    const runtime = loadSavedStateRuntime([32768]);
    const payload = runtime.buildSavedGameStateTimerCorePayload({
      timerStatus: 1,
      over: false,
      won: false,
      keepPlaying: false,
      hasGameStarted: true,
      startTime: new Date(1_000),
      timerElapsedOffsetMs: 2_500,
      timerAnchorLocalMs: 10_000,
      timerAnchorServerMs: 20_000,
      getDurationMs() {
        return 7_500;
      }
    });

    expect(payload).toEqual({
      timer_status: 1,
      duration_ms: 7_500,
      timer_started_at_ms: 1_000,
      timer_elapsed_offset_ms: 2_500,
      timer_anchor_local_ms: 10_000,
      timer_anchor_server_ms: 20_000,
      has_game_started: true,
      timer_frozen: false
    });
  });

  it("restores active timer duration from saved anchors across closed-page time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(20_000);
    const runtime = loadSavedStateRuntime([32768], { Date });
    const manager = {
      accumulatedTime: 0,
      time: 0,
      startTime: new Date(1),
      timerStatus: 1,
      timerFrozen: false
    };

    runtime.applySavedManagerTimerState(manager, {
      duration_ms: 3_000,
      timer_status: 1,
      timer_elapsed_offset_ms: 1_000,
      timer_anchor_local_ms: 5_000,
      timer_anchor_server_ms: 15_000,
      over: false,
      won: false,
      keep_playing: false,
      timer_frozen: false
    });

    expect(manager.accumulatedTime).toBe(16_000);
    expect(manager.time).toBe(16_000);
    expect(manager.timerElapsedOffsetMs).toBe(1_000);
    expect(manager.timerAnchorLocalMs).toBe(5_000);
    expect(manager.timerAnchorServerMs).toBe(15_000);
    expect(manager.startTime).toBeNull();
    expect(manager.timerStatus).toBe(0);
    vi.useRealTimers();
  });

  it("preserves replay v1 last event time so closed-page time remains in the next move delta", () => {
    vi.useFakeTimers();
    vi.setSystemTime(20_000);
    const runtime = loadSavedStateRuntime([32768], { Date });
    const manager = {
      moveHistory: [],
      replayCompactLog: "",
      clonePlain(value: unknown) {
        return JSON.parse(JSON.stringify(value));
      },
      setRuntimeUndoStack(value: unknown) {
        this.undoStack = value;
      },
      setRuntimeRedoStack(value: unknown) {
        this.redoStack = value;
      }
    };

    runtime.applySavedManagerReplayState(manager, {
      move_history: [],
      replay_compact_log: "",
      session_replay_v1: {
        v: 1,
        board_width: 4,
        board_height: 4,
        init_tiles: [],
        records: [],
        last_event_at_ms: 12_345,
        supported: true
      },
      session_replay_v3: null
    });

    expect((manager.sessionReplayV1 as Record<string, unknown>).last_event_at_ms).toBe(12_345);
    vi.useRealTimers();
  });

  it("restores saved replay string as rescue replay fallback", () => {
    const runtime = loadSavedStateRuntime([32768]);
    const manager = {
      moveHistory: [],
      replayCompactLog: "",
      rescueReplayString: "",
      clonePlain(value: unknown) {
        return JSON.parse(JSON.stringify(value));
      },
      setRuntimeUndoStack(value: unknown) {
        this.undoStack = value;
      },
      setRuntimeRedoStack(value: unknown) {
        this.redoStack = value;
      }
    };

    runtime.applySavedManagerReplayState(manager, {
      move_history: [],
      replay_compact_log: "",
      replay_string: "REPLAY_v1RPL_B64_restored",
      session_replay_v1: null,
      session_replay_v3: null
    });

    expect(manager.rescueReplayString).toBe("REPLAY_v1RPL_B64_restored");
  });

  it("preserves existing replay data when a lite sync snapshot has no replay payload", () => {
    const runtime = loadSavedStateRuntime([32768]);
    const existingSessionReplayV1 = {
      v: 1,
      board_width: 4,
      board_height: 4,
      init_tiles: [{ cellIndex: 0, valueBit: 0 }],
      records: [{ kind: "move", dir: 1, spawnIndex: 2, spawnValueBit: 0, deltaMs: 16 }],
      last_event_at_ms: 12_345,
      supported: true
    };
    const manager = {
      moveHistory: [1],
      replayCompactLog: "",
      rescueReplayString: "REPLAY_v1RPL_B64_existing",
      sessionReplayV1: existingSessionReplayV1,
      clonePlain(value: unknown) {
        return JSON.parse(JSON.stringify(value));
      },
      setRuntimeUndoStack(value: unknown) {
        this.undoStack = value;
      },
      setRuntimeRedoStack(value: unknown) {
        this.redoStack = value;
      }
    };

    runtime.applySavedManagerReplayState(manager, {
      move_history: [],
      replay_compact_log: "",
      replay_string: "",
      session_replay_v1: null,
      session_replay_v3: null
    });

    expect(manager.rescueReplayString).toBe("REPLAY_v1RPL_B64_existing");
    expect(manager.sessionReplayV1).toEqual(existingSessionReplayV1);
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

  it("restores session replay v1 and preserves its idle timer after refresh", () => {
    const runtime = loadSavedStateRuntime([32768]);
    const savedLastEventAt = 1234;
    const manager = {
      moveHistory: [],
      ipsInputTimes: [1, 2, 3],
      ipsInputCount: 0,
      undoStack: ["stale"],
      redoStack: ["stale"],
      replayCompactLog: "",
      sessionReplayV1: { stale: true },
      sessionReplayV3: { stale: true },
      spawnValueCounts: null,
      spawnTwos: 0,
      spawnFours: 0,
      undoEnabled: true,
      modeConfig: {
        undo_enabled: true
      },
      clonePlain(value: unknown) {
        return JSON.parse(JSON.stringify(value));
      },
      setRuntimeUndoStack(value: unknown) {
        this.undoStack = value;
      },
      setRuntimeRedoStack(value: unknown) {
        this.redoStack = value;
      }
    };

    runtime.applySavedManagerReplayState(manager, {
      move_history: [0, 1, 2],
      ips_input_count: 3,
      undo_stack: ["u1"],
      redo_stack: ["r1"],
      replay_compact_log: "compact",
      session_replay_v1: {
        v: 1,
        mode_key: "classic_4x4_pow2_undo",
        ruleset: "pow2",
        board_width: 4,
        board_height: 4,
        start_unix_ms: 100,
        challenge_id: null,
        seed: 9,
        init_tiles: [
          { cellIndex: 0, valueBit: 0 },
          { cellIndex: 1, valueBit: 0 }
        ],
        records: [
          { kind: "move", dir: 1, spawnIndex: 3, spawnValueBit: 0, deltaMs: 40 }
        ],
        last_event_at_ms: savedLastEventAt,
        supported: true
      },
      session_replay_v3: {
        v: 3,
        actions: [["m", 1]]
      },
      spawn_value_counts: { "2": 2, "4": 1 }
    });

    expect(manager.moveHistory).toEqual([0, 1, 2]);
    expect(manager.ipsInputTimes).toEqual([]);
    expect(manager.ipsInputCount).toBe(3);
    expect(manager.undoStack).toEqual(["u1"]);
    expect(manager.redoStack).toEqual(["r1"]);
    expect(manager.replayCompactLog).toBe("compact");
    expect(manager.sessionReplayV1).toMatchObject({
      v: 1,
      mode_key: "classic_4x4_pow2_undo",
      ruleset: "pow2",
      board_width: 4,
      board_height: 4,
      seed: 9,
      supported: true
    });
    expect((manager.sessionReplayV1 as { last_event_at_ms: number }).last_event_at_ms).toBe(savedLastEventAt);
    expect((manager.sessionReplayV1 as { records: unknown[] }).records).toEqual([
      { kind: "move", dir: 1, spawnIndex: 3, spawnValueBit: 0, deltaMs: 40 }
    ]);
    expect(manager.sessionReplayV3).toEqual({
      v: 3,
      actions: [["m", 1]]
    });
    expect(manager.spawnValueCounts).toEqual({ "2": 2, "4": 1 });
    expect(manager.spawnTwos).toBe(2);
    expect(manager.spawnFours).toBe(1);
  });

  it("derives missing progress counters from restored move history", () => {
    const runtime = loadSavedStateRuntime([32768]);
    const manager = {
      moveHistory: [],
      successfulMoveCount: 0,
      undoUsed: 0,
      setRuntimeUndoStack(value: unknown) {
        this.undoStack = value;
      },
      setRuntimeRedoStack(value: unknown) {
        this.redoStack = value;
      },
      clonePlain(value: unknown) {
        return JSON.parse(JSON.stringify(value));
      }
    };

    runtime.applySavedManagerReplayState(manager, {
      move_history: [0, 1, -1, 2],
      replay_compact_log: "",
      spawn_value_counts: {}
    });
    runtime.applySavedManagerProgressState(manager, {
      successful_move_count: 0,
      undo_used: 0
    });

    expect(manager.successfulMoveCount).toBe(3);
    expect(manager.undoUsed).toBe(1);
  });

  it("keeps win-prompt saved states restorable", () => {
    const runtime = loadSavedStateRuntime([32768]);
    const manager = {
      modeKey: "standard_4x4_pow2_no_undo",
      width: 4,
      height: 4,
      ruleset: "pow2"
    };

    expect(
      runtime.resolveSavedStateRestoreDecision(manager, {
        v: 1,
        mode_key: "standard_4x4_pow2_no_undo",
        board_width: 4,
        board_height: 4,
        ruleset: "pow2",
        board: [
          [2048, 2, 4, 8],
          [16, 32, 64, 128],
          [256, 512, 1024, 2],
          [4, 8, 16, 32]
        ],
        score: 800000,
        over: false,
        won: true,
        keep_playing: false
      })
    ).toEqual({ canRestore: true, shouldClearSavedState: true });
  });
});
