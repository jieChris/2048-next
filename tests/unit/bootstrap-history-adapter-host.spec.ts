import { describe, expect, it } from "vitest";

import { resolveHistoryAdapterRecordRenderState } from "../../src/bootstrap/history-adapter-host";

describe("bootstrap history adapter host", () => {
  it("resolves adapter badge and diagnostics html from diagnostics runtime", () => {
    const state = resolveHistoryAdapterRecordRenderState({
      localHistoryStore: { id: "store" },
      item: { id: "record-1" },
      historyAdapterDiagnosticsRuntime: {
        resolveHistoryAdapterParityStatus: () => "mismatch",
        resolveHistoryAdapterBadgeState: () => ({ hasBadge: true }),
        resolveHistoryAdapterDiagnosticsState: () => ({ hasDiagnostics: true }),
        resolveHistoryAdapterBadgeHtml: () => "<span>badge</span>",
        resolveHistoryAdapterDiagnosticsHtml: () => "<div>diag</div>"
      }
    });

    expect(state).toEqual({
      adapterBadgeHtml: "<span>badge</span>",
      adapterDiagnosticsHtml: "<div>diag</div>"
    });
  });

  it("returns empty html when diagnostics runtime dependencies are missing", () => {
    const state = resolveHistoryAdapterRecordRenderState({});
    expect(state).toEqual({
      adapterBadgeHtml: "",
      adapterDiagnosticsHtml: ""
    });
  });
});
