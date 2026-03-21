import { describe, expect, it } from "vitest";

import {
  ensureContainsSnippets,
  ensureJobNeedsDependency,
  extractWorkflowJobBlock,
  findMissingSnippets,
  verifyRefactorGateSupportsSmokeScriptParamContent,
  verifySmokeWorkflowShardingContent
} from "../../scripts/release-readiness-check.mjs";

describe("release-readiness-check helpers", () => {
  it("finds missing snippets from content", () => {
    const content = "alpha\nbeta\ngamma";
    expect(findMissingSnippets(content, ["alpha", "gamma"])).toEqual([]);
    expect(findMissingSnippets(content, ["alpha", "delta"])).toEqual(["delta"]);
  });

  it("ensures required snippets exist", () => {
    expect(() => ensureContainsSnippets("alpha beta", ["alpha"], "demo")).not.toThrow();
    expect(() => ensureContainsSnippets("alpha beta", ["missing"], "demo")).toThrow(
      /demo missing required snippet/
    );
  });

  it("extracts workflow job blocks and validates needs dependencies", () => {
    const workflow = [
      "jobs:",
      "  refactor-gate:",
      "    runs-on: ubuntu-latest",
      "  diagnostics-index:",
      "    needs:",
      "      - refactor-gate",
      "      - smoke",
      "  release-ready:",
      "    needs:",
      "      - refactor-gate"
    ].join("\n");

    const diagnosticsBlock = extractWorkflowJobBlock(workflow, "diagnostics-index");
    expect(diagnosticsBlock).toContain("diagnostics-index:");
    expect(diagnosticsBlock).toContain("- refactor-gate");
    expect(extractWorkflowJobBlock(workflow, "missing-job")).toBeNull();

    expect(() =>
      ensureJobNeedsDependency(workflow, "diagnostics-index", "refactor-gate")
    ).not.toThrow();
    expect(() => ensureJobNeedsDependency(workflow, "release-ready", "smoke")).toThrow(
      /missing dependency/
    );
  });

  it("validates smoke workflow sharding + diagnostics topology contract", () => {
    const workflow = [
      "jobs:",
      "  refactor-gate:",
      "    env:",
      "      REFACTOR_GATE_TIMEOUT_DEFAULT_MS: \"360000\"",
      "      REFACTOR_GATE_TIMEOUT_UNIT_MS: \"420000\"",
      "      REFACTOR_GATE_TIMEOUT_SMOKE_MS: \"420000\"",
      "      REFACTOR_GATE_TIMEOUT_BUILD_MS: \"240000\"",
      "      REFACTOR_GATE_OUTPUT_TAIL_LINES: \"80\"",
      "    steps:",
      "      - run: npm run verify:refactor:ci",
      "      - name: Upload refactor gate summary artifact",
      "        with:",
      "          name: refactor-gate-summary",
      "          path: artifacts/refactor-gate-summary.md",
      "      - name: Publish refactor gate summary",
      "  smoke:",
      "    strategy:",
      "      matrix:",
      "        suite:",
      "          - history",
      "          - index-ui",
      "          - pages",
      "    steps:",
      "      - run: npm run test:smoke:${{ matrix.suite }}",
      "  diagnostics-index:",
      "    needs:",
      "      - refactor-gate",
      "    steps:",
      "      - name: Download refactor gate summary artifact",
      "      - name: Extract refactor gate summary fields",
      "      - run: SUMMARY_JSON=\"refactor-gate-summary/artifacts/refactor-gate-summary.json\"",
      "    env:",
      "      REFACTOR_GATE_RESULT: ${{ needs['refactor-gate'].result }}",
      "      REF_GATE_FAILED_STEP: ${{ steps.refactor-summary.outputs.failed_step }}",
      "      REF_GATE_HAS_TIMEOUT: ${{ steps.refactor-summary.outputs.has_timeout }}",
      "      REF_GATE_TIMEOUT_STEPS: ${{ steps.refactor-summary.outputs.timeout_steps }}",
      "      REF_GATE_TAIL_LINES_BAND: ${{ steps.refactor-summary.outputs.tail_lines_band }}",
      "    steps:",
      "      - run: echo \"tail_lines_band=balanced\"",
      "      - run: echo \"tail_lines_band: tailLinesBand\"",
      "      - run: echo \"| Refactor Gate | ${REFACTOR_GATE_RESULT} |\"",
      "      - run: echo \"| failed_step | ${REF_GATE_FAILED_STEP} |\"",
      "      - run: echo \"| has_timeout | ${REF_GATE_HAS_TIMEOUT} |\"",
      "      - run: echo \"| timeout_steps | ${REF_GATE_TIMEOUT_STEPS} |\"",
      "      - run: echo \"| tail_lines_band | ${REF_GATE_TAIL_LINES_BAND} |\"",
      "      - run: timeout_step_env_keys=\"$(node scripts/refactor-timeout-env-keys.mjs --steps=\"${REF_GATE_TIMEOUT_STEPS}\")\"",
      "      - run: while IFS= read -r timeout_key; do",
      "      - run: echo \"Timeout tuning key(s):\"",
      "      - run: echo \"   - \\`${timeout_key}\\`\";",
      "      - run: echo \"6. Tail lines advisory: \\`REFACTOR_GATE_OUTPUT_TAIL_LINES=${REF_GATE_OUTPUT_TAIL_LINES}\\` may be too short for failed-step diagnostics; consider increasing and compare over 3-5 runs.\"",
      "  release-ready:",
      "    needs:",
      "      - refactor-gate",
      "    steps:",
      "      - run: npm run verify:release-ready",
      "      - run: npm run report:refactor-progress"
    ].join("\n");

    expect(() => verifySmokeWorkflowShardingContent(workflow)).not.toThrow();
    expect(() =>
      verifySmokeWorkflowShardingContent(workflow.replace("Timeout tuning key(s):", "MISSING"))
    ).toThrow(/smoke workflow missing required snippet/);
  });

  it("validates refactor-gate timeout and smoke-script contract", () => {
    const gate = [
      "const smokeScript = smokeScriptArg || \"test:smoke\";",
      "const STEP_TIMEOUT_DEFAULT_ENV_KEY = \"REFACTOR_GATE_TIMEOUT_DEFAULT_MS\";",
      "  \"legacy-boundary-audit\": \"REFACTOR_GATE_TIMEOUT_LEGACY_BOUNDARY_AUDIT_MS\",",
      "const STEP_OUTPUT_TAIL_LINES_ENV_KEY = \"REFACTOR_GATE_OUTPUT_TAIL_LINES\";",
      "const MAX_STEP_OUTPUT_TAIL_LINES = 240;",
      "const STEP_TIMEOUT_ENV_KEY_BY_NAME = {",
      "  \"legacy-boundary-audit\": \"REFACTOR_GATE_TIMEOUT_LEGACY_BOUNDARY_AUDIT_MS\",",
      "  unit: \"REFACTOR_GATE_TIMEOUT_UNIT_MS\",",
      "  smoke: \"REFACTOR_GATE_TIMEOUT_SMOKE_MS\",",
      "  build: \"REFACTOR_GATE_TIMEOUT_BUILD_MS\"",
      "};",
      "const steps = [{ name: \"legacy-boundary-audit\" }];",
      "function resolveStepOutputTailLines(value) { const parsed = value; return Math.min(parsed, MAX_STEP_OUTPUT_TAIL_LINES); }",
      "function resolveStepTimeoutMs(stepName) { return stepName; }",
      "const smokeArg = \"--smoke-script=test:smoke:ci\";",
      "const step = { cmd: \"npm\", args: [\"run\", smokeScript] };"
    ].join("\n");

    expect(() => verifyRefactorGateSupportsSmokeScriptParamContent(gate)).not.toThrow();
    expect(() =>
      verifyRefactorGateSupportsSmokeScriptParamContent(
        gate.replace("REFACTOR_GATE_TIMEOUT_SMOKE_MS", "TIMEOUT_SMOKE")
      )
    ).toThrow(/refactor gate missing required snippet/);
  });
});
