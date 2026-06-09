import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { afterEach, describe, expect, it, vi } from "vitest";

function loadRuntime(extraContext?: Record<string, unknown>, options?: { loadCodec?: boolean }) {
  const scriptPath = path.resolve(process.cwd(), "js/admin_rescue_client_runtime.js");
  const script = readFileSync(scriptPath, "utf8");
  const codecScriptPath = path.resolve(process.cwd(), "js/core_replay_codec_runtime.js");
  const codecScript = readFileSync(codecScriptPath, "utf8");
  const storage = new Map<string, string>([["2048_auth_token_v1", "token"]]);
  const context = {
    console,
    Date,
    localStorage: {
      getItem(key: string) {
        return storage.get(String(key)) || "";
      },
      setItem(key: string, value: string) {
        storage.set(String(key), String(value));
      },
      removeItem(key: string) {
        storage.delete(String(key));
      }
    },
    location: { origin: "https://2048next.cn" },
    setTimeout(callback: () => void) {
      callback();
      return 1;
    },
    confirm: vi.fn(() => true),
    alert: vi.fn(),
    atob(value: string) {
      return Buffer.from(String(value), "base64").toString("binary");
    },
    fetch: vi.fn(),
    ...(extraContext || {})
  } as Record<string, unknown>;

  context.window = context;
  if (options?.loadCodec) vm.runInNewContext(codecScript, context);
  vm.runInNewContext(script, context);
  return context as typeof context & {
    AdminRescueClientRuntime: {
      checkAndOfferRescue(manager: Record<string, unknown>): Promise<void>;
    };
    fetch: ReturnType<typeof vi.fn>;
  };
}

function encodeBase64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function createRankedSessionToken(payload: Record<string, unknown>): string {
  return `rs1.${encodeBase64UrlJson(payload)}.mock-signature`;
}

function encodeReplayV1Payload(context: Record<string, unknown>): string {
  const codec = (context.CoreReplayCodecRuntime || {}) as {
    encodeReplayV1Rpl(input: unknown): Uint8Array;
  };
  const bytes = codec.encodeReplayV1Rpl({
    width: 4,
    height: 4,
    initTiles: [
      { cellIndex: 0, valueBit: 0 },
      { cellIndex: 1, valueBit: 0 }
    ],
    records: [
      { kind: "move", dir: 1, spawnIndex: 3, spawnValueBit: 0, deltaMs: 40 },
      { kind: "move", dir: 2, spawnIndex: 7, spawnValueBit: 1, deltaMs: 50 }
    ],
    startUnixMs: 1000
  });
  return "REPLAY_v1RPL_B64_" + Buffer.from(bytes).toString("base64");
}

