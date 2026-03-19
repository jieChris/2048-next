import { describe, expect, it } from "vitest";

import {
  REFACTOR_PROGRESS_TAIL_HISTORY_LIMIT,
  TAIL_LINES_HIGH_THRESHOLD,
  TAIL_LINES_LOW_THRESHOLD,
  appendTailHistoryEntry,
  createTailHistoryEntry,
  deriveRefactorGateSnapshot,
  parsePositiveInteger,
  resolveTailLinesBand
} from "../../scripts/refactor-progress-report.mjs";

describe("refactor-progress-report helpers", () => {
  it("parses positive integers only", () => {
    expect(parsePositiveInteger("120")).toBe(120);
    expect(parsePositiveInteger("0")).toBeNull();
    expect(parsePositiveInteger("-1")).toBeNull();
    expect(parsePositiveInteger("abc")).toBeNull();
    expect(parsePositiveInteger(42)).toBe(42);
  });

  it("resolves tail lines band by threshold", () => {
    expect(TAIL_LINES_LOW_THRESHOLD).toBe(80);
    expect(TAIL_LINES_HIGH_THRESHOLD).toBe(180);
    expect(resolveTailLinesBand("79")).toBe("low");
    expect(resolveTailLinesBand("80")).toBe("balanced");
    expect(resolveTailLinesBand("180")).toBe("balanced");
    expect(resolveTailLinesBand("181")).toBe("high");
    expect(resolveTailLinesBand("bad")).toBe("unknown");
  });

  it("derives refactor gate snapshot with failed-step duration and slowest step", () => {
    const snapshot = deriveRefactorGateSnapshot({
      outputTailLines: 120,
      failedStep: "smoke",
      steps: [
        { name: "unit", durationMs: 1200 },
        { name: "smoke", durationMs: 3400 },
        { name: "build", durationMs: 800 }
      ]
    });

    expect(snapshot.available).toBe(true);
    expect(snapshot.outputTailLines).toBe(120);
    expect(snapshot.tailLinesBand).toBe("balanced");
    expect(snapshot.failedStep).toBe("smoke");
    expect(snapshot.failedStepDurationMs).toBe(3400);
    expect(snapshot.slowestStep).toBe("smoke");
    expect(snapshot.slowestStepDurationMs).toBe(3400);
  });

  it("returns unavailable for invalid summary payload", () => {
    expect(deriveRefactorGateSnapshot(null)).toEqual({ available: false });
  });

  it("creates tail history entry from snapshot fields", () => {
    const entry = createTailHistoryEntry(
      {
        available: true,
        outputTailLines: 120,
        tailLinesBand: "balanced",
        failedStep: "none",
        failedStepDurationMs: null,
        slowestStep: "smoke",
        slowestStepDurationMs: 3400
      },
      "2026-03-18T00:00:00.000Z"
    );

    expect(entry).toEqual({
      generatedAt: "2026-03-18T00:00:00.000Z",
      outputTailLines: 120,
      tailLinesBand: "balanced",
      failedStep: "none",
      failedStepDurationMs: null,
      slowestStep: "smoke",
      slowestStepDurationMs: 3400
    });
  });

  it("caps tail history size by configured limit", () => {
    expect(REFACTOR_PROGRESS_TAIL_HISTORY_LIMIT).toBe(30);
    const initial = Array.from({ length: 30 }, (_, i) => ({ generatedAt: String(i) }));
    const next = appendTailHistoryEntry(initial, { generatedAt: "30" }, 30);

    expect(next).toHaveLength(30);
    expect(next[0]).toEqual({ generatedAt: "1" });
    expect(next[29]).toEqual({ generatedAt: "30" });
  });
});
