import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import ts from "typescript";

import { createViolation } from "./core.mjs";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function scriptKindForPath(relativePath) {
  if (relativePath.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (relativePath.endsWith(".ts")) return ts.ScriptKind.TS;
  if (relativePath.endsWith(".jsx")) return ts.ScriptKind.JSX;
  return ts.ScriptKind.JS;
}

function countTopLevelSymbols(sourceFile) {
  let count = 0;
  for (const statement of sourceFile.statements) {
    if (ts.isVariableStatement(statement)) {
      count += statement.declarationList.declarations.length;
    } else if (
      ts.isFunctionDeclaration(statement) ||
      ts.isClassDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isEnumDeclaration(statement) ||
      ts.isModuleDeclaration(statement)
    ) {
      count += 1;
    }
  }
  return count;
}

function callName(expression) {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  return null;
}

function isWindowLikeAssignmentTarget(node) {
  let current = node;
  while (
    ts.isPropertyAccessExpression(current) ||
    ts.isElementAccessExpression(current)
  ) {
    current = current.expression;
  }
  return (
    ts.isIdentifier(current) && ["window", "globalThis"].includes(current.text)
  );
}

function collectNestedMetrics(sourceFile) {
  let imports = 0;
  let runtimeRegistrations = 0;
  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isImportEqualsDeclaration(node)) {
      imports += 1;
    } else if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "require"
    ) {
      imports += 1;
    }
    if (ts.isCallExpression(node)) {
      const name = callName(node.expression);
      if (name && /^(?:install|register)[A-Z0-9_]/u.test(name)) {
        runtimeRegistrations += 1;
      }
    } else if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
      node.operatorToken.kind <= ts.SyntaxKind.LastAssignment &&
      isWindowLikeAssignmentTarget(node.left)
    ) {
      runtimeRegistrations += 1;
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return { imports, runtimeRegistrations };
}

function collectFileMetrics(relativePath, content) {
  const sourcePath = String(relativePath);
  const sourceFile = ts.createSourceFile(
    sourcePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    scriptKindForPath(sourcePath),
  );
  const nested = collectNestedMetrics(sourceFile);
  return {
    path: sourcePath,
    lines: content.split(/\r?\n/u).length,
    imports: nested.imports,
    topLevelSymbols: countTopLevelSymbols(sourceFile),
    runtimeRegistrations: nested.runtimeRegistrations,
  };
}

async function listRepositorySourcePaths(
  config,
  projectRoot = PROJECT_ROOT,
  { executeGit = execFileAsync } = {},
) {
  const { stdout } = await executeGit(
    "git",
    [
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      "-z",
      "--",
      ...config.roots,
    ],
    {
      cwd: projectRoot,
      encoding: "buffer",
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  const output = Buffer.isBuffer(stdout)
    ? stdout.toString("utf8")
    : String(stdout);
  const extensions = new Set(config.extensions);
  return output
    .split("\0")
    .filter(Boolean)
    .filter((relativePath) => extensions.has(path.posix.extname(relativePath)))
    .sort();
}

async function listRepositoryRefSourcePaths(
  config,
  ref,
  projectRoot = PROJECT_ROOT,
  { executeGit = execFileAsync } = {},
) {
  const { stdout } = await executeGit(
    "git",
    ["ls-tree", "-r", "-z", "--name-only", ref, "--", ...config.roots],
    {
      cwd: projectRoot,
      encoding: "buffer",
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  const output = Buffer.isBuffer(stdout)
    ? stdout.toString("utf8")
    : String(stdout);
  const extensions = new Set(config.extensions);
  return output
    .split("\0")
    .filter(Boolean)
    .filter((relativePath) => extensions.has(path.posix.extname(relativePath)))
    .sort();
}

function classifySourcePaths(relativePaths, configPath = null) {
  const supportedPaths = [];
  const violations = [];
  for (const relativePath of relativePaths) {
    if (!relativePath.includes("\\")) {
      supportedPaths.push(relativePath);
      continue;
    }
    violations.push(
      createViolation(
        "unsupported-source-path",
        "production source paths containing a literal backslash are unsupported",
        {
          path: relativePath,
          configPath,
          suggestedAction:
            "Rename the source file to use portable forward-slash path segments.",
          exceptionStatus: "not-applicable",
        },
      ),
    );
  }
  return { supportedPaths, violations };
}

async function collectRepositoryRefSourceMetrics(
  config,
  ref,
  projectRoot = PROJECT_ROOT,
  { executeGit = execFileAsync, configPath = null } = {},
) {
  const records = [];
  const relativePaths = await listRepositoryRefSourcePaths(
    config,
    ref,
    projectRoot,
    { executeGit },
  );
  const discovery = classifySourcePaths(relativePaths, configPath);
  for (const relativePath of discovery.supportedPaths) {
    const { stdout } = await executeGit(
      "git",
      ["show", `${ref}:${relativePath}`],
      {
        cwd: projectRoot,
        encoding: "utf8",
        maxBuffer: 16 * 1024 * 1024,
      },
    );
    records.push(collectFileMetrics(relativePath, String(stdout)));
  }
  return { files: records, violations: discovery.violations };
}

async function collectRepositoryRefFileMetrics(
  config,
  ref,
  projectRoot = PROJECT_ROOT,
  options = {},
) {
  const result = await collectRepositoryRefSourceMetrics(
    config,
    ref,
    projectRoot,
    options,
  );
  return result.files;
}

async function collectProjectSourceMetrics(
  config,
  projectRoot = PROJECT_ROOT,
  options = {},
) {
  const records = [];
  const relativePaths = await listRepositorySourcePaths(
    config,
    projectRoot,
    options,
  );
  const discovery = classifySourcePaths(relativePaths, options.configPath);
  for (const relativePath of discovery.supportedPaths) {
    try {
      const content = await readFile(
        path.resolve(projectRoot, relativePath),
        "utf8",
      );
      records.push(collectFileMetrics(relativePath, content));
    } catch (error) {
      if (error && error.code === "ENOENT") continue;
      throw error;
    }
  }
  return { files: records, violations: discovery.violations };
}

async function collectProjectFileMetrics(
  config,
  projectRoot = PROJECT_ROOT,
  options = {},
) {
  const result = await collectProjectSourceMetrics(
    config,
    projectRoot,
    options,
  );
  return result.files;
}

export {
  classifySourcePaths,
  collectFileMetrics,
  collectProjectFileMetrics,
  collectProjectSourceMetrics,
  collectRepositoryRefFileMetrics,
  collectRepositoryRefSourceMetrics,
  listRepositoryRefSourcePaths,
  listRepositorySourcePaths,
};
