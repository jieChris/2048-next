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
    resolveManagerElementById(manager: Record<string, unknown>, id: string) {
      const elements = (manager.elements || {}) as Record<string, unknown>;
      return Object.prototype.hasOwnProperty.call(elements, id) ? elements[id] : null;
    },
    resolveManagerDocumentLike() {
      return null;
    },
    ...(extraContext || {})
  } as Record<string, unknown>;

  vm.runInNewContext(clientRecordScript, context);
  vm.runInNewContext(script, context);
  return context as {
    applySavedTimerFixedRowsState: (manager: Record<string, unknown>, saved: Record<string, unknown>, cappedState: Record<string, unknown>) => void;
    applySavedTimerPostRestoreState: (manager: Record<string, unknown>, saved: Record<string, unknown>, cappedState: Record<string, unknown>) => void;
    applySavedManagerReplayState: (manager: Record<string, unknown>, saved: Record<string, unknown>) => void;
    collectSavedTimerFixedRowsState: (manager: Record<string, unknown>) => Record<string, unknown>;
    buildSavedGameStateDiagnosticsPayload: (manager: Record<string, unknown>) => Record<string, unknown>;
    buildSavedGameStateTimerCorePayload: (manager: Record<string, unknown>) => Record<string, unknown>;
    buildSavedGameStatePayload: (manager: Record<string, unknown>, now: number) => Record<string, unknown> | null;
    buildLiteSavedGameStatePayloadFallback: (
      manager: Record<string, unknown>,
      payload: Record<string, unknown>
    ) => Record<string, unknown> | null;
    clearSavedGameState: (manager: Record<string, unknown>, modeKey?: string) => void;
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
      }
    };

    const fullPayload = runtime.buildSavedGameStatePayload(manager, 1000) as Record<string, unknown>;
    expect(fullPayload.session_replay_v1).toEqual(sessionReplayV1);
    expect(fullPayload.session_replay_v1).not.toBe(sessionReplayV1);

    const litePayload = runtime.buildLiteSavedGameStatePayloadFallback(manager, fullPayload) as Record<string, unknown>;
    expect(litePayload.session_replay_v1).toEqual(sessionReplayV1);
    expect(litePayload.session_replay_v1).not.toBe(sessionReplayV1);
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

  it("restores session replay v1 and resets its idle timer after refresh", () => {
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
    expect((manager.sessionReplayV1 as { last_event_at_ms: number }).last_event_at_ms).not.toBe(savedLastEventAt);
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
});
