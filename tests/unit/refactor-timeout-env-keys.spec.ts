import { describe, expect, it } from "vitest";

import {
  DEFAULT_TIMEOUT_ENV_KEY,
  STEP_TIMEOUT_ENV_KEY_BY_NAME,
  normalizeTimeoutSteps,
  parseCliArgs,
  resolveTimeoutBudgetEnvKeys
} from "../../scripts/refactor-timeout-env-keys.mjs";

describe("refactor-timeout-env-keys helpers", () => {
  it("normalizes comma separated timeout steps", () => {
    expect(normalizeTimeoutSteps("unit, smoke , build,,")).toEqual(["unit", "smoke", "build"]);
    expect(normalizeTimeoutSteps(["unit", "  smoke  ", ""])).toEqual(["unit", "smoke"]);
    expect(normalizeTimeoutSteps("")).toEqual([]);
  });

  it("maps timeout steps to unique budget env keys", () => {
    const keys = resolveTimeoutBudgetEnvKeys("unit,unit,smoke,unknown-step,smoke");
    expect(keys).toEqual([
      STEP_TIMEOUT_ENV_KEY_BY_NAME.unit,
      STEP_TIMEOUT_ENV_KEY_BY_NAME.smoke,
      DEFAULT_TIMEOUT_ENV_KEY
    ]);
  });

  it("returns default key for empty input unless disabled", () => {
    expect(resolveTimeoutBudgetEnvKeys("")).toEqual([DEFAULT_TIMEOUT_ENV_KEY]);
    expect(resolveTimeoutBudgetEnvKeys("", { includeDefaultFallback: false })).toEqual([]);
  });

  it("parses --steps argument from cli args", () => {
    expect(parseCliArgs(["--foo=bar", "--steps=unit,smoke"]).steps).toBe("unit,smoke");
    expect(parseCliArgs(["--foo=bar"]).steps).toBe("");
  });
});
