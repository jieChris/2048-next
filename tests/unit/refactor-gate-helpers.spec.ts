import { describe, expect, it } from "vitest";

import {
  DEFAULT_CHROMIUM_VALIDATE_TIMEOUT_MS,
  MAX_STEP_OUTPUT_TAIL_LINES,
  DEFAULT_STEP_OUTPUT_TAIL_LINES,
  DEFAULT_STEP_TIMEOUT_MS,
  STEP_OUTPUT_TAIL_LINES_ENV_KEY,
  STEP_TIMEOUT_DEFAULT_ENV_KEY,
  STEP_TIMEOUT_ENV_KEY_BY_NAME,
  createSummaryPayload,
  parsePositiveInteger,
  parseSmokeScriptArg,
  renderSummaryMarkdown,
  resolveHeadlessShellPathFromChromiumPath,
  resolveLogMode,
  resolveStepOutputTailLines,
  resolveStepTimeoutMs,
  sanitizeStepLogFileName,
  validateChromiumExecutable
} from "../../scripts/refactor-gate.mjs";

describe("refactor-gate helpers", () => {
  it("parses --smoke-script argument", () => {
    expect(parseSmokeScriptArg(["--foo=bar", "--smoke-script=test:smoke:runtime-contract"])).toBe(
      "test:smoke:runtime-contract"
    );
    expect(parseSmokeScriptArg(["--foo=bar"])).toBeNull();
  });

  it("resolves headless-shell path from chromium executable path", () => {
    const chromiumPath =
      "/home/user/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome";
    expect(resolveHeadlessShellPathFromChromiumPath(chromiumPath)).toContain(
      "chromium_headless_shell-1234"
    );
    expect(resolveHeadlessShellPathFromChromiumPath("")).toBeNull();
  });

  it("validates executable success and timeout paths", () => {
    const success = validateChromiumExecutable(process.execPath);
    expect(success.ok).toBe(true);
    expect(success.timedOut).toBe(false);

    const timeout = validateChromiumExecutable(process.execPath, {
      args: ["-e", "setTimeout(() => {}, 10000)"],
      timeoutMs: 20
    });
    expect(timeout.ok).toBe(false);
    expect(timeout.timedOut).toBe(true);
  });

  it("resolves step timeout budgets", () => {
    const originalDefault = process.env[STEP_TIMEOUT_DEFAULT_ENV_KEY];
    const originalSmoke = process.env[STEP_TIMEOUT_ENV_KEY_BY_NAME.smoke];
    try {
      delete process.env[STEP_TIMEOUT_DEFAULT_ENV_KEY];
      delete process.env[STEP_TIMEOUT_ENV_KEY_BY_NAME.smoke];
      expect(resolveStepTimeoutMs("smoke")).toBeGreaterThan(0);
      expect(resolveStepTimeoutMs("unknown-step")).toBe(DEFAULT_STEP_TIMEOUT_MS);
      expect(DEFAULT_CHROMIUM_VALIDATE_TIMEOUT_MS).toBe(30_000);
    } finally {
      if (typeof originalDefault === "string") {
        process.env[STEP_TIMEOUT_DEFAULT_ENV_KEY] = originalDefault;
      } else {
        delete process.env[STEP_TIMEOUT_DEFAULT_ENV_KEY];
      }
      if (typeof originalSmoke === "string") {
        process.env[STEP_TIMEOUT_ENV_KEY_BY_NAME.smoke] = originalSmoke;
      } else {
        delete process.env[STEP_TIMEOUT_ENV_KEY_BY_NAME.smoke];
      }
    }
  });

  it("supports step/default timeout overrides via environment variables", () => {
    const originalDefault = process.env[STEP_TIMEOUT_DEFAULT_ENV_KEY];
    const smokeEnvKey = STEP_TIMEOUT_ENV_KEY_BY_NAME.smoke;
    const originalSmoke = process.env[smokeEnvKey];

    try {
      process.env[STEP_TIMEOUT_DEFAULT_ENV_KEY] = "12345";
      process.env[smokeEnvKey] = "54321";

      expect(resolveStepTimeoutMs("smoke")).toBe(54321);
      expect(resolveStepTimeoutMs("unknown-step")).toBe(12345);

      process.env[STEP_TIMEOUT_DEFAULT_ENV_KEY] = "invalid";
      delete process.env[smokeEnvKey];
      expect(resolveStepTimeoutMs("unknown-step")).toBe(DEFAULT_STEP_TIMEOUT_MS);
    } finally {
      if (typeof originalDefault === "string") {
        process.env[STEP_TIMEOUT_DEFAULT_ENV_KEY] = originalDefault;
      } else {
        delete process.env[STEP_TIMEOUT_DEFAULT_ENV_KEY];
      }
      if (typeof originalSmoke === "string") {
        process.env[smokeEnvKey] = originalSmoke;
      } else {
        delete process.env[smokeEnvKey];
      }
    }
  });

  it("parses positive integers only", () => {
    expect(parsePositiveInteger("42")).toBe(42);
    expect(parsePositiveInteger("0")).toBeNull();
    expect(parsePositiveInteger("-1")).toBeNull();
    expect(parsePositiveInteger("abc")).toBeNull();
  });

  it("resolves log mode and default tail lines", () => {
    expect(resolveLogMode("verbose")).toBe("verbose");
    expect(resolveLogMode("VERBOSE")).toBe("verbose");
    expect(resolveLogMode("compact")).toBe("compact");
    expect(resolveLogMode("unknown")).toBe("compact");
    expect(DEFAULT_STEP_OUTPUT_TAIL_LINES).toBe(80);
    expect(STEP_OUTPUT_TAIL_LINES_ENV_KEY).toBe("REFACTOR_GATE_OUTPUT_TAIL_LINES");
    expect(resolveStepOutputTailLines("120")).toBe(120);
    expect(resolveStepOutputTailLines("9999")).toBe(MAX_STEP_OUTPUT_TAIL_LINES);
    expect(resolveStepOutputTailLines("0")).toBe(DEFAULT_STEP_OUTPUT_TAIL_LINES);
    expect(resolveStepOutputTailLines("bad")).toBe(DEFAULT_STEP_OUTPUT_TAIL_LINES);
  });

  it("sanitizes step log file names", () => {
    expect(sanitizeStepLogFileName("smoke")).toBe("smoke.latest.log");
    expect(sanitizeStepLogFileName("entry-manifest/audit")).toBe(
      "entry-manifest_audit.latest.log"
    );
  });

  it("builds and renders summary payload", () => {
    const summary = createSummaryPayload({
      results: [
        {
          name: "unit",
          ok: true,
          code: 0,
          signal: null,
          timeoutMs: 300000,
          durationMs: 1200,
          logPath: null
        },
        {
          name: "build",
          ok: false,
          code: 1,
          signal: null,
          timeoutMs: 180000,
          durationMs: 900,
          logPath: null
        }
      ],
      totalMs: 2100,
      smokeScriptName: "test:smoke:runtime-contract",
      logMode: "compact",
      outputTailLines: 64
    });

    expect(summary.status).toBe("failed");
    expect(summary.failedStep).toBe("build");
    expect(summary.steps).toHaveLength(2);

    const markdown = renderSummaryMarkdown(summary);
    expect(markdown).toContain("# Refactor Gate Summary");
    expect(markdown).toContain("| build | FAIL |");
    expect(markdown).toContain("- OutputTailLines: 64");
  });
});
