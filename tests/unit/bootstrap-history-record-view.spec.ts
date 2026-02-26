import { describe, expect, it } from "vitest";

import {
  resolveHistoryCatalogModeLabel,
  resolveHistoryDurationText,
  resolveHistoryEndedText,
  resolveHistoryModeText,
  resolveHistoryRecordHeadState
} from "../../src/bootstrap/history-record-view";

describe("bootstrap history record view", () => {
  it("resolves mode text with catalog priority", () => {
    expect(
      resolveHistoryModeText({
        modeKey: "standard_4x4_pow2_no_undo",
        modeFallback: "local",
        catalogLabel: "标准模式"
      })
    ).toBe("标准模式");
  });

  it("resolves catalog label from mode catalog and item mode_key", () => {
    const modeCatalog = {
      getMode(modeKey: string) {
        if (modeKey === "standard_4x4_pow2_no_undo") {
          return { label: "标准模式" };
        }
        return null;
      }
    };
    expect(
      resolveHistoryCatalogModeLabel(modeCatalog, {
        mode_key: "standard_4x4_pow2_no_undo"
      })
    ).toBe("标准模式");
    expect(resolveHistoryCatalogModeLabel({}, { mode_key: "standard_4x4_pow2_no_undo" })).toBe("");
  });

  it("formats duration text with fallback", () => {
    expect(resolveHistoryDurationText(3723000)).toBe("1h 2m 3s");
    expect(resolveHistoryDurationText(-1)).toBe("0s");
  });

  it("builds record head state", () => {
    const state = resolveHistoryRecordHeadState({
      modeKey: "standard_4x4_pow2_no_undo",
      modeFallback: "local",
      catalogLabel: "",
      score: 1024,
      bestTile: 128,
      durationMs: 65000,
      endedAt: null
    });

    expect(state.modeText).toBe("standard_4x4_pow2_no_undo");
    expect(state.score).toBe(1024);
    expect(state.bestTile).toBe(128);
    expect(state.durationText).toBe("1m 5s");
    expect(state.endedText).toBe("-");
  });

  it("falls back for invalid endedAt and numbers", () => {
    const ended = resolveHistoryEndedText(undefined);
    const state = resolveHistoryRecordHeadState({
      score: Number.NaN,
      bestTile: Number.NaN,
      durationMs: "oops",
      endedAt: "2026-02-25T10:00:00.000Z"
    });

    expect(ended).toBe("-");
    expect(state.score).toBe(0);
    expect(state.bestTile).toBe(0);
    expect(state.durationText).toBe("0s");
    expect(state.endedText.length).toBeGreaterThan(0);
  });
});
