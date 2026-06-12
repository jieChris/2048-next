import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  collectBoundaryViolations,
  collectPatternMatches,
  DIRECT_SERVICE_USAGE_ALLOWLIST,
  ensureNoBoundaryViolations,
  normalizePortablePath,
  shouldAuditFile,
  toProjectRelativePath
} from "../../scripts/service-boundary-audit.mjs";

describe("service-boundary-audit helpers", () => {
  it("normalizes portable paths", () => {
    expect(normalizePortablePath("a\\b\\c.ts")).toBe("a/b/c.ts");
  });

  it("filters auditable file suffixes", () => {
    expect(shouldAuditFile("src/app.ts")).toBe(true);
    expect(shouldAuditFile("js/page.js")).toBe(true);
    expect(shouldAuditFile("docs/file.md")).toBe(false);
  });

  it("collects direct storage and fetch pattern matches with line numbers", () => {
    const source = [
      "const a = localStorage.getItem('x');",
      "const b = sessionStorage.removeItem('y');",
      "await fetch('/api/test');"
    ].join("\n");

    expect(collectPatternMatches(source, /\b(?:localStorage|sessionStorage)\s*\./gu, "storage")).toEqual([
      { label: "storage", token: "localStorage.", line: 1 },
      { label: "storage", token: "sessionStorage.", line: 2 }
    ]);
    expect(collectPatternMatches(source, /\bfetch\s*\(/gu, "fetch")).toEqual([
      { label: "fetch", token: "fetch(", line: 3 }
    ]);
  });

  it("collects violations per file", () => {
    const filePath = path.resolve("G:/2048/2048undo/2048-next/js/sample.js");
    const violations = collectBoundaryViolations(
      filePath,
      "const x = localStorage.getItem('a');\nawait fetch('/api/demo');"
    );

    expect(violations).toEqual([
      {
        filePath,
        projectRelativePath: "js/sample.js",
        label: "storage",
        token: "localStorage.",
        line: 1
      },
      {
        filePath,
        projectRelativePath: "js/sample.js",
        label: "fetch",
        token: "fetch(",
        line: 2
      }
    ]);
  });

  it("rejects any collected violations", () => {
    expect(() =>
      ensureNoBoundaryViolations([
        { projectRelativePath: "js/sample.js", line: 4, label: "fetch" }
      ])
    ).toThrow(/forbidden direct storage\/fetch usage/);
  });

  it("builds project-relative paths", () => {
    const filePath = path.resolve("G:/2048/2048undo/2048-next/src/example.ts");
    expect(toProjectRelativePath(filePath)).toBe("src/example.ts");
  });

  it("keeps page-level service boundary exceptions out of the baseline", () => {
    expect(DIRECT_SERVICE_USAGE_ALLOWLIST.has("src/pages/admin-page.ts")).toBe(false);
    expect(DIRECT_SERVICE_USAGE_ALLOWLIST.has("src/pages/stone-2k-monitor-page.ts")).toBe(false);
  });

  it("does not carry direct service usage exceptions", () => {
    expect(Array.from(DIRECT_SERVICE_USAGE_ALLOWLIST)).toEqual([]);
  });
});
