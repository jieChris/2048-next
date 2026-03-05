import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "docs/RELEASE_STABLE_CHECKLIST.zh-CN.md",
  ".github/workflows/smoke.yml",
  "scripts/refactor-gate.mjs"
];

const REQUIRED_NPM_SCRIPTS = [
  "verify:refactor:ci",
  "verify:prepush",
  "verify:release-ready",
  "verify:release",
  "verify:submit-ready",
  "test:smoke:ci",
  "report:refactor-progress",
  "report:commit-split-check",
  "report:commit-batch"
];

function fail(message) {
  throw new Error(message);
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
}

async function verifySmokeWorkflowSharding() {
  const workflow = await readText(".github/workflows/smoke.yml");
  const requiredSnippets = [
    "matrix:",
    "- history",
    "- index-ui",
    "- pages",
    "npm run test:smoke:${{ matrix.suite }}",
    "release-ready:",
    "npm run verify:release-ready",
    "npm run report:refactor-progress"
  ];
  for (const snippet of requiredSnippets) {
    if (!workflow.includes(snippet)) {
      fail(
        `[verify:release-ready] smoke workflow missing required snippet: ${snippet}`
      );
    }
  }
}

async function verifyRefactorGateSupportsSmokeScriptParam() {
  const gate = await readText("scripts/refactor-gate.mjs");
  const requiredSnippets = [
    "--smoke-script=",
    "const smokeScript =",
    "npm\", args: [\"run\", smokeScript]"
  ];
  for (const snippet of requiredSnippets) {
    if (!gate.includes(snippet)) {
      fail(
        `[verify:release-ready] refactor gate missing smoke-script parameter support: ${snippet}`
      );
    }
  }
}

async function main() {
  console.log("[verify:release-ready] start");
  await verifyFilesExist();
  await verifyPackageScripts();
  await verifySmokeWorkflowSharding();
  await verifyRefactorGateSupportsSmokeScriptParam();
  console.log(
    "[verify:release-ready] PASS: stable docs + scripts + smoke sharding + gate parameterization verified"
  );
}

main().catch((err) => {
  console.error("[verify:release-ready] failed", err && err.message ? err.message : err);
  process.exitCode = 1;
});
