import { describe, expect, it } from "vitest";

import {
  collectLegacyLoaderCallSites,
  collectLegacyLoaderImporters,
  ensureLegacyLoaderImporterBudget,
  ensureNoForbiddenLegacyLoaderCallSites,
  ensureNoForbiddenLegacyLoaderImporters,
  extractImportSpecifiers
} from "../../scripts/legacy-boundary-audit.mjs";

describe("legacy-boundary-audit helpers", () => {
  it("extracts import specifiers from both import styles", () => {
    const content = [
      'import { x } from "./legacy-loader";',
      'import "./side-effect-runtime";'
    ].join("\n");

    expect(extractImportSpecifiers(content)).toEqual([
      "./legacy-loader",
      "./side-effect-runtime"
    ]);
  });

  it("collects legacy-loader importers from file records", () => {
    const records = [
      { fileName: "home-family-bootstrap.ts", content: 'import { x } from "./legacy-loader";' },
      { fileName: "play.ts", content: 'import { y } from "./home-family-bootstrap";' }
    ];

    expect(collectLegacyLoaderImporters(records)).toEqual(["home-family-bootstrap.ts"]);
  });

  it("collects call sites with line numbers", () => {
    const records = [
      {
        fileName: "home-family-bootstrap.ts",
        content: ["const scripts = [];", "loadLegacyScriptsSequentially(scripts);"].join("\n")
      }
    ];

    expect(collectLegacyLoaderCallSites(records)).toEqual([
      { fileName: "home-family-bootstrap.ts", line: 2 }
    ]);
  });

  it("ignores function declaration lines when scanning call sites", () => {
    const records = [
      {
        fileName: "legacy-loader.ts",
        content: ["export function loadLegacyScriptsSequentially(scripts) {", "  return scripts;", "}"].join(
          "\n"
        )
      }
    ];

    expect(collectLegacyLoaderCallSites(records)).toEqual([]);
  });

  it("rejects forbidden importers and call sites", () => {
    expect(() => ensureNoForbiddenLegacyLoaderImporters(["play.ts"])).toThrow(
      /forbidden legacy-loader imports/
    );
    expect(() =>
      ensureNoForbiddenLegacyLoaderCallSites([{ fileName: "play.ts", line: 8 }])
    ).toThrow(/forbidden loadLegacyScriptsSequentially call sites/);
  });

  it("enforces importer budget", () => {
    expect(() => ensureLegacyLoaderImporterBudget(["home-family-bootstrap.ts"], 1)).not.toThrow();
    expect(() =>
      ensureLegacyLoaderImporterBudget(["home-family-bootstrap.ts", "play.ts"], 1)
    ).toThrow(/importer budget exceeded/);
  });
});
