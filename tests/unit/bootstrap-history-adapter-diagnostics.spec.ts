import { describe, expect, it } from "vitest";

import {
  resolveHistoryAdapterBadgeState,
  resolveHistoryAdapterDiagnosticsState
} from "../../src/bootstrap/history-adapter-diagnostics";

describe("bootstrap history adapter diagnostics", () => {
  it("returns empty badge state when diagnostics are missing", () => {
    const state = resolveHistoryAdapterBadgeState({}, "mismatch");
    expect(state).toEqual({
      hasBadge: false,
      className: "",
      text: ""
    });
  });

  it("maps parity status to badge class and text", () => {
    const item = {
      adapter_parity_report_v1: {
        adapterMode: "core-adapter"
      }
    };
    expect(resolveHistoryAdapterBadgeState(item, "mismatch")).toEqual({
      hasBadge: true,
      className: "history-adapter-badge-mismatch",
      text: "A/B 不一致"
    });
    expect(resolveHistoryAdapterBadgeState(item, "match")).toEqual({
      hasBadge: true,
      className: "history-adapter-badge-match",
      text: "A/B 一致"
    });
  });

  it("builds report and diff diagnostic lines", () => {
    const state = resolveHistoryAdapterDiagnosticsState({
      adapter_parity_report_v1: {
        adapterMode: "core-adapter",
        lastScoreFromSnapshot: 260,
        undoUsedFromSnapshot: 1,
        scoreDelta: 4,
        isScoreAligned: false
      },
      adapter_parity_ab_diff_v1: {
        comparable: true,
        scoreDelta: -2,
        undoUsedDelta: 0,
        overEventsDelta: 1
      }
    });

    expect(state.hasDiagnostics).toBe(true);
    expect(state.lines).toEqual([
      "当前 core-adapter · 快照分数 260 · undoUsed 1 · scoreDelta +4 · 对齐 否",
      "A/B comparable 是 · scoreΔ -2 · undoΔ 0 · overΔ +1"
    ]);
  });

  it("uses fallback formatting for invalid values", () => {
    const state = resolveHistoryAdapterDiagnosticsState({
      adapter_parity_report_v1: {
        adapterMode: "unknown",
        lastScoreFromSnapshot: "abc",
        undoUsedFromSnapshot: null,
        scoreDelta: undefined,
        isScoreAligned: null
      }
    });

    expect(state.lines).toEqual(["当前 - · 快照分数 - · undoUsed 0 · scoreDelta - · 对齐 -"]);
  });
});
