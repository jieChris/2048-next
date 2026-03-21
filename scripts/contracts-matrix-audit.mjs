import { access, readFile, readdir } from "node:fs/promises";
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

const REQUIRED_CONTRACT_NAMES = [
  "HistoryRecord",
  "ReplayRecord",
  "HistoryExportEnvelope",
  "SubmitPayload",
  "SavedGameStatePayload",
  "SessionInitPayload"
];
const REQUIRED_TOKENS = [
  "CORE_CONTRACT_COVERAGE_MATRIX",
  "HISTORY_RECORD_REQUIRED_KEYS",
  "HISTORY_OWNER_META_REQUIRED_KEYS",
  "HISTORY_DIAGNOSTICS_INDEX_ENTRY_REQUIRED_KEYS",
  "REPLAY_RECORD_REQUIRED_KEYS",
  "HISTORY_EXPORT_ENVELOPE_REQUIRED_KEYS",
  "SUBMIT_PAYLOAD_REQUIRED_KEYS",
  "SAVED_GAME_STATE_PAYLOAD_REQUIRED_KEYS",
  "SESSION_INIT_PAYLOAD_REQUIRED_KEYS",
  "isHistoryRecordLike",
  "isHistoryOwnerMetaLike",
  "isHistoryDiagnosticsIndexEntryLike",
  "isReplayRecordLike",
  "isHistoryExportEnvelopeLike",
  "isSavedGameStatePayloadLike",
  "isSessionInitPayloadLike",
  "isSubmitPayloadLike",
  "REPLAY_IMPORT_EXPORT_CONTRACT_MATRIX"
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

function extractMatrixContractBlocks(contractsContent) {
  const source = String(contractsContent || "");
  const candidateNames = [
    "CORE_CONTRACT_COVERAGE_MATRIX",
    "REPLAY_IMPORT_EXPORT_CONTRACT_MATRIX"
  ];
  let matrixBody = null;
  for (const name of candidateNames) {
    const pattern = new RegExp(
      `export const ${name}[\\s\\S]*?=\\s*\\[([\\s\\S]*?)\\];`,
      "m"
    );
    const match = source.match(pattern);
    if (!match) continue;
    matrixBody = match[1];
    break;
  }
  if (!matrixBody) return [];
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

function extractFieldStringValues(rowBody, fieldName) {
  const escapedField = String(fieldName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const fieldPattern = new RegExp(`${escapedField}:\\s*\\[([\\s\\S]*?)\\]`, "m");
  const match = String(rowBody || "").match(fieldPattern);
  if (!match) return [];
  const values = [];
  const stringPattern = /"([^"]+)"/g;
  let valueMatch = stringPattern.exec(match[1]);
  while (valueMatch) {
    values.push(valueMatch[1]);
    valueMatch = stringPattern.exec(match[1]);
  }
  return values;
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
  return rows;
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

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch (_err) {
    return false;
  }
}

function hasWildcard(inputPath) {
  return String(inputPath || "").includes("*");
}

function convertWildcardSegmentToRegex(wildcardFileName) {
  const escaped = escapeRegexLiteral(wildcardFileName).replace(/\\\*/g, ".*");
  return new RegExp(`^${escaped}$`);
}

async function doesWildcardPathMatchAnyFile(projectRoot, wildcardRelativePath) {
  const normalized = String(wildcardRelativePath || "").replace(/\\/g, "/");
  const dirPart = path.dirname(normalized);
  const filePart = path.basename(normalized);
  const absoluteDir = path.resolve(projectRoot, dirPart);
  const dirExists = await pathExists(absoluteDir);
  if (!dirExists) return false;
  const namePattern = convertWildcardSegmentToRegex(filePart);
  const entries = await readdir(absoluteDir, { withFileTypes: true });
  return entries.some((entry) => entry.isFile() && namePattern.test(entry.name));
}

function resolveAssertionFilePathFromLabel(assertionLabel) {
  const label = String(assertionLabel || "");
  const separatorIndex = label.indexOf("::");
  if (separatorIndex < 0) return label.trim();
  return label.slice(0, separatorIndex).trim();
}

function normalizeAssertionPath(assertionLabel) {
  return resolveAssertionFilePathFromLabel(assertionLabel).replace(/\\/g, "/").toLowerCase();
}

function isUnitAssertionPath(assertionLabel) {
  const normalized = normalizeAssertionPath(assertionLabel);
  return normalized.includes("/tests/unit/") || normalized.startsWith("tests/unit/");
}

function isSmokeAssertionPath(assertionLabel) {
  const normalized = normalizeAssertionPath(assertionLabel);
  return normalized.includes("/tests/smoke/") || normalized.startsWith("tests/smoke/");
}

function verifyMatrixAssertionCoverageDepth(rows) {
  for (const row of rows) {
    const assertionLabels = extractFieldStringValues(row.body, "assertions");
    const unitCount = assertionLabels.filter((assertionLabel) =>
      isUnitAssertionPath(assertionLabel)
    ).length;
    const smokeCount = assertionLabels.filter((assertionLabel) =>
      isSmokeAssertionPath(assertionLabel)
    ).length;
    if (unitCount < 1 || smokeCount < 1) {
      fail(
        "[contracts-matrix-audit] matrix row " +
          `${row.contract} must bind at least one unit + one smoke assertion ` +
          `(unit=${unitCount}, smoke=${smokeCount})`
      );
    }
  }
}

async function verifyMatrixAssertionPathsExist(rows, projectRoot) {
  for (const row of rows) {
    const assertionLabels = extractFieldStringValues(row.body, "assertions");
    for (const assertionLabel of assertionLabels) {
      const assertionPath = resolveAssertionFilePathFromLabel(assertionLabel);
      if (!assertionPath) {
        fail(
          `[contracts-matrix-audit] assertion label is missing file path for contract ${row.contract}: ${assertionLabel}`
        );
      }
      if (hasWildcard(assertionPath)) {
        const matched = await doesWildcardPathMatchAnyFile(projectRoot, assertionPath);
        if (!matched) {
          fail(
            `[contracts-matrix-audit] assertion wildcard path has no matches for contract ${row.contract}: ${assertionPath}`
          );
        }
        continue;
      }
      const absolutePath = path.resolve(projectRoot, assertionPath);
      const exists = await pathExists(absolutePath);
      if (!exists) {
        fail(
          `[contracts-matrix-audit] assertion file path does not exist for contract ${row.contract}: ${assertionPath}`
        );
      }
    }
  }
}

async function main() {
  const projectRoot = path.resolve(__dirname, "..");
  const [contractsContent, matrixDocContent] = await Promise.all([
    readFile(CONTRACTS_FILE_PATH, "utf8"),
    readFile(MATRIX_DOC_PATH, "utf8")
  ]);
  const rows = verifyContractsMatrixContent(contractsContent);
  verifyMatrixDocContent(matrixDocContent);
  verifyMatrixAssertionCoverageDepth(rows);
  await verifyMatrixAssertionPathsExist(rows, projectRoot);
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
  extractFieldStringValues,
  findMissingSnippets,
  isDirectCliExecution,
  isSmokeAssertionPath,
  isUnitAssertionPath,
  rowFieldHasNonEmptyArray,
  verifyMatrixAssertionCoverageDepth,
  verifyContractsMatrixContent,
  verifyMatrixAssertionPathsExist,
  verifyMatrixDocContent
};
