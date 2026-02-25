import { describe, expect, it } from "vitest";

import {
  buildBurnInGateDecision,
  summarizeBurnInWindow,
  summarizeSustainedBurnIn,
  type BurnInRecordLike
} from "../../src/bridge/burnin-gate";

function makeRecords(statuses: Array<"match" | "mismatch" | "incomplete">): BurnInRecordLike[] {
  return statuses.map((status, index) => ({
    status,
    hasDiagnostics: index % 2 === 0
  }));
}

describe("bridge burn-in gate: buildBurnInGateDecision", () => {
  it("returns insufficient sample when comparable is below threshold", () => {
    const out = buildBurnInGateDecision({
      comparable: 10,
      mismatchRate: 0,
      minComparable: 50,
      maxMismatchRate: 1
    });

    expect(out.gateStatus).toBe("insufficient_sample");
    expect(out.passGate).toBeNull();
  });

  it("passes when mismatch rate is within threshold", () => {
    const out = buildBurnInGateDecision({
      comparable: 100,
      mismatchRate: 0.8,
      minComparable: 50,
      maxMismatchRate: 1
    });

    expect(out.gateStatus).toBe("pass");
    expect(out.passGate).toBe(true);
  });

  it("fails when mismatch rate exceeds threshold", () => {
    const out = buildBurnInGateDecision({
      comparable: 100,
      mismatchRate: 1.2,
      minComparable: 50,
      maxMismatchRate: 1
    });

    expect(out.gateStatus).toBe("fail");
    expect(out.passGate).toBe(false);
  });
});

describe("bridge burn-in gate: summarizeBurnInWindow", () => {
  it("summarizes match/mismatch/incomplete counts", () => {
    const out = summarizeBurnInWindow(
      makeRecords(["match", "mismatch", "incomplete", "match", "mismatch"]),
      { minComparable: 1, maxMismatchRate: 60 }
    );

    expect(out.recordCount).toBe(5);
    expect(out.withDiagnostics).toBe(3);
    expect(out.comparable).toBe(4);
    expect(out.match).toBe(2);
    expect(out.mismatch).toBe(2);
    expect(out.incomplete).toBe(1);
    expect(out.mismatchRate).toBe(50);
    expect(out.gateStatus).toBe("pass");
  });
});

describe("bridge burn-in gate: summarizeSustainedBurnIn", () => {
  it("passes when required windows all pass consecutively", () => {
    const out = summarizeSustainedBurnIn(
      makeRecords([
        "match",
        "match",
        "match",
        "match",
        "match",
        "match",
        "match",
        "match",
        "match"
      ]),
      {
        windowSize: 3,
        sustainedWindows: 3,
        minComparable: 3,
        maxMismatchRate: 1
      }
    );

    expect(out.sustainedEvaluatedWindows).toBe(3);
    expect(out.sustainedConsecutivePass).toBe(3);
    expect(out.sustainedGateStatus).toBe("pass");
    expect(out.sustainedPassGate).toBe(true);
  });

  it("fails when a required window has mismatch failures", () => {
    const out = summarizeSustainedBurnIn(
      makeRecords([
        "match",
        "match",
        "match",
        "mismatch",
        "mismatch",
        "mismatch",
        "match",
        "match",
        "match"
      ]),
      {
        windowSize: 3,
        sustainedWindows: 3,
        minComparable: 3,
        maxMismatchRate: 20
      }
    );

    expect(out.sustainedEvaluatedWindows).toBe(3);
    expect(out.sustainedConsecutivePass).toBe(1);
    expect(out.sustainedGateStatus).toBe("fail");
    expect(out.sustainedPassGate).toBe(false);
  });

  it("reports insufficient windows when data does not fill required windows", () => {
    const out = summarizeSustainedBurnIn(makeRecords(["match", "match", "match"]), {
      windowSize: 3,
      sustainedWindows: 2,
      minComparable: 3,
      maxMismatchRate: 1
    });

    expect(out.sustainedEvaluatedWindows).toBe(1);
    expect(out.sustainedGateStatus).toBe("insufficient_window");
    expect(out.sustainedPassGate).toBeNull();
  });

  it("reports insufficient sample when any required window lacks comparable sample", () => {
    const out = summarizeSustainedBurnIn(
      makeRecords([
        "match",
        "match",
        "incomplete",
        "match",
        "match",
        "match"
      ]),
      {
        windowSize: 3,
        sustainedWindows: 2,
        minComparable: 3,
        maxMismatchRate: 1
      }
    );

    expect(out.sustainedEvaluatedWindows).toBe(2);
    expect(out.sustainedGateStatus).toBe("insufficient_sample");
    expect(out.sustainedPassGate).toBeNull();
  });
});
