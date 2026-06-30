import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "docs/RELEASE_STABLE_CHECKLIST.zh-CN.md",
  "docs/baseline/CONTRACTS_REPLAY_IMPORT_EXPORT_MATRIX.md",
  ".github/workflows/smoke.yml",
  "scripts/refactor-gate.mjs",
  "scripts/contracts-matrix-audit.mjs",
  "scripts/refactor-timeout-env-keys.mjs",
  "scripts/production-dist-audit.mjs",
  "scripts/resource-budget-check.mjs",
  ".github/workflows/deploy-self-hosted.yml"
];

const REQUIRED_NPM_SCRIPTS = [
  "audit:production-dist",
  "audit:resource-budget",
  "verify:refactor:ci",
  "verify:prepush",
  "verify:release-ready",
  "verify:release",
  "verify:release-dist",
  "verify:submit-ready",
  "test:smoke:ci",
  "report:refactor-progress",
  "report:commit-split-check",
  "report:commit-batch"
];

const SMOKE_WORKFLOW_REQUIRED_SNIPPETS = [
  "refactor-gate:",
  "REFACTOR_GATE_TIMEOUT_DEFAULT_MS",
  "REFACTOR_GATE_TIMEOUT_UNIT_MS",
  "REFACTOR_GATE_TIMEOUT_SMOKE_MS",
  "REFACTOR_GATE_TIMEOUT_BUILD_MS",
  "REFACTOR_GATE_OUTPUT_TAIL_LINES",
  "npm run verify:refactor:ci",
  "name: refactor-gate-summary",
  "artifacts/refactor-gate-summary.md",
  "Publish refactor gate summary",
  "Download refactor gate summary artifact",
  "Extract refactor gate summary fields",
  "refactor-gate-summary/artifacts/refactor-gate-summary.json",
  "| failed_step | ${REF_GATE_FAILED_STEP} |",
  "| has_timeout | ${REF_GATE_HAS_TIMEOUT} |",
  "| timeout_steps | ${REF_GATE_TIMEOUT_STEPS} |",
  "| tail_lines_band | ${REF_GATE_TAIL_LINES_BAND} |",
  "node scripts/refactor-timeout-env-keys.mjs --steps=\"${REF_GATE_TIMEOUT_STEPS}\"",
  "while IFS= read -r timeout_key; do",
  "Timeout tuning key(s):",
  "echo \"   - \\`${timeout_key}\\`\";",
  "REF_GATE_HAS_TIMEOUT: ${{ steps.refactor-summary.outputs.has_timeout }}",
  "REF_GATE_TIMEOUT_STEPS: ${{ steps.refactor-summary.outputs.timeout_steps }}",
  "REF_GATE_TAIL_LINES_BAND: ${{ steps.refactor-summary.outputs.tail_lines_band }}",
  "tail_lines_band: tailLinesBand",
  "Tail lines advisory:",
  "REFACTOR_GATE_OUTPUT_TAIL_LINES=${REF_GATE_OUTPUT_TAIL_LINES}",
  "matrix:",
  "- history",
  "- index-ui",
  "- pages",
  "npm run test:smoke:${{ matrix.suite }}",
  "diagnostics-index:",
  "REFACTOR_GATE_RESULT: ${{ needs['refactor-gate'].result }}",
  "| Refactor Gate | ${REFACTOR_GATE_RESULT} |",
  "release-ready:",
  "npm run verify:release-ready",
  "npm run report:refactor-progress"
];

const REFACTOR_GATE_REQUIRED_SNIPPETS = [
  "--smoke-script=",
  "const smokeScript =",
  "npm\", args: [\"run\", smokeScript]",
  "STEP_TIMEOUT_DEFAULT_ENV_KEY = \"REFACTOR_GATE_TIMEOUT_DEFAULT_MS\"",
  "\"REFACTOR_GATE_TIMEOUT_LEGACY_BOUNDARY_AUDIT_MS\"",
  "\"REFACTOR_GATE_TIMEOUT_CONTRACTS_MATRIX_AUDIT_MS\"",
  "\"REFACTOR_GATE_TIMEOUT_UNIT_MS\"",
  "\"REFACTOR_GATE_TIMEOUT_SMOKE_MS\"",
  "\"REFACTOR_GATE_TIMEOUT_BUILD_MS\"",
  "legacy-boundary-audit",
  "contracts-matrix-audit",
  "STEP_OUTPUT_TAIL_LINES_ENV_KEY = \"REFACTOR_GATE_OUTPUT_TAIL_LINES\"",
  "MAX_STEP_OUTPUT_TAIL_LINES",
  "Math.min(parsed, MAX_STEP_OUTPUT_TAIL_LINES)",
  "resolveStepTimeoutMs"
];

