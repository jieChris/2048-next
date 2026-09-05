import { describe, expect, it } from "vitest";

import {
  DEFAULT_TIMEOUT_ENV_KEY,
  STEP_TIMEOUT_ENV_KEY_BY_NAME,
  normalizeTimeoutSteps,
  parseCliArgs,
  resolveTimeoutBudgetEnvKeys,
} from "../../scripts/refactor-timeout-env-keys.mjs";

describe("refactor-timeout-env-keys helpers", () => {
  it("normalizes comma separated timeout steps", () => {
    expect(
      normalizeTimeoutSteps("unit, smoke , build, core-performance,,"),
    ).toEqual(["unit", "smoke", "build", "core-performance"]);
    expect(normalizeTimeoutSteps(["unit", "  smoke  ", ""])).toEqual([
      "unit",
      "smoke",
    ]);
    expect(normalizeTimeoutSteps("")).toEqual([]);
  });

  it("maps timeout steps to unique budget env keys", () => {
    const keys = resolveTimeoutBudgetEnvKeys(
      "legacy-boundary-audit,contracts-matrix-audit,unit,unit,smoke,core-performance,unknown-step,smoke",
    );
    expect(keys).toEqual([
      STEP_TIMEOUT_ENV_KEY_BY_NAME["legacy-boundary-audit"],
      STEP_TIMEOUT_ENV_KEY_BY_NAME["contracts-matrix-audit"],
      STEP_TIMEOUT_ENV_KEY_BY_NAME.unit,
      STEP_TIMEOUT_ENV_KEY_BY_NAME.smoke,
      STEP_TIMEOUT_ENV_KEY_BY_NAME["core-performance"],
      DEFAULT_TIMEOUT_ENV_KEY,
    ]);
  });

  it("returns default key for empty input unless disabled", () => {
    expect(resolveTimeoutBudgetEnvKeys("")).toEqual([DEFAULT_TIMEOUT_ENV_KEY]);
    expect(
      resolveTimeoutBudgetEnvKeys("", { includeDefaultFallback: false }),
    ).toEqual([]);
  });

  it("parses --steps argument from cli args", () => {
    expect(parseCliArgs(["--foo=bar", "--steps=unit,smoke"]).steps).toBe(
      "unit,smoke",
    );
    expect(parseCliArgs(["--foo=bar"]).steps).toBe("");
  });
});
