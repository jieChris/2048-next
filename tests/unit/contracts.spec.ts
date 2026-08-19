import { describe, expect, it } from "vitest";

import {
  CORE_CONTRACT_COVERAGE_MATRIX,
  CONTRACT_SCHEMA_VERSION,
  HISTORY_DIAGNOSTICS_INDEX_ENTRY_REQUIRED_KEYS,
  HISTORY_EXPORT_ENVELOPE_REQUIRED_KEYS,
  HISTORY_OWNER_META_REQUIRED_KEYS,
  HISTORY_RECORD_REQUIRED_KEYS,
  REPLAY_IMPORT_EXPORT_CONTRACT_MATRIX,
  REPLAY_RECORD_REQUIRED_KEYS,
  SAVED_GAME_STATE_PAYLOAD_REQUIRED_KEYS,
  SESSION_INIT_PAYLOAD_REQUIRED_KEYS,
  SUBMIT_PAYLOAD_REQUIRED_KEYS,
  calculateHistoryBoardSum,
  createEmptyReplayRecord,
  createSessionSnapshot,
  isHistoryExportEnvelopeLike,
  isHistoryDiagnosticsIndexEntryLike,
  isHistoryOwnerMetaLike,
  isHistoryRecordLike,
  isReplayRecordLike,
  isSavedGameStatePayloadLike,
  isSessionInitPayloadLike,
  isSubmitPayloadLike,
  normalizeHistoryDiagnosticsIndexEntriesLike,
  normalizeHistoryOwnerMetaLike,
  normalizeHistoryRecordLike
} from "../../src/contracts";
import type {
  HistoryRecord,
  HistoryExportEnvelope,
  SubmitPayload,
  RankedVerificationPayload,
  ReplayRecord,
  SessionSnapshot,
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiResponse,
  LeaderboardEntry,
  UserInfoResponse,
  LoginResponse,
  RecordSubmitResponse,
  UserRecordEntry
} from "../../src/contracts";

describe("contracts: schema version", () => {
  it("CONTRACT_SCHEMA_VERSION is a positive integer", () => {
    expect(Number.isInteger(CONTRACT_SCHEMA_VERSION)).toBe(true);
    expect(CONTRACT_SCHEMA_VERSION).toBeGreaterThan(0);
  });
});

describe("contracts: ReplayRecord", () => {
  it("createEmptyReplayRecord returns valid structure", () => {
    const record = createEmptyReplayRecord("standard_4x4_pow2_no_undo");
    expect(record.version).toBe(CONTRACT_SCHEMA_VERSION);
    expect(record.kind).toBe("v4c");
    expect(record.modeKey).toBe("standard_4x4_pow2_no_undo");
    expect(record.initialBoardEncoded).toBe("");
    expect(record.actionsEncoded).toBe("");
    expect(record.replayString).toBe("");
  });

  it("isReplayRecordLike validates required keys", () => {
    const valid = {
      version: 1,
      kind: "v4c",
      modeKey: "standard_4x4_pow2_no_undo",
      initialBoardEncoded: "",
      actionsEncoded: "",
      replayString: "REPLAY_v4C_X"
    };
    expect(isReplayRecordLike(valid)).toBe(true);
    expect(isReplayRecordLike({ modeKey: "x" })).toBe(false);
  });
});

describe("contracts: SessionSnapshot", () => {
  it("createSessionSnapshot fills defaults", () => {
    const snap = createSessionSnapshot({});
    expect(snap.version).toBe(CONTRACT_SCHEMA_VERSION);
    expect(snap.modeKey).toBe("unknown");
    expect(snap.score).toBe(0);
    expect(snap.board).toEqual([]);
    expect(snap.over).toBe(false);
    expect(snap.timestamp).toBeTruthy();
  });

  it("createSessionSnapshot preserves provided values", () => {
    const snap = createSessionSnapshot({
      modeKey: "classic_4x4_pow2_undo",
      score: 999,
      board: [[2, 4], [0, 0]],
      over: true,
      undoUsed: 5
    });
    expect(snap.modeKey).toBe("classic_4x4_pow2_undo");
    expect(snap.score).toBe(999);
    expect(snap.over).toBe(true);
    expect(snap.undoUsed).toBe(5);
  });
});

