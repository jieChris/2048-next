import { describe, expect, it } from "vitest";

import {
  CONTRACT_SCHEMA_VERSION,
  createEmptyReplayRecord,
  createSessionSnapshot
} from "../../src/contracts";
import type {
  HistoryRecord,
  HistoryExportEnvelope,
  SubmitPayload,
  ReplayRecord,
  SessionSnapshot
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
});

describe("contracts: SubmitPayload type shape", () => {
  it("satisfies required fields", () => {
    const payload: SubmitPayload = {
      version: 1,
      mode_key: "standard_4x4_pow2_no_undo",
      score: 5000,
      best_tile: 1024,
      duration_ms: 120000,
      replay_string: "REPLAY_v4C_S...",
      client_version: "1.8",
      nickname: "player1"
    };
    expect(payload.score).toBe(5000);
    expect(payload.nickname).toBe("player1");
  });
});
