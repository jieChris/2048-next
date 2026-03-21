import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONTRACTS_FILE_PATH = path.resolve(__dirname, "..", "src", "contracts", "index.ts");
const MATRIX_DOC_PATH = path.resolve(
  __dirname,
  "..",
  "docs",
  "baseline",
  "CONTRACTS_REPLAY_IMPORT_EXPORT_MATRIX.md"
);

const REQUIRED_CONTRACT_NAMES = ["ReplayRecord", "HistoryExportEnvelope", "SubmitPayload"];
const REQUIRED_TOKENS = [
  "REPLAY_RECORD_REQUIRED_KEYS",
  "HISTORY_EXPORT_ENVELOPE_REQUIRED_KEYS",
  "SUBMIT_PAYLOAD_REQUIRED_KEYS",
  "isReplayRecordLike",
  "isHistoryExportEnvelopeLike",
  "isSubmitPayloadLike",
  "REPLAY_IMPORT_EXPORT_CONTRACT_MATRIX"
];

function fail(message) {
  throw new Error(message);
}

function findMissingSnippets(content, snippets) {
  const source = String(content || "");
  return snippets.filter((snippet) => !source.includes(snippet));
}

function extractMatrixContractBlocks(contractsContent) {
  const matrixSectionMatch = String(contractsContent || "").match(
    /export const REPLAY_IMPORT_EXPORT_CONTRACT_MATRIX[\s\S]*?=\s*\[([\s\S]*?)\];/m
  );
  if (!matrixSectionMatch) return [];
  const matrixBody = matrixSectionMatch[1];
  const rowPattern = /{\s*contract:\s*"([^"]+)"([\s\S]*?)\n\s*}\s*,?/g;
  const rows = [];
  let match = rowPattern.exec(matrixBody);
  while (match) {
    rows.push({
      contract: match[1],
      body: match[2]
    });
    match = rowPattern.exec(matrixBody);
  }
  return rows;
}

function rowFieldHasNonEmptyArray(rowBody, fieldName, { allowIdentifier = false } = {}) {
  const escapedField = String(fieldName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (allowIdentifier) {
    const identifierPattern = new RegExp(`${escapedField}:\\s*[A-Za-z_][A-Za-z0-9_]*`, "m");
    if (identifierPattern.test(String(rowBody || ""))) return true;
  }
  const fieldPattern = new RegExp(`${escapedField}:\\s*\\[([\\s\\S]*?)\\]`, "m");
  const match = String(rowBody || "").match(fieldPattern);
  if (!match) return false;
  return /"[^"]+"/.test(match[1]);
}

function verifyContractsMatrixContent(contractsContent) {
  const missingTokens = findMissingSnippets(contractsContent, REQUIRED_TOKENS);
  if (missingTokens.length > 0) {
    fail(
      `[contracts-matrix-audit] missing required token in src/contracts/index.ts: ${missingTokens[0]}`
    );
  }
  const rows = extractMatrixContractBlocks(contractsContent);
  if (rows.length !== REQUIRED_CONTRACT_NAMES.length) {
    fail(
      "[contracts-matrix-audit] matrix row count mismatch: " +
        `expected=${REQUIRED_CONTRACT_NAMES.length}, actual=${rows.length}`
    );
  }
  for (const contractName of REQUIRED_CONTRACT_NAMES) {
    const row = rows.find((item) => item.contract === contractName);
    if (!row) {
      fail(`[contracts-matrix-audit] missing matrix row for contract: ${contractName}`);
    }
    for (const field of ["requiredKeys", "producers", "consumers", "assertions"]) {
      const allowIdentifier = field === "requiredKeys";
      if (!rowFieldHasNonEmptyArray(row.body, field, { allowIdentifier })) {
        fail(
          `[contracts-matrix-audit] matrix row ${contractName} has empty or missing ${field}`
        );
      }
    }
  }
}

function verifyMatrixDocContent(docContent) {
  for (const contractName of REQUIRED_CONTRACT_NAMES) {
    if (!String(docContent || "").includes(contractName)) {
      fail(
        `[contracts-matrix-audit] matrix doc missing contract name: ${contractName}`
      );
    }
  }
}

async function main() {
  const [contractsContent, matrixDocContent] = await Promise.all([
    readFile(CONTRACTS_FILE_PATH, "utf8"),
    readFile(MATRIX_DOC_PATH, "utf8")
  ]);
  verifyContractsMatrixContent(contractsContent);
  verifyMatrixDocContent(matrixDocContent);
  console.log("[contracts-matrix-audit] PASS: contracts matrix + doc baseline verified");
}

function isDirectCliExecution() {
  return Boolean(process.argv[1] && path.resolve(process.argv[1]) === __filename);
}

if (isDirectCliExecution()) {
  main().catch((error) => {
    console.error("[contracts-matrix-audit] unexpected error", error);
    process.exitCode = 1;
  });
}

export {
  REQUIRED_CONTRACT_NAMES,
  REQUIRED_TOKENS,
  extractMatrixContractBlocks,
  findMissingSnippets,
  isDirectCliExecution,
  rowFieldHasNonEmptyArray,
  verifyContractsMatrixContent,
  verifyMatrixDocContent
};