describe("contracts: HistoryRecord type shape", () => {
  it("satisfies required fields", () => {
    const record: HistoryRecord = {
      id: "test_001",
      mode: "local",
      mode_key: "standard_4x4_pow2_no_undo",
      board_width: 4,
      board_height: 4,
      ruleset: "pow2",
      undo_enabled: false,
      ranked_bucket: "none",
      mode_family: "pow2",
      rank_policy: "unranked",
      special_rules_snapshot: {},
      challenge_id: null,
      score: 1234,
      board_sum: 6,
      best_tile: 256,
      duration_ms: 60000,
      final_board: [[0, 2, 4, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      ended_at: "2026-03-15T00:00:00Z",
      saved_at: "2026-03-15T00:00:01Z",
      end_reason: "game_over",
      client_version: "1.8",
      replay: null,
      replay_string: "",
      owner_type: "guest",
      owner_user_id: null,
      owner_nickname: "",
      owner_key: "guest",
      diagnostics_index_entries: []
    };
    expect(record.id).toBe("test_001");
    expect(record.score).toBe(1234);
  });

  it("exposes stable required keys and validates runtime shape", () => {
    expect(HISTORY_RECORD_REQUIRED_KEYS).toEqual([
      "id",
      "mode",
      "mode_key",
      "board_width",
      "board_height",
      "ruleset",
      "undo_enabled",
      "ranked_bucket",
      "mode_family",
      "rank_policy",
      "special_rules_snapshot",
      "challenge_id",
      "score",
      "board_sum",
      "best_tile",
      "duration_ms",
      "final_board",
      "ended_at",
      "saved_at",
      "end_reason",
      "client_version",
      "replay",
      "replay_string",
      "owner_type",
      "owner_user_id",
      "owner_nickname",
      "owner_key",
      "diagnostics_index_entries"
    ]);
    const record = normalizeHistoryRecordLike(
      {
        id: "shape_1",
        mode_key: "practice",
        final_board: [[2, 4]],
        ended_at: "2026-03-21T00:00:00Z",
        saved_at: "2026-03-21T00:00:00Z"
      },
      {
        nowIso: () => "2026-03-21T00:00:00Z",
        idFactory: () => "id-fallback"
      }
    );
    expect(record).not.toBeNull();
    expect(isHistoryRecordLike(record)).toBe(true);
    expect(isHistoryRecordLike({ id: "x" })).toBe(false);
  });

  it("normalizes partial history record payloads with defaults", () => {
    const normalized = normalizeHistoryRecordLike(
      {
        score: 12.9,
        best_tile: "128",
        duration_ms: -5,
        replay: { version: 3 }
      },
      {
        nowIso: () => "2026-03-21T12:34:56Z",
        idFactory: () => "generated-id",
        defaultClientVersion: "1.9"
      }
    );
    expect(normalized).not.toBeNull();
    expect(normalized?.id).toBe("generated-id");
    expect(normalized?.mode).toBe("local");
    expect(normalized?.mode_key).toBe("unknown");
    expect(normalized?.score).toBe(12);
    expect(normalized?.board_sum).toBe(0);
    expect(normalized?.best_tile).toBe(128);
    expect(normalized?.duration_ms).toBe(0);
    expect(normalized?.client_version).toBe("1.9");
    expect(normalized?.ended_at).toBe("2026-03-21T12:34:56Z");
    expect(normalized?.replay_string).toContain("\"version\":3");
    expect(normalized?.owner_type).toBe("guest");
    expect(normalized?.owner_key).toBe("guest");
    expect(normalized?.diagnostics_index_entries).toEqual([]);
  });

  it("preserves durable delivery metadata and gives legacy evidence a retryable status", () => {
    const normalized = normalizeHistoryRecordLike({
      id: "local-1",
      replay_string: "REPLAY_v1RPL_B64_test",
      owner_type: "user",
      owner_user_id: "42",
      owner_key: "user:42",
      client_record_id: "rec-client-1",
      sync_status: "retry_wait",
      server_record_id: "rec-server-1",
      replay_sha256: "a".repeat(64),
      replay_byte_size: 23,
      upload_attempts: 3,
      next_retry_at: "2026-08-19T00:00:30.000Z",
      last_upload_attempt_at: "2026-08-19T00:00:00.000Z",
      last_error_code: "NETWORK_ERROR",
      last_error_message: "offline"
    });

    expect(normalized).toMatchObject({
      client_record_id: "rec-client-1",
      sync_status: "retry_wait",
      server_record_id: "rec-server-1",
      replay_sha256: "a".repeat(64),
      replay_byte_size: 23,
      upload_attempts: 3,
      next_retry_at: "2026-08-19T00:00:30.000Z",
      last_upload_attempt_at: "2026-08-19T00:00:00.000Z",
      last_error_code: "NETWORK_ERROR",
      last_error_message: "offline"
    });

    expect(normalizeHistoryRecordLike(
      { id: "legacy-local-7", replay_string: "RPL", owner_type: "user", owner_user_id: "7" }
    )).toMatchObject({
      client_record_id: "legacy-local-7",
      sync_status: "pending",
      server_record_id: null,
      upload_attempts: 0
    });
    expect(normalizeHistoryRecordLike({ replay_string: "RPL", owner_type: "guest" }))
      .toMatchObject({ sync_status: "waiting_auth" });
  });

  it("calculates and persists board sum from legacy final boards", () => {
    expect(calculateHistoryBoardSum([[2, "4", 0], [8, -1, Number.NaN]])).toBe(14);

    const normalized = normalizeHistoryRecordLike({
      board_sum: 999,
      final_board: [[2, 4], [8, 16]]
    });

    expect(normalized?.board_sum).toBe(30);
    expect(normalized?.final_board).toEqual([[2, 4], [8, 16]]);
  });
});

describe("contracts: history owner/diagnostics helpers", () => {
  it("normalizes owner meta and validates shape", () => {
    expect(HISTORY_OWNER_META_REQUIRED_KEYS).toEqual([
      "owner_type",
      "owner_user_id",
      "owner_nickname",
      "owner_key"
    ]);

    const owner = normalizeHistoryOwnerMetaLike({
      owner_type: "user",
      owner_user_id: "User#01",
      owner_nickname: "Alice"
    });
    expect(owner).toEqual({
      owner_type: "user",
      owner_user_id: "User#01",
      owner_nickname: "Alice",
      owner_key: "user:user_01"
    });
    expect(isHistoryOwnerMetaLike(owner)).toBe(true);
    expect(isHistoryOwnerMetaLike({ owner_type: "guest", owner_key: "guest" })).toBe(false);
  });

  it("normalizes diagnostics entries and validates shape", () => {
    expect(HISTORY_DIAGNOSTICS_INDEX_ENTRY_REQUIRED_KEYS).toEqual([
      "key",
      "schemaVersion",
      "payload"
    ]);

    const diagnostics = normalizeHistoryDiagnosticsIndexEntriesLike(
      [
        {
          key: "secondaryTimerPlacement",
          schemaVersion: 2,
          payload: {
            placed: 3,
            desc: "abcdefgh",
            list: [1, "", "xy", false, "zzzz"],
            bad: { nested: true }
          }
        },
        { key: "", schemaVersion: 1, payload: {} }
      ],
      {
        maxEntries: 1,
        maxPayloadKeys: 3,
        maxStringLength: 5,
        maxArrayItems: 3,
        keyMaxLength: 8
      }
    );

    expect(diagnostics).toEqual([
      {
        key: "secondar",
        schemaVersion: 2,
        payload: {
          placed: 3,
          desc: "abcde",
          list: [1, "xy", false]
        }
      }
    ]);
    expect(isHistoryDiagnosticsIndexEntryLike(diagnostics[0])).toBe(true);
    expect(
      isHistoryDiagnosticsIndexEntryLike({
        key: "x",
        schemaVersion: 0,
        payload: {}
      })
    ).toBe(false);
  });
});

describe("contracts: HistoryExportEnvelope type shape", () => {
  it("satisfies required fields", () => {
    const envelope: HistoryExportEnvelope = {
      v: 1,
      exported_at: "2026-03-15T00:00:00Z",
      count: 0,
      records: []
    };
    expect(envelope.v).toBe(1);
    expect(envelope.records).toEqual([]);
  });

  it("isHistoryExportEnvelopeLike validates required keys", () => {
    const valid = {
      v: 1,
      exported_at: "2026-03-15T00:00:00Z",
      count: 1,
      records: []
    };
    expect(isHistoryExportEnvelopeLike(valid)).toBe(true);
    expect(
      isHistoryExportEnvelopeLike({
        v: 1,
        exported_at: "2026-03-15T00:00:00Z",
        count: 1,
        records: "bad"
      })
    ).toBe(false);
  });
});

describe("contracts: SubmitPayload type shape", () => {
  it("satisfies required fields", () => {
    const payload: SubmitPayload = {
      score: 5000,
      best_tile: 1024,
      duration_ms: 120000,
      mode: "standard_no_undo",
      mode_key: "standard_4x4_pow2_no_undo",
      ranked_session_token: null,
      challenge_id: null,
      initial_seed: null,
      seed: null,
      ranked_verification: null,
      ended_at: "2026-03-15T00:00:00Z",
      end_reason: "game_over",
      final_board: [[0, 2, 4, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      replay: null,
      replay_string: "REPLAY_v4C_S..."
    };
    expect(payload.score).toBe(5000);
    expect(payload.mode).toBe("standard_no_undo");
    expect(payload.end_reason).toBe("game_over");
    expect(payload.final_board).toBeInstanceOf(Array);
  });

  it("accepts optional fields", () => {
    const payload: SubmitPayload = {
      score: 3000,
      best_tile: 512,
      duration_ms: 60000,
      mode: "standard_undo",
      mode_key: "classic_4x4_pow2_undo",
      ranked_session_token: "ranked-token",
      challenge_id: "ranked-1",
      initial_seed: 123,
      seed: 123,
      ranked_verification: {
        random_source: "server_seed",
        replay_format: "v1",
        challenge_id: "ranked-1",
        seed: 123,
        mode_key: "classic_4x4_pow2_undo",
        ranked_session_token: "ranked-token"
      },
      ended_at: "2026-03-15T00:00:00Z",
      end_reason: "win_stop",
      final_board: [[2, 4], [8, 16]],
      replay: { version: 3 },
      replay_string: "REPLAY_v4C_S...",
      mode_bucket: "standard_undo",
      client_record_id: "rec_001",
      client_version: "1.8",
      min_steps_2048: 612,
      min_steps_4096: null,
      min_steps_8192: null
    };
    expect(payload.client_version).toBe("1.8");
    expect(payload.mode_bucket).toBe("standard_undo");
    expect(payload.min_steps_2048).toBe(612);
  });

  it("isSubmitPayloadLike validates required keys", () => {
    const valid = {
      score: 100,
      best_tile: 16,
      duration_ms: 1000,
      mode: "standard_no_undo",
      mode_key: "standard_4x4_pow2_no_undo",
      ranked_session_token: null,
      challenge_id: null,
      initial_seed: null,
      seed: null,
      ranked_verification: null,
      ended_at: "2026-03-15T00:00:00Z",
      end_reason: "game_over",
      final_board: [[2, 0], [0, 0]],
      replay: null,
      replay_string: ""
    };
    expect(isSubmitPayloadLike(valid)).toBe(true);
    expect(isSubmitPayloadLike({ ...valid, final_board: "bad" })).toBe(false);
  });
});

describe("contracts: replay/import/export matrix", () => {
  it("exposes stable required keys for core contracts", () => {
    expect(REPLAY_RECORD_REQUIRED_KEYS).toEqual([
      "version",
      "kind",
      "modeKey",
      "initialBoardEncoded",
      "actionsEncoded",
      "replayString"
    ]);
    expect(HISTORY_EXPORT_ENVELOPE_REQUIRED_KEYS).toEqual([
      "v",
      "exported_at",
      "count",
      "records"
    ]);
    expect(SUBMIT_PAYLOAD_REQUIRED_KEYS).toEqual([
      "score",
      "best_tile",
      "duration_ms",
      "mode",
      "mode_key",
      "ranked_session_token",
      "challenge_id",
      "initial_seed",
      "seed",
      "ranked_verification",
      "ended_at",
      "end_reason",
      "final_board",
      "replay",
      "replay_string"
    ]);
    expect(SAVED_GAME_STATE_PAYLOAD_REQUIRED_KEYS).toEqual([
      "v",
      "saved_at",
      "mode_key",
      "board_width",
      "board_height",
      "ruleset",
      "board",
      "score",
      "over",
      "won",
      "keep_playing",
      "duration_ms"
    ]);
    expect(SESSION_INIT_PAYLOAD_REQUIRED_KEYS).toEqual([
      "modeKey",
      "modeConfig",
      "inputManagerCtor",
      "defaultBoardWidth"
    ]);
  });

  it("defines non-empty producer/consumer/assertion paths for each matrix row", () => {
    expect(REPLAY_IMPORT_EXPORT_CONTRACT_MATRIX.length).toBe(6);
    expect(CORE_CONTRACT_COVERAGE_MATRIX).toBe(REPLAY_IMPORT_EXPORT_CONTRACT_MATRIX);
    for (const row of REPLAY_IMPORT_EXPORT_CONTRACT_MATRIX) {
      expect(row.requiredKeys.length).toBeGreaterThan(0);
      expect(row.producers.length).toBeGreaterThan(0);
      expect(row.consumers.length).toBeGreaterThan(0);
      expect(row.assertions.length).toBeGreaterThan(0);
    }
  });

  it("validates saved-state and session-init payload minimum shapes", () => {
    const savedStatePayload = {
      v: 1,
      saved_at: Date.now(),
      mode_key: "standard_4x4_pow2_no_undo",
      board_width: 4,
      board_height: 4,
      ruleset: "pow2",
      board: [[0, 2], [4, 8]],
      score: 1024,
      over: false,
      won: false,
      keep_playing: false,
      duration_ms: 1200
    };
    const sessionInitPayload = {
      modeKey: "standard_4x4_pow2_no_undo",
      modeConfig: { key: "standard_4x4_pow2_no_undo" },
      inputManagerCtor: function InputManagerCtor() {},
      defaultBoardWidth: 4
    };
    expect(isSavedGameStatePayloadLike(savedStatePayload)).toBe(true);
    expect(isSavedGameStatePayloadLike({ ...savedStatePayload, board: "bad" })).toBe(false);
    expect(isSessionInitPayloadLike(sessionInitPayload)).toBe(true);
    expect(
      isSessionInitPayloadLike({
        ...sessionInitPayload,
        defaultBoardWidth: Number.NaN
      })
    ).toBe(false);
  });
});

describe("contracts: RankedVerificationPayload type shape", () => {
  it("satisfies required fields", () => {
    const verification: RankedVerificationPayload = {
      random_source: "server_seed",
      replay_format: "v1",
      challenge_id: "ranked-1",
      seed: 123,
      mode_key: "standard_4x4_pow2_no_undo",
      ranked_session_token: "ranked-token"
    };

    expect(verification.random_source).toBe("server_seed");
    expect(verification.replay_format).toBe("v1");
    expect(verification.seed).toBe(123);
  });
});

describe("contracts: ApiSuccessResponse type shape", () => {
  it("satisfies required fields", () => {
    const resp: ApiSuccessResponse<{ count: number }> = {
      success: true,
      data: { count: 42 }
    };
    expect(resp.success).toBe(true);
    expect(resp.data?.count).toBe(42);
  });

  it("allows omitting data", () => {
    const resp: ApiSuccessResponse = { success: true };
    expect(resp.success).toBe(true);
    expect(resp.data).toBeUndefined();
  });
});

describe("contracts: ApiErrorResponse type shape", () => {
  it("satisfies required fields", () => {
    const resp: ApiErrorResponse = { error: "not found" };
    expect(resp.error).toBe("not found");
    expect(resp.code).toBeUndefined();
  });

  it("accepts optional code", () => {
    const resp: ApiErrorResponse = { error: "forbidden", code: "AUTH_FAIL" };
    expect(resp.code).toBe("AUTH_FAIL");
  });
});

describe("contracts: ApiResponse discriminated union", () => {
  it("narrows to success branch", () => {
    const resp: ApiResponse<number> = { success: true, data: 7 };
    if ("success" in resp) {
      expect(resp.success).toBe(true);
      expect(resp.data).toBe(7);
    }
  });

  it("narrows to error branch", () => {
    const resp: ApiResponse = { error: "oops" };
    if ("error" in resp) {
      expect(resp.error).toBe("oops");
    }
  });
});

describe("contracts: LeaderboardEntry type shape", () => {
  it("satisfies required fields", () => {
    const entry: LeaderboardEntry = {
      user_id: 1,
      nickname: "Alice",
      score: 99999,
      game_date: "2026-03-15"
    };
    expect(entry.user_id).toBe(1);
    expect(entry.score).toBe(99999);
  });

  it("accepts optional mode_bucket", () => {
    const entry: LeaderboardEntry = {
      user_id: 2,
      nickname: "Bob",
      score: 50000,
      game_date: "2026-03-15",
      mode_bucket: "standard_no_undo",
      min_steps_2048: 588,
      min_steps_4096: null,
      min_steps_8192: null
    };
    expect(entry.mode_bucket).toBe("standard_no_undo");
    expect(entry.min_steps_2048).toBe(588);
  });
});

describe("contracts: UserInfoResponse type shape", () => {
  it("satisfies required fields", () => {
    const info: UserInfoResponse = {
      id: 10,
      nickname: "Player1",
      created_at: "2026-01-01T00:00:00Z"
    };
    expect(info.id).toBe(10);
    expect(info.nickname).toBe("Player1");
  });
});

describe("contracts: LoginResponse type shape", () => {
  it("satisfies required fields", () => {
    const login: LoginResponse = {
      token: "jwt.token.here",
      userId: 10,
      nickname: "Player1"
    };
    expect(login.token).toBe("jwt.token.here");
    expect(login.userId).toBe(10);
  });
});

describe("contracts: RecordSubmitResponse type shape", () => {
  it("satisfies required fields", () => {
    const resp: RecordSubmitResponse = {
      id: "rec_abc",
      modeBucket: "standard_no_undo",
      endedAt: "2026-03-15T00:00:00Z"
    };
    expect(resp.id).toBe("rec_abc");
    expect(resp.duplicate).toBeUndefined();
  });

  it("accepts optional duplicate flag", () => {
    const resp: RecordSubmitResponse = {
      id: "rec_def",
      modeBucket: "standard_no_undo",
      endedAt: "2026-03-15T00:00:00Z",
      duplicate: true
    };
    expect(resp.duplicate).toBe(true);
  });
});

describe("contracts: UserRecordEntry type shape", () => {
  it("satisfies required fields", () => {
    const entry: UserRecordEntry = {
      id: "rec_001",
      user_id: 5,
      record_era: "official_v1",
      mode_bucket: "standard_no_undo",
      mode_key: "standard_4x4_pow2_no_undo",
      score: 8000,
      best_tile: 2048,
      duration_ms: 180000,
      ended_at: "2026-03-15T00:00:00Z",
      end_reason: "game_over",
      deleted_at: null,
      created_at: "2026-03-15T00:00:00Z",
      min_steps_2048: 604
    };
    expect(entry.id).toBe("rec_001");
    expect(entry.record_era).toBe("official_v1");
    expect(entry.score).toBe(8000);
    expect(entry.deleted_at).toBeNull();
    expect(entry.min_steps_2048).toBe(604);
  });

  it("accepts beta records as a distinct era", () => {
    const entry: UserRecordEntry = {
      id: "rec_beta_001",
      user_id: 5,
      record_era: "beta",
      mode_bucket: "standard_no_undo",
      mode_key: "standard_4x4_pow2_no_undo",
      score: 4096,
      best_tile: 512,
      duration_ms: 120000,
      ended_at: "2026-03-14T00:00:00Z",
      end_reason: "game_over",
      deleted_at: null,
      created_at: "2026-03-14T00:00:00Z"
    };
    expect(entry.record_era).toBe("beta");
  });
});
