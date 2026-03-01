import { describe, expect, it } from "vitest";

import {
  resolveHistoryAdapterParityStatus,
  resolveHistoryAdapterBadgeHtml,
  resolveHistoryAdapterBadgeState,
  resolveHistoryAdapterDiagnosticsHtml,
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

  it("reads parity status from local history store with fallback", () => {
    expect(
      resolveHistoryAdapterParityStatus(
        {
          getAdapterParityStatus() {
            return "mismatch";
          }
        },
        {}
      )
    ).toBe("mismatch");
    expect(resolveHistoryAdapterParityStatus({}, {})).toBe("incomplete");
  });

  it("maps parity status to badge class and text", () => {
    const item = {
      adapter_parity_report_v2: {
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

  it("prefers v2 payloads over v1 when both exist", () => {
    const state = resolveHistoryAdapterDiagnosticsState({
      adapter_parity_report_v1: {
        adapterMode: "legacy-bridge",
        lastScoreFromSnapshot: 100,
        undoUsedFromSnapshot: 9,
        scoreDelta: -9,
        isScoreAligned: false
      },
      adapter_parity_report_v2: {
        schemaVersion: 2,
        adapterMode: "core-adapter",
        lastScoreFromSnapshot: 300,
        undoUsedFromSnapshot: 2,
        scoreDelta: 1,
        isScoreAligned: true
      },
      adapter_parity_ab_diff_v1: {
        comparable: true,
        scoreDelta: -8,
        undoUsedDelta: -1,
        overEventsDelta: -1
      },
      adapter_parity_ab_diff_v2: {
        schemaVersion: 2,
        comparable: true,
        scoreDelta: 0,
        undoUsedDelta: 0,
        overEventsDelta: 0
      }
    });

    expect(state.hasDiagnostics).toBe(true);
    expect(state.lines).toEqual([
      "当前 core-adapter · 快照分数 300 · undoUsed 2 · scoreDelta +1 · 对齐 是",
      "A/B comparable 是 · scoreΔ 0 · undoΔ 0 · overΔ 0"
    ]);
  });

  it("builds badge html from badge state", () => {
    expect(
      resolveHistoryAdapterBadgeHtml({
        hasBadge: true,
        className: "history-adapter-badge-match",
        text: "A/B 一致"
      })
    ).toBe("<span class='history-adapter-badge history-adapter-badge-match'>A/B 一致</span>");
    expect(resolveHistoryAdapterBadgeHtml({ hasBadge: false })).toBe("");
  });

  it("builds diagnostics html from diagnostics state", () => {
    expect(
      resolveHistoryAdapterDiagnosticsHtml({
        hasDiagnostics: true,
        lines: ["scoreΔ +1", "<unsafe>"]
      })
    ).toBe(
      "<div class='history-adapter-diagnostics'><div class='history-adapter-title'>Adapter 诊断</div><div class='history-adapter-line'>scoreΔ +1</div><div class='history-adapter-line'>&lt;unsafe&gt;</div></div>"
    );
    expect(resolveHistoryAdapterDiagnosticsHtml({ hasDiagnostics: false })).toBe("");
  });
});
