import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createArchitectureBudgetFailurePayload,
  parseArchitectureBudgetCliOptions,
  printArchitectureBudgetPayload,
  runArchitectureBudgetCheck,
} from "./architecture-budget/runner.mjs";

const __filename = fileURLToPath(import.meta.url);

function isDirectCliExecution() {
  return Boolean(
    process.argv[1] && path.resolve(process.argv[1]) === __filename,
  );
}

async function runArchitectureBudgetCli(argv = process.argv.slice(2)) {
  const jsonRequested = argv.includes("--json");
  let options = null;
  try {
    options = parseArchitectureBudgetCliOptions(argv);
    await runArchitectureBudgetCheck(options);
  } catch (error) {
    const payload = createArchitectureBudgetFailurePayload(
      error,
      options || {},
    );
    printArchitectureBudgetPayload(payload, options?.json || jsonRequested);
    process.exitCode = 1;
  }
}

if (isDirectCliExecution()) {
  await runArchitectureBudgetCli();
}

export * from "./architecture-budget/core.mjs";
export * from "./architecture-budget/runner.mjs";
export * from "./architecture-budget/source-metrics.mjs";
export { isDirectCliExecution, runArchitectureBudgetCli };
