import { describe, expect, it } from "vitest";

import {
  collectPageLegacyImportRecords,
  ensureNoNewLegacyPageImports,
  extractImportSpecifiers,
  PAGE_LEGACY_IMPORT_ALLOWLIST
} from "../../scripts/page-legacy-runtime-boundary-audit.mjs";

describe("page-legacy-runtime-boundary-audit helpers", () => {
  it("extracts import specifiers from both import styles", () => {
    const content = [
      'import { x } from "../../js/theme_manager.js";',
      'import "../../js/core_i18n_runtime.js";',
      'const legacyModule = await import("../../js/history_page.js");',
      'import { bootstrapDirectPage } from "../app/bootstrap-direct-page";'
    ].join("\n");

    expect(extractImportSpecifiers(content)).toEqual([
      "../../js/theme_manager.js",
      "../app/bootstrap-direct-page",
      "../../js/core_i18n_runtime.js",
      "../../js/history_page.js"
    ]);
  });

  it("collects legacy page imports from file records", () => {
    const records = [
      {
        fileName: "modes-page.ts",
        filePath: "src/pages/modes-page.ts",
        projectRelativePath: "src/pages/modes-page.ts",
        content: [
          'import "../../js/theme_manager.js";',
          'import "../../js/core_i18n_runtime.js";'
        ].join("\n")
      },
      {
        fileName: "custom-page.ts",
        filePath: "src/pages/custom-page.ts",
        projectRelativePath: "src/pages/custom-page.ts",
        content: ['import "../app/bootstrap-direct-page";'].join("\n")
      }
    ];

    expect(collectPageLegacyImportRecords(records)).toEqual([
      {
        ...records[0],
        importSpecifiers: ["../../js/theme_manager.js", "../../js/core_i18n_runtime.js"],
        legacyImportSpecifiers: ["../../js/theme_manager.js", "../../js/core_i18n_runtime.js"]
      },
      {
        ...records[1],
        importSpecifiers: ["../app/bootstrap-direct-page"],
        legacyImportSpecifiers: []
      }
    ]);
  });

  it("allows the current legacy page import baseline", () => {
    const records = [
      {
        fileName: "account-page.ts",
        filePath: "src/pages/account-page.ts",
        projectRelativePath: "src/pages/account-page.ts",
        content: [
          'import "../../js/api_shared_utils.js";',
          'import "../../js/account_page.js";'
        ].join("\n")
      },
      {
        fileName: "user-profile-page.ts",
        filePath: "src/pages/user-profile-page.ts",
        projectRelativePath: "src/pages/user-profile-page.ts",
        content: [
          'import "../../js/core_game_settings_storage_runtime.js";',
          'import "../../js/user_profile_page.js";'
        ].join("\n")
      }
    ];

    expect(() => ensureNoNewLegacyPageImports(collectPageLegacyImportRecords(records))).not.toThrow();
    expect(PAGE_LEGACY_IMPORT_ALLOWLIST["account-page.ts"].has("../../js/account_page.js")).toBe(
      true
    );
  });

  it("blocks new legacy page imports", () => {
    const records = [
      {
        fileName: "modes-page.ts",
        filePath: "src/pages/modes-page.ts",
        projectRelativePath: "src/pages/modes-page.ts",
        content: [
          'import "../../js/theme_manager.js";',
          'import "../../js/core_i18n_runtime.js";',
          'import "../../js/new_legacy_page_runtime.js";'
        ].join("\n")
      }
    ];

    expect(() => ensureNoNewLegacyPageImports(collectPageLegacyImportRecords(records))).toThrow(
      /unexpected legacy page imports/
    );
  });

  it("blocks legacy imports in unapproved page files", () => {
    const records = [
      {
        fileName: "experimental-page.ts",
        filePath: "src/pages/experimental-page.ts",
        projectRelativePath: "src/pages/experimental-page.ts",
        content: ['import "../../js/experimental_runtime.js";'].join("\n")
      }
    ];

    expect(() => ensureNoNewLegacyPageImports(collectPageLegacyImportRecords(records))).toThrow(
      /unexpected legacy page imports/
    );
  });

  it("keeps operational TS pages out of the legacy api shared utils allowlist", () => {
    expect(PAGE_LEGACY_IMPORT_ALLOWLIST["admin-page.ts"]).toBeUndefined();
    expect(PAGE_LEGACY_IMPORT_ALLOWLIST["stone-2k-monitor-page.ts"]).toBeUndefined();
  });

  it("keeps modes page out of the legacy page import allowlist", () => {
    expect(PAGE_LEGACY_IMPORT_ALLOWLIST["modes-page.ts"]).toBeUndefined();
  });
});