const PACKAGE_SCRIPT_COMMAND_REQUIRED_SNIPPETS = {
  "verify:release-dist": [
    "npm run build",
    "npm run audit:production-dist",
    "npm run audit:resource-budget"
  ],
  "test:smoke:critical": [
    "tests/smoke/pages-theme-entry-guard.smoke.spec.ts"
  ]
};

const DEPLOY_WORKFLOW_REQUIRED_SNIPPETS = [
  "Verify release readiness",
  "npm run verify:release-ready",
  "Build dist",
  "npm run build",
  "Audit production dist",
  "npm run audit:production-dist",
  "Audit resource budget",
  "npm run audit:resource-budget",
  "Prepare release metadata",
  "Archive dist bundle",
  "Upload release package"
];

const DEPLOY_WORKFLOW_REQUIRED_ORDER = [
  "npm run verify:release-ready",
  "npm run build",
  "npm run audit:production-dist",
  "npm run audit:resource-budget",
  "Prepare release metadata",
  "Archive dist bundle",
  "Upload release package"
];

function fail(message) {
  throw new Error(message);
}

function escapeRegexLiteral(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findMissingSnippets(content, snippets) {
  const source = String(content || "");
  return snippets.filter((snippet) => !source.includes(snippet));
}

function ensureContainsSnippets(content, snippets, scope) {
  const missing = findMissingSnippets(content, snippets);
  if (missing.length > 0) {
    fail(`[verify:release-ready] ${scope} missing required snippet: ${missing[0]}`);
  }
}

function ensureSnippetOrder(content, snippets, scope) {
  const source = String(content || "");
  let cursor = -1;
  for (const snippet of snippets) {
    const nextIndex = source.indexOf(snippet, cursor + 1);
    if (nextIndex < 0) {
      if (source.includes(snippet)) {
        fail(`[verify:release-ready] ${scope} snippet order mismatch: ${snippet}`);
      }
      fail(`[verify:release-ready] ${scope} missing required snippet: ${snippet}`);
    }
    cursor = nextIndex;
  }
}

function extractWorkflowJobBlock(workflowContent, jobName) {
  const source = String(workflowContent || "");
  const escapedJobName = escapeRegexLiteral(jobName);
  const pattern = new RegExp(
    `\\n\\s{2}${escapedJobName}:\\n([\\s\\S]*?)(?=\\n\\s{2}[A-Za-z0-9_-]+:\\n|$)`
  );
  const match = source.match(pattern);
  return match ? match[0] : null;
}

function ensureJobNeedsDependency(workflowContent, jobName, dependencyName) {
  const jobBlock = extractWorkflowJobBlock(workflowContent, jobName);
  if (!jobBlock) {
    fail(`[verify:release-ready] smoke workflow missing job: ${jobName}`);
  }
  const dependencyLine = `- ${dependencyName}`;
  if (!jobBlock.includes(dependencyLine)) {
    fail(
      `[verify:release-ready] smoke workflow job "${jobName}" missing dependency: ${dependencyName}`
    );
  }
}

async function readText(relativePath) {
  const filePath = path.resolve(projectRoot, relativePath);
  return readFile(filePath, "utf8");
}

async function verifyFilesExist() {
  for (const relativePath of REQUIRED_FILES) {
    try {
      const content = await readText(relativePath);
      if (!String(content || "").trim()) {
        fail(`[verify:release-ready] required file is empty: ${relativePath}`);
      }
    } catch (err) {
      fail(
        `[verify:release-ready] missing required file: ${relativePath} (${String(
          err && err.message ? err.message : err
        )})`
      );
    }
  }
}

async function verifyPackageScripts() {
  const packageJsonText = await readText("package.json");
  const packageJson = JSON.parse(packageJsonText);
  const scripts = packageJson && packageJson.scripts ? packageJson.scripts : {};
  for (const scriptName of REQUIRED_NPM_SCRIPTS) {
    if (!Object.prototype.hasOwnProperty.call(scripts, scriptName)) {
      fail(`[verify:release-ready] missing npm script: ${scriptName}`);
    }
  }
  verifyPackageScriptCommandsContent(scripts);
}

function verifyPackageScriptCommandsContent(scripts) {
  const availableScripts = scripts && typeof scripts === "object" ? scripts : {};
  for (const [scriptName, snippets] of Object.entries(PACKAGE_SCRIPT_COMMAND_REQUIRED_SNIPPETS)) {
    const command = String(availableScripts[scriptName] || "");
    for (const snippet of snippets) {
      if (!command.includes(snippet)) {
        fail(
          `[verify:release-ready] package script "${scriptName}" missing required snippet: ${snippet}`
        );
      }
    }
    ensureSnippetOrder(command, snippets, `package script "${scriptName}"`);
  }
}

function verifySmokeWorkflowShardingContent(workflowContent) {
  ensureContainsSnippets(
    workflowContent,
    SMOKE_WORKFLOW_REQUIRED_SNIPPETS,
    "smoke workflow"
  );
  ensureJobNeedsDependency(workflowContent, "diagnostics-index", "refactor-gate");
  ensureJobNeedsDependency(workflowContent, "release-ready", "refactor-gate");
}

async function verifySmokeWorkflowSharding() {
  const workflow = await readText(".github/workflows/smoke.yml");
  verifySmokeWorkflowShardingContent(workflow);
}

function verifyRefactorGateSupportsSmokeScriptParamContent(gateContent) {
  ensureContainsSnippets(
    gateContent,
    REFACTOR_GATE_REQUIRED_SNIPPETS,
    "refactor gate"
  );
}

async function verifyRefactorGateSupportsSmokeScriptParam() {
  const gate = await readText("scripts/refactor-gate.mjs");
  verifyRefactorGateSupportsSmokeScriptParamContent(gate);
}

function verifyDeployWorkflowProductionDistAuditContent(workflowContent) {
  ensureContainsSnippets(
    workflowContent,
    DEPLOY_WORKFLOW_REQUIRED_SNIPPETS,
    "deploy workflow"
  );
  ensureSnippetOrder(
    workflowContent,
    DEPLOY_WORKFLOW_REQUIRED_ORDER,
    "deploy workflow"
  );
}

async function verifyDeployWorkflowProductionDistAudit() {
  const workflow = await readText(".github/workflows/deploy-self-hosted.yml");
  verifyDeployWorkflowProductionDistAuditContent(workflow);
}

async function runReleaseReadinessCheck() {
  console.log("[verify:release-ready] start");
  await verifyFilesExist();
  await verifyPackageScripts();
  await verifySmokeWorkflowSharding();
  await verifyRefactorGateSupportsSmokeScriptParam();
  await verifyDeployWorkflowProductionDistAudit();
  console.log(
    "[verify:release-ready] PASS: stable docs + scripts + smoke sharding + gate parameterization + deploy dist audit + resource budget verified"
  );
}

function isDirectCliExecution() {
  return Boolean(process.argv[1] && path.resolve(process.argv[1]) === __filename);
}

if (isDirectCliExecution()) {
  runReleaseReadinessCheck().catch((err) => {
    console.error("[verify:release-ready] failed", err && err.message ? err.message : err);
    process.exitCode = 1;
  });
}

export {
  DEPLOY_WORKFLOW_REQUIRED_SNIPPETS,
  REFACTOR_GATE_REQUIRED_SNIPPETS,
  SMOKE_WORKFLOW_REQUIRED_SNIPPETS,
  ensureContainsSnippets,
  ensureSnippetOrder,
  ensureJobNeedsDependency,
  extractWorkflowJobBlock,
  findMissingSnippets,
  isDirectCliExecution,
  runReleaseReadinessCheck,
  verifyDeployWorkflowProductionDistAuditContent,
  verifyPackageScriptCommandsContent,
  verifyRefactorGateSupportsSmokeScriptParamContent,
  verifySmokeWorkflowShardingContent
};
