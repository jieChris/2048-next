import { describe, expect, it } from "vitest";

import { validateArchitectureBudgetExceptions } from "../../scripts/architecture-budget-check.mjs";

function exception(expiresOn: string) {
  return {
    path: "src/core/hotspot.ts",
    metric: "lines",
    allowed: 110,
    task: "09-04-example",
    reason: "temporary adapter",
    createdOn: "2026-09-04",
    expiresOn,
    exitCondition: "extract the adapter owner",
  };
}

describe("architecture exception inclusive date boundary", () => {
  it("accepts exactly 14 inclusive UTC dates", () => {
    const result = validateArchitectureBudgetExceptions(
      { schemaVersion: 1, exceptions: [exception("2026-09-17")] },
      new Date("2026-09-04T00:00:00Z"),
    );
    expect(result.violations).toEqual([]);
  });

  it("rejects 15 inclusive UTC dates", () => {
    const result = validateArchitectureBudgetExceptions(
      { schemaVersion: 1, exceptions: [exception("2026-09-18")] },
      new Date("2026-09-04T00:00:00Z"),
    );
    expect(result.violations).toContainEqual(
      expect.objectContaining({ code: "invalid-exception" }),
    );
  });
});
