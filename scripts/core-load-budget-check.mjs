import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createCoreLoadFailurePayload,
  parseCoreLoadBudgetCliOptions,
  printCoreLoadBudgetPayload,
  runCoreLoadBudgetCheck,
} from "./core-load-budget/runner.mjs";

const __filename = fileURLToPath(import.meta.url);

function isDirectCliExecution() {
  return Boolean(
    process.argv[1] && path.resolve(process.argv[1]) === __filename,
  );
}

async function runCoreLoadBudgetCli(
  argv = process.argv.slice(2),
  env = process.env,
) {
  const jsonRequested = argv.includes("--json");
  let options = null;
  try {
    options = parseCoreLoadBudgetCliOptions(argv, env);
    await runCoreLoadBudgetCheck(options);
  } catch (error) {
    const payload = createCoreLoadFailurePayload(error, options || {});
    printCoreLoadBudgetPayload(payload, options?.json || jsonRequested);
    process.exitCode = 1;
  }
}

if (isDirectCliExecution()) await runCoreLoadBudgetCli();

export * from "./core-load-budget/analyze.mjs";
export * from "./core-load-budget/evaluate.mjs";
export * from "./core-load-budget/runner.mjs";
export * from "./core-load-budget/shared.mjs";
export { isDirectCliExecution, runCoreLoadBudgetCli };
