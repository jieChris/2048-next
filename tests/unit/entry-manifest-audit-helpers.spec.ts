import { describe, expect, it } from "vitest";

import {
  ensureCapabilityMapped,
  ensureEntryHasNoLegacyImports,
  ensureEntryUsesManifest,
  ensureImportAndExportOrderAligned,
  ensureScriptOrderConstraints,
  extractScriptImportOrder
} from "../../scripts/entry-manifest-audit.mjs";

describe("entry-manifest-audit helpers", () => {
  it("validates manifest bootstrap usage and blocks legacy sequential loader", () => {
    const validEntry = [
      'import { bootstrapHomeFamilyPage } from "./home-family-bootstrap";',
      "",
      'bootstrapHomeFamilyPage("play");'
    ].join("\n");

    expect(() => ensureEntryUsesManifest(validEntry, "play.ts", "play")).not.toThrow();
    expect(() =>
      ensureEntryUsesManifest(
        `${validEntry}\nloadLegacyScriptsSequentially([]);`,
        "play.ts",
        "play"
      )
    ).toThrow(/should not directly call loadLegacyScriptsSequentially/);
  });

  it("rejects direct runtime script imports in entry files", () => {
    const validEntry = 'import { bootstrapHomeFamilyPage } from "./home-family-bootstrap";';
    const invalidEntry = [
      'import { bootstrapHomeFamilyPage } from "./home-family-bootstrap";',
      'import "./legacy-runtime.js";'
    ].join("\n");

    expect(() => ensureEntryHasNoLegacyImports(validEntry, "play.ts")).not.toThrow();
    expect(() => ensureEntryHasNoLegacyImports(invalidEntry, "play.ts")).toThrow(
      /should not import runtime scripts directly/
    );
  });

  it("validates capability to symbol mapping", () => {
    const sharedContent = `const capabilityScripts = { play: playLegacyScripts };`;

    expect(() =>
      ensureCapabilityMapped(sharedContent, "play", "playLegacyScripts")
    ).not.toThrow();
    expect(() =>
      ensureCapabilityMapped(sharedContent, "replay", "replayLegacyScripts")
    ).toThrow(/capability "replay" is not mapped/);
  });

  it("extracts import/export script order from runtime-script module", () => {
    const moduleContent = [
      'import alphaUrl from "../a.js?url";',
      'import betaUrl from "../b.js?url";',
      "",
      "export const playLegacyScripts = [",
      "  alphaUrl,",
      "  betaUrl,",
      "] as const;"
    ].join("\n");

    const result = extractScriptImportOrder(
      moduleContent,
      "playLegacyScripts",
      "play-runtime-scripts.ts"
    );

    expect(result.importOrder).toEqual(["alphaUrl", "betaUrl"]);
    expect(result.exportedOrder).toEqual(["alphaUrl", "betaUrl"]);
  });

  it("detects import/export order drift", () => {
    expect(() =>
      ensureImportAndExportOrderAligned(
        ["alphaUrl", "betaUrl"],
        ["alphaUrl", "gammaUrl"],
        "play-runtime-scripts.ts"
      )
    ).toThrow(/exported script order drift/);
  });

  it("enforces script order constraints", () => {
    const order = ["alphaUrl", "betaUrl", "gammaUrl"];
    const constraints = [{ before: "alphaUrl", after: "gammaUrl" }];
    const invalidConstraints = [{ before: "gammaUrl", after: "betaUrl" }];

    expect(() =>
      ensureScriptOrderConstraints(order, "play-runtime-scripts.ts", constraints)
    ).not.toThrow();
    expect(() =>
      ensureScriptOrderConstraints(order, "play-runtime-scripts.ts", invalidConstraints)
    ).toThrow(/invalid order/);
  });
});
