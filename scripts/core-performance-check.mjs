import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createCorePerformanceLifecycle,
  installCorePerformanceSignalHandlers,
} from "./core-performance/lifecycle.mjs";
import {
  DEFAULT_EVIDENCE_RELATIVE_PATH,
  PROJECT_ROOT,
  createCorePerformanceFailurePayload,
  parseCorePerformanceCliOptions,
  printPayload,
  runCorePerformanceGate,
  writeCorePerformanceEvidence,
} from "./core-performance/runner.mjs";

const __filename = fileURLToPath(import.meta.url);

function isDirectCliExecution() {
  return Boolean(
    process.argv[1] && path.resolve(process.argv[1]) === __filename,
  );
}

/**
 * @param {string[]} [argv]
 * @param {NodeJS.ProcessEnv} [env]
 * @param {{ failureEvidencePath?: string | null }} [options]
 */
async function runCorePerformanceCli(
  argv = process.argv.slice(2),
  env = process.env,
  { failureEvidencePath = null } = {},
) {
  const jsonRequested = argv.includes("--json");
  const lifecycle = createCorePerformanceLifecycle();
  const uninstallSignalHandlers = installCorePerformanceSignalHandlers({
    lifecycle,
  });
  let options = null;
  try {
    options = parseCorePerformanceCliOptions(argv, env);
    await runCorePerformanceGate({ ...options, lifecycle });
  } catch (error) {
    const evidencePath =
      options?.evidencePath ||
      failureEvidencePath ||
      path.join(PROJECT_ROOT, DEFAULT_EVIDENCE_RELATIVE_PATH);
    const payload = createCorePerformanceFailurePayload(error, {
      ...(options || {}),
      evidencePath,
    });
    try {
      await writeCorePerformanceEvidence(evidencePath, payload, {
        projectRoot: options?.projectRoot || PROJECT_ROOT,
      });
    } catch (writeError) {
      payload.violations.push({
        code: "core-performance-evidence-write-error",
        message:
          writeError instanceof Error ? writeError.message : String(writeError),
        scenario: null,
        metric: null,
        baseline: null,
        actual: null,
        threshold: null,
        path: evidencePath,
        exceptionStatus: "not-applicable",
        suggestedAction: "Make the evidence path writable and rerun the gate.",
      });
    }
    printPayload(payload, options?.json || jsonRequested);
    process.exitCode = 1;
  } finally {
    uninstallSignalHandlers();
    await lifecycle.cleanup("complete");
  }
}

if (isDirectCliExecution()) await runCorePerformanceCli();

export * from "./core-performance/browser.mjs";
export * from "./core-performance/context.mjs";
export * from "./core-performance/evaluate.mjs";
export * from "./core-performance/execution-profile.mjs";
export * from "./core-performance/lifecycle.mjs";
export * from "./core-performance/runner.mjs";
export * from "./core-performance/shared.mjs";
export { isDirectCliExecution, runCorePerformanceCli };