describe("admin rescue client runtime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("applies replay and stats fields from a rescue offer", async () => {
    const offer = {
      id: "rescue_full_state",
      board: [
        [16, 64, 128, 32768],
        [8, 2, 2, 0],
        [4, 0, 0, 0],
        [0, 2, 0, 0]
      ],
      score: 454348,
      duration_ms: 12077797,
      move_history: [0, 1, 2],
      replay_compact_log: "abc",
      session_replay_v1: {
        v: 1,
        mode_key: "standard_4x4_pow2_no_undo",
        ruleset: "pow2",
        board_width: 4,
        board_height: 4,
        init_tiles: [{ cellIndex: 0, valueBit: 0 }],
        records: [{ kind: "move", dir: 1, spawnIndex: 3, spawnValueBit: 0, deltaMs: 40 }],
        supported: true
      },
      session_replay_v3: { v: 3, actions: [["m", 1]] },
      spawn_value_counts: { "2": 2, "4": 1 },
      replay_string: "REPLAY_v1RPL_B64_demo"
    };
    const context = loadRuntime();
    context.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [offer] })
    });
    const manager = {
      modeKey: "standard_4x4_pow2_no_undo",
      modeConfig: {},
      score: 0,
      moveHistory: [],
      replayCompactLog: "",
      spawnValueCounts: {},
      successfulMoveCount: 0,
      undoUsed: 0,
      restartWithBoard: vi.fn(),
      setRuntimeScore(value: number) {
        this.score = value;
      },
      getFinalBoardMatrix() {
        return offer.board;
      },
      clonePlain(value: unknown) {
        return JSON.parse(JSON.stringify(value));
      },
      actuate: vi.fn(),
      saveGameState: vi.fn()
    };

    await context.AdminRescueClientRuntime.checkAndOfferRescue(manager);

    expect(manager.restartWithBoard).toHaveBeenCalledWith(offer.board, manager.modeConfig, {
      skipStartTiles: true,
      disableStateRestore: true
    });
    expect(manager.score).toBe(454348);
    expect(manager.moveHistory).toEqual([0, 1, 2]);
    expect(manager.successfulMoveCount).toBe(3);
    expect(manager.undoUsed).toBe(0);
    expect(manager.replayCompactLog).toBe("abc");
    expect(manager.sessionReplayV1).toEqual(expect.objectContaining({ mode_key: "standard_4x4_pow2_no_undo" }));
    expect(manager.sessionReplayV3).toEqual({ v: 3, actions: [["m", 1]] });
    expect(manager.spawnValueCounts).toEqual({ "2": 2, "4": 1 });
    expect(manager.spawnTwos).toBe(2);
    expect(manager.spawnFours).toBe(1);
    expect(manager.rescueReplayString).toBe("REPLAY_v1RPL_B64_demo");
  });

  it("restores timer row state from a rescue offer saved-state payload", async () => {
    const offer = {
      id: "rescue_timer_rows",
      board: [
        [16, 64, 128, 32768],
        [8, 2, 2, 0],
        [4, 0, 0, 0],
        [0, 2, 0, 0]
      ],
      score: 454348,
      duration_ms: 12_077_797,
      timer_status: 1,
      timer_elapsed_offset_ms: 12_077_797,
      timer_anchor_local_ms: 1_780_900_000_000,
      timer_anchor_server_ms: 1_780_900_000_000,
      timer_fixed_rows: {
        "32768": {
          timerText: "3:21:56.161",
          display: "",
          visibility: "",
          pointerEvents: "",
          legendText: "32768",
          legendClass: "timertile timer-legend-32768",
          legendFontSize: ""
        }
      },
      timer_secondary_rows: [
        { parent: 32768, child: 8192, time: "3:02:11.000" }
      ],
      has_game_started: true
    };
    const applySavedStateRestore = vi.fn(() => true);
    const context = loadRuntime({ applySavedStateRestore });
    context.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [offer] })
    });
    const manager = {
      modeKey: "standard_4x4_pow2_no_undo",
      modeConfig: {},
      score: 0,
      moveHistory: [],
      restartWithBoard: vi.fn(),
      setRuntimeScore(value: number) {
        this.score = value;
      },
      getFinalBoardMatrix() {
        return offer.board;
      },
      clonePlain(value: unknown) {
        return JSON.parse(JSON.stringify(value));
      },
      actuate: vi.fn(),
      startTimer: vi.fn(),
      saveGameState: vi.fn()
    };

    await context.AdminRescueClientRuntime.checkAndOfferRescue(manager);

    expect(applySavedStateRestore).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        board: offer.board,
        score: 454348,
        duration_ms: 12_077_797,
        timer_status: 1,
        timer_elapsed_offset_ms: 12_077_797,
        timer_anchor_local_ms: 1_780_900_000_000,
        timer_anchor_server_ms: 1_780_900_000_000,
        timer_fixed_rows: offer.timer_fixed_rows,
        timer_secondary_rows: offer.timer_secondary_rows,
        has_game_started: true
      })
    );
    expect(manager.saveGameState).toHaveBeenCalledWith({ force: true, forceFull: true });
  });

  it("applies ranked session context from a rescue offer", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_780_919_012_000);
    const nowSec = Math.floor(Date.now() / 1000);
    const rankedSessionToken = createRankedSessionToken({
      v: "rs1",
      sub: 7,
      mode_key: "standard_4x4_pow2_no_undo",
      challenge_id: "rescue-new-challenge",
      seed: 123456,
      iat: nowSec,
      exp: nowSec + 3600
    });
    const offer = {
      id: "rescue_ranked_session",
      board: [
        [16, 64, 128, 32768],
        [8, 2, 2, 0],
        [4, 0, 0, 0],
        [0, 2, 0, 0]
      ],
      score: 454348,
      duration_ms: 12077797,
      mode_key: "standard_4x4_pow2_no_undo",
      challenge_id: "rescue-new-challenge",
      seed: 123456,
      session_replay_v1: {
        v: 1,
        mode_key: "standard_4x4_pow2_no_undo",
        ruleset: "pow2",
        board_width: 4,
        board_height: 4,
        challenge_id: "rescue-new-challenge",
        seed: 123456,
        ranked_session_token: rankedSessionToken,
        init_tiles: [{ cellIndex: 0, valueBit: 0 }],
        records: [{ kind: "move", dir: 1, spawnIndex: 3, spawnValueBit: 0, deltaMs: 40 }],
        supported: true
      },
      spawn_value_counts: { "2": 2, "4": 1 }
    };
    const context = loadRuntime({ GAME_CHALLENGE_CONTEXT: null });
    context.localStorage.setItem("2048_auth_userId_v1", "7");
    context.localStorage.setItem(
      "ranked_session_prefetch:v1:standard_4x4_pow2_no_undo",
      JSON.stringify({
        mode_key: "standard_4x4_pow2_no_undo",
        challenge_id: "prefetched-session",
        seed: 222,
        ranked_session_token: "prefetched-token",
        issued_at: nowSec,
        exp: nowSec + 3600,
        owner_user_id: "7"
      })
    );
    context.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [offer] })
    });
    const manager = {
      modeKey: "standard_4x4_pow2_no_undo",
      modeConfig: { key: "standard_4x4_pow2_no_undo" },
      rankPolicy: "ranked",
      rankedSessionToken: "",
      challengeId: null,
      initialSeed: 0,
      seed: 0,
      moveHistory: [],
      spawnValueCounts: {},
      restartWithBoard: vi.fn(),
      getFinalBoardMatrix() {
        return offer.board;
      },
      clonePlain(value: unknown) {
        return JSON.parse(JSON.stringify(value));
      },
      actuate: vi.fn(),
      startTimer: vi.fn(function () {
        this.timerStatus = 1;
        this.pendingTimerAnchorServerMs = null;
      }),
      saveGameState: vi.fn()
    };

    await context.AdminRescueClientRuntime.checkAndOfferRescue(manager);

    expect(manager.rankedSessionToken).toBe(rankedSessionToken);
    expect(manager.challengeId).toBe("rescue-new-challenge");
    expect(manager.initialSeed).toBe(123456);
    expect(manager.seed).toBe(123456);
    expect(manager.sessionReplayV1).toEqual(
      expect.objectContaining({
        challenge_id: "rescue-new-challenge",
        seed: 123456,
        ranked_session_token: rankedSessionToken
      })
    );
    expect(context.GAME_CHALLENGE_CONTEXT).toEqual({
      id: "rescue-new-challenge",
      mode_key: "standard_4x4_pow2_no_undo",
      seed: 123456,
      ranked_session_token: rankedSessionToken
    });
    const activeSession = JSON.parse(
      String(context.localStorage.getItem("ranked_session_active:v1:standard_4x4_pow2_no_undo") || "{}")
    );
    expect(activeSession).toEqual({
      mode_key: "standard_4x4_pow2_no_undo",
      mode_bucket: null,
      challenge_id: "rescue-new-challenge",
      seed: 123456,
      ranked_session_token: rankedSessionToken,
      issued_at: nowSec,
      exp: nowSec + 3600,
      owner_user_id: "7",
      client_received_at_ms: 1_780_919_012_000
    });
    expect(context.localStorage.getItem("ranked_session_prefetch:v1:standard_4x4_pow2_no_undo")).toBe("");
    expect(manager.timerElapsedOffsetMs).toBe(12077797);
    expect(manager.pendingTimerAnchorServerMs).toBeNull();
    expect(manager.startTimer).toHaveBeenCalled();
    expect(manager.saveGameState).toHaveBeenCalledWith({ force: true, forceFull: true });
  });

  it("persists ranked rescue session before saved-state timer restore starts", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(150_000);
    const rankedSessionToken = createRankedSessionToken({
      v: "rs1",
      sub: 17,
      mode_key: "standard_4x4_pow2_no_undo",
      challenge_id: "rescue-timer-anchor",
      seed: 123456,
      iat: 100,
      exp: 3600
    });
    const offer = {
      id: "rescue_timer_anchor",
      board: [
        [16, 64, 128, 32768],
        [8, 2, 2, 0],
        [4, 0, 0, 0],
        [0, 2, 0, 0]
      ],
      score: 454348,
      duration_ms: 5_981_479,
      accepted_at: 200_000,
      mode_key: "standard_4x4_pow2_no_undo",
      challenge_id: "rescue-timer-anchor",
      seed: 123456,
      ranked_session_token: rankedSessionToken,
      issued_at: 100,
      timer_fixed_rows: {
        "32768": {
          timerText: "1:39:11.334",
          legendText: "32768",
          legendClass: "timertile timer-legend-32768",
          legendFontSize: ""
        }
      }
    };
    const applySavedStateRestore = vi.fn((manager: Record<string, unknown>) => {
      (manager.startTimer as () => void)();
      return true;
    });
    const context = loadRuntime({ applySavedStateRestore });
    context.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [offer] })
    });
    const manager = {
      modeKey: "standard_4x4_pow2_no_undo",
      modeConfig: {},
      score: 0,
      moveHistory: [],
      restartWithBoard: vi.fn(),
      setRuntimeScore(value: number) {
        this.score = value;
      },
      getFinalBoardMatrix() {
        return offer.board;
      },
      clonePlain(value: unknown) {
        return JSON.parse(JSON.stringify(value));
      },
      actuate: vi.fn(),
      startTimer: vi.fn(function () {
        const raw = String(context.localStorage.getItem("ranked_session_active:v1:standard_4x4_pow2_no_undo") || "{}");
        const activeSession = JSON.parse(raw);
        this.timerAnchorServerMs = activeSession.issued_at ? activeSession.issued_at * 1000 : this.pendingTimerAnchorServerMs;
        this.timerStatus = 1;
        this.pendingTimerAnchorServerMs = null;
      }),
      saveGameState: vi.fn()
    };

    await context.AdminRescueClientRuntime.checkAndOfferRescue(manager);

    vi.setSystemTime(151_000);
    const activeSession = JSON.parse(
      String(context.localStorage.getItem("ranked_session_active:v1:standard_4x4_pow2_no_undo") || "{}")
    );
    const serverNowMs = activeSession.issued_at * 1000 + (Date.now() - activeSession.client_received_at_ms);
    const restoredElapsedMs = offer.duration_ms + Math.max(0, serverNowMs - Number(manager.timerAnchorServerMs));

    expect(restoredElapsedMs).toBeGreaterThan(offer.duration_ms);
  });

  it("derives replay and stats fields from a v1 replay string", async () => {
    const context = loadRuntime(
      {
        GameManager: {
          REPLAY_V1_RPL_BASE64_PREFIX: "REPLAY_v1RPL_B64_"
        }
      },
      { loadCodec: true }
    );
    const replayString = encodeReplayV1Payload(context);
    context.fetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: [
            {
              id: "rescue_replay_only",
              mode_key: "standard_4x4_pow2_no_undo",
              board: [
                [2, 2, 0, 2],
                [0, 0, 0, 4],
                [0, 0, 0, 0],
                [0, 0, 0, 0]
              ],
              move_history: [],
              spawn_value_counts: {},
              replay_string: replayString
            }
          ]
        })
    });
    const manager = {
      modeKey: "standard_4x4_pow2_no_undo",
      width: 4,
      height: 4,
      ruleset: "pow2",
      modeConfig: { ruleset: "pow2" },
      moveHistory: [],
      spawnValueCounts: {},
      successfulMoveCount: 0,
      undoUsed: 0,
      restartWithBoard: vi.fn(),
      getFinalBoardMatrix() {
        return [
          [2, 2, 0, 2],
          [0, 0, 0, 4],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ];
      },
      clonePlain(value: unknown) {
        return JSON.parse(JSON.stringify(value));
      },
      actuate: vi.fn(),
      saveGameState: vi.fn()
    };

    await context.AdminRescueClientRuntime.checkAndOfferRescue(manager);

    expect(manager.moveHistory).toEqual([1, 2]);
    expect(manager.successfulMoveCount).toBe(2);
    expect(manager.undoUsed).toBe(0);
    expect(manager.spawnValueCounts).toEqual({ "2": 1, "4": 1 });
    expect(manager.spawnTwos).toBe(1);
    expect(manager.spawnFours).toBe(1);
    expect(manager.sessionReplayV1).toEqual(
      expect.objectContaining({
        mode_key: "standard_4x4_pow2_no_undo",
        ruleset: "pow2",
        board_width: 4,
        board_height: 4,
        supported: true
      })
    );
    expect((manager.sessionReplayV1 as { records: unknown[] }).records).toHaveLength(2);
  });

  it("uses English copy for rescue prompts and success alerts when UI language is English", async () => {
    const offer = {
      id: "rescue_en",
      board: [
        [2, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],
      score: 128,
      duration_ms: 1000
    };
    const context = loadRuntime({
      UII18N: {
        getLanguage: () => "en"
      }
    });
    context.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [offer] })
    });
    const manager = {
      modeKey: "standard_4x4_pow2_no_undo",
      modeConfig: {},
      moveHistory: [],
      restartWithBoard: vi.fn(),
      setRuntimeScore(value: number) {
        this.score = value;
      },
      getFinalBoardMatrix() {
        return offer.board;
      },
      clonePlain(value: unknown) {
        return JSON.parse(JSON.stringify(value));
      },
      actuate: vi.fn(),
      saveGameState: vi.fn()
    };

    await context.AdminRescueClientRuntime.checkAndOfferRescue(manager);

    expect(context.confirm).toHaveBeenCalledWith(
      "An administrator has issued a game recovery for you.\n\nReplace the current board with the issued recovery board?\nRecovery score: 128"
    );
    expect(context.alert).toHaveBeenCalledWith("Recovery board applied.");
  });

  it("uses English copy for rescue accept failures", async () => {
    const offer = {
      id: "rescue_en_failure",
      board: [
        [2, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ]
    };
    const context = loadRuntime({
      UII18N: {
        getLanguage: () => "en"
      }
    });
    context.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [offer] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: false })
      });
    const manager = {
      modeKey: "standard_4x4_pow2_no_undo",
      modeConfig: {},
      moveHistory: []
    };

    await context.AdminRescueClientRuntime.checkAndOfferRescue(manager);

    expect(context.alert).toHaveBeenCalledWith("Recovery confirmation failed. Please refresh and try again.");
  });
});
