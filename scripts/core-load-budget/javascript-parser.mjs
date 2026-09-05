import ts from "typescript";

import { createViolation } from "./shared.mjs";

function literalText(node) {
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
    ? node.text
    : null;
}

function isViteDependencyArray(node) {
  const parent = node.parent;
  return (
    ts.isBinaryExpression(parent) &&
    parent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
    parent.right === node &&
    ts.isPropertyAccessExpression(parent.left) &&
    parent.left.name.text === "f"
  );
}

function parseJavaScriptModule(content, requestUrl) {
  const sourceFile = ts.createSourceFile(
    requestUrl,
    content,
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.JS,
  );
  const staticImports = [];
  const dynamicImports = [];
  const viteDependencies = [];
  const violations = sourceFile.parseDiagnostics.map((diagnostic) =>
    createViolation(
      "invalid-javascript-module",
      ts.flattenDiagnosticMessageText(diagnostic.messageText, " "),
      {
        path: requestUrl,
        suggestedAction: "Rebuild a syntactically valid JavaScript module.",
      },
    ),
  );
  let viteHelperReferences = 0;
  let viteDependencyArrays = 0;

  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier
    ) {
      const text = literalText(node.moduleSpecifier);
      if (text === null) {
        violations.push(
          createViolation(
            "non-literal-static-import",
            "static import/export specifier must be a literal",
            {
              path: requestUrl,
              suggestedAction: "Use a literal relative module specifier.",
            },
          ),
        );
      } else staticImports.push(text);
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      const argument = node.arguments[0];
      const text = argument ? literalText(argument) : null;
      if (text === null) {
        violations.push(
          createViolation(
            "non-literal-dynamic-import",
            "dynamic import expression must use one literal path",
            {
              path: requestUrl,
              suggestedAction:
                "Replace identifier or interpolated-template imports with explicit literal imports so the dependency graph is deterministic.",
            },
          ),
        );
      } else dynamicImports.push(text);
    }
    if (ts.isIdentifier(node) && node.text === "__vite__mapDeps") {
      viteHelperReferences += 1;
    }
    if (ts.isArrayLiteralExpression(node) && isViteDependencyArray(node)) {
      viteDependencyArrays += 1;
      for (const element of node.elements) {
        const text = literalText(element);
        if (text === null) {
          violations.push(
            createViolation(
              "invalid-vite-map-deps",
              "Vite dependency mapping must contain only literal paths",
              {
                path: requestUrl,
                suggestedAction:
                  "Rebuild with a supported Vite dependency helper shape.",
              },
            ),
          );
        } else viteDependencies.push(text);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  if (viteHelperReferences > 0 && viteDependencyArrays === 0) {
    violations.push(
      createViolation(
        "unresolved-vite-map-deps",
        "__vite__mapDeps is referenced but its literal mapping array was not resolved",
        {
          path: requestUrl,
          suggestedAction:
            "Update the analyzer for the new Vite helper shape before accepting the build.",
        },
      ),
    );
  }
  return {
    staticImports,
    dynamicImports,
    viteDependencies,
    violations,
  };
}

export { parseJavaScriptModule };
