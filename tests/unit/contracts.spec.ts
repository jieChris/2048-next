import { describe, expect, it } from "vitest";

import {
  CONTRACT_SCHEMA_VERSION,
  createEmptyReplayRecord,
  createSessionSnapshot,
  HISTORY_EXPORT_ENVELOPE_REQUIRED_KEYS,
  REPLAY_IMPORT_EXPORT_CONTRACT_MATRIX,
  REPLAY_RECORD_REQUIRED_KEYS,
  SUBMIT_PAYLOAD_REQUIRED_KEYS,
  isHistoryExportEnvelopeLike,
  isReplayRecordLike,
  isSubmitPayloadLike
} from "../../src/contracts";
import type {
  HistoryRecord,
  HistoryExportEnvelope,
  SubmitPayload,
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
      best_tile: 256,
      duration_ms: 60000,
      final_board: [[0, 2, 4, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      ended_at: "2026-03-15T00:00:00Z",
      saved_at: "2026-03-15T00:00:01Z",
      end_reason: "game_over",
      client_version: "1.8",
      replay: null,
      replay_string: ""
    };
    expect(record.id).toBe("test_001");
    expect(record.score).toBe(1234);
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
      ended_at: "2026-03-15T00:00:00Z",
      end_reason: "win_stop",
      final_board: [[2, 4], [8, 16]],
      replay: { version: 3 },
      replay_string: "REPLAY_v4C_S...",
      mode_bucket: "standard_undo",
      client_record_id: "rec_001",
      client_version: "1.8"
    };
    expect(payload.client_version).toBe("1.8");
    expect(payload.mode_bucket).toBe("standard_undo");
  });

  it("isSubmitPayloadLike validates required keys", () => {
    const valid = {
      score: 100,
      best_tile: 16,
      duration_ms: 1000,
      mode: "standard_no_undo",
      mode_key: "standard_4x4_pow2_no_undo",
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
      "ended_at",
      "end_reason",
      "final_board",
      "replay",
      "replay_string"
    ]);
  });

  it("defines non-empty producer/consumer/assertion paths for each matrix row", () => {
    expect(REPLAY_IMPORT_EXPORT_CONTRACT_MATRIX.length).toBe(3);
    for (const row of REPLAY_IMPORT_EXPORT_CONTRACT_MATRIX) {
      expect(row.requiredKeys.length).toBeGreaterThan(0);
      expect(row.producers.length).toBeGreaterThan(0);
      expect(row.consumers.length).toBeGreaterThan(0);
      expect(row.assertions.length).toBeGreaterThan(0);
    }
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
      mode_bucket: "standard_no_undo"
    };
    expect(entry.mode_bucket).toBe("standard_no_undo");
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
      mode_bucket: "standard_no_undo",
      mode_key: "standard_4x4_pow2_no_undo",
      score: 8000,
      best_tile: 2048,
      duration_ms: 180000,
      ended_at: "2026-03-15T00:00:00Z",
      end_reason: "game_over",
      deleted_at: null,
      created_at: "2026-03-15T00:00:00Z"
    };
    expect(entry.id).toBe("rec_001");
    expect(entry.score).toBe(8000);
    expect(entry.deleted_at).toBeNull();
  });
});
