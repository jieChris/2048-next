import { describe, expect, it } from "vitest";

import {
  PAGE_ENTRY_SPECS,
  collectPageEntryRecords,
  detectEntryArchitecture,
  ensureCapabilityMapped,
  ensureDirectPageUsesManifest,
  ensureAllPageEntriesExist,
  ensureEntryHasNoLegacyImports,
  ensurePageEntryArchitectures,
  ensureEntryUsesManifest,
  ensureImportAndExportOrderAligned,
  ensureRetiredRuntimeScriptAbsent,
  ensureScriptOrderConstraints,
  extractScriptImportOrder,
  RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS
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
    const validEntry = [
      'import { bootstrapDirectPage } from "../app/bootstrap-direct-page";',
      'import { bootstrapModesPage } from "../pages/modes-page";',
      "",
      'await bootstrapDirectPage("modes", bootstrapModesPage);'
    ].join("\n");
    const invalidEntry = [
      'import { bootstrapDirectPage } from "../app/bootstrap-direct-page";',
      'import "../../js/theme_manager.js";'
    ].join("\n");

    expect(() => ensureEntryHasNoLegacyImports(validEntry, "modes.ts")).not.toThrow();
    expect(() => ensureEntryHasNoLegacyImports(invalidEntry, "modes.ts")).toThrow(
      /should not import runtime scripts directly/
    );
  });

  it("validates direct-page manifest bootstrap usage", () => {
    const validEntry = [
      'import { bootstrapDirectPage } from "../app/bootstrap-direct-page";',
      'import { bootstrapPalettePage } from "../pages/palette-page";',
      "",
      'await bootstrapDirectPage("palette", bootstrapPalettePage);'
    ].join("\n");
    const validAccountEntry = [
      'import { bootstrapDirectPage } from "../app/bootstrap-direct-page";',
      'import { bootstrapAccountPage } from "../pages/account-page";',
      "",
      'await bootstrapDirectPage("account", bootstrapAccountPage);'
    ].join("\n");
    const validAccountSettingsEntry = [
      'import { bootstrapDirectPage } from "../app/bootstrap-direct-page";',
      'import { bootstrapAccountSettingsPage } from "../pages/account-settings-page";',
      "",
      'await bootstrapDirectPage("account-settings", bootstrapAccountSettingsPage);'
    ].join("\n");
    const validHistoryEntry = [
      'import { bootstrapDirectPage } from "../app/bootstrap-direct-page";',
      'import { bootstrapHistoryPage } from "../pages/history-page";',
      "",
      'await bootstrapDirectPage("history", bootstrapHistoryPage);'
    ].join("\n");
    const validRegisterEntry = [
      'import { bootstrapDirectPage } from "../app/bootstrap-direct-page";',
      'import { bootstrapRegisterPage } from "../pages/register-page";',
      "",
      'await bootstrapDirectPage("register", bootstrapRegisterPage);'
    ].join("\n");
    const validPasswordEntry = [
      'import { bootstrapDirectPage } from "../app/bootstrap-direct-page";',
      'import { bootstrapPasswordPage } from "../pages/password-page";',
      "",
      'await bootstrapDirectPage("password", bootstrapPasswordPage);'
    ].join("\n");
    const validUserProfileEntry = [
      'import { bootstrapDirectPage } from "../app/bootstrap-direct-page";',
      'import { bootstrapUserProfilePage } from "../pages/user-profile-page";',
      "",
      'await bootstrapDirectPage("user-profile", bootstrapUserProfilePage);'
    ].join("\n");

    expect(() =>
      ensureDirectPageUsesManifest(validEntry, "palette.ts", "palette")
    ).not.toThrow();
    expect(() =>
      ensureDirectPageUsesManifest(validAccountEntry, "account.ts", "account")
    ).not.toThrow();
    expect(() =>
      ensureDirectPageUsesManifest(
        validAccountSettingsEntry,
        "account-settings.ts",
        "account-settings"
      )
    ).not.toThrow();
    expect(() =>
      ensureDirectPageUsesManifest(validHistoryEntry, "history.ts", "history")
    ).not.toThrow();
    expect(() =>
      ensureDirectPageUsesManifest(validRegisterEntry, "register.ts", "register")
    ).not.toThrow();
    expect(() =>
      ensureDirectPageUsesManifest(validPasswordEntry, "password.ts", "password")
    ).not.toThrow();
    expect(() =>
      ensureDirectPageUsesManifest(validUserProfileEntry, "user-profile.ts", "user-profile")
    ).not.toThrow();
    expect(() =>
      ensureDirectPageUsesManifest(validEntry, "palette.ts", "modes")
    ).toThrow(/must call bootstrapDirectPage\("modes", \.\.\.\)/);
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

  it("rejects retired runtime scripts in entry manifest modules", () => {
    const invalidModule = [
      'import coreTimerIntervalRuntimeUrl from "../../js/core_timer_interval_runtime.js?url";',
      "",
      "export const playLegacyScripts = [",
      "  coreTimerIntervalRuntimeUrl,",
      "] as const;"
    ].join("\n");

    expect(() =>
      ensureRetiredRuntimeScriptAbsent(
        invalidModule,
        "src/entries/play-runtime-scripts.ts",
        {
          scriptPath: "core_timer_interval_runtime.js",
          symbolName: "coreTimerIntervalRuntimeUrl"
        }
      )
    ).toThrow(/retired runtime script/);
  });

  it("tracks scoring runtime as a retired active-manifest script", () => {
    expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
      scriptPath: "core_scoring_runtime.js",
      symbolName: "coreScoringRuntimeUrl"
    });
  });

  it("tracks post-move runtime as a retired active-manifest script", () => {
    expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
      scriptPath: "core_post_move_runtime.js",
      symbolName: "corePostMoveRuntimeUrl"
    });
  });

  it("tracks merge-effects runtime as a retired active-manifest script", () => {
    expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
      scriptPath: "core_merge_effects_runtime.js",
      symbolName: "coreMergeEffectsRuntimeUrl"
    });
  });

  it("tracks post-move-record runtime as a retired active-manifest script", () => {
    expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
      scriptPath: "core_post_move_record_runtime.js",
      symbolName: "corePostMoveRecordRuntimeUrl"
    });
  });

  it("tracks undo-snapshot runtime as a retired active-manifest script", () => {
    expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
      scriptPath: "core_undo_snapshot_runtime.js",
      symbolName: "coreUndoSnapshotRuntimeUrl"
    });
  });

  it("tracks direction-lock runtime as a retired active-manifest script", () => {
    expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
      scriptPath: "core_direction_lock_runtime.js",
      symbolName: "coreDirectionLockRuntimeUrl"
    });
  });

  it("tracks grid-scan runtime as a retired active-manifest script", () => {
    expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
      scriptPath: "core_grid_scan_runtime.js",
      symbolName: "coreGridScanRuntimeUrl"
    });
  });

  it("tracks move-scan runtime as a retired active-manifest script", () => {
    expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
      scriptPath: "core_move_scan_runtime.js",
      symbolName: "coreMoveScanRuntimeUrl"
    });
  });

  it("tracks move-path runtime as a retired active-manifest script", () => {
    expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
      scriptPath: "core_move_path_runtime.js",
      symbolName: "coreMovePathRuntimeUrl"
    });
  });

  it("tracks post-undo-record runtime as a retired active-manifest script", () => {
    expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
      scriptPath: "core_post_undo_record_runtime.js",
      symbolName: "corePostUndoRecordRuntimeUrl"
    });
  });

  it("tracks undo-tile-snapshot runtime as a retired active-manifest script", () => {
    expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
      scriptPath: "core_undo_tile_snapshot_runtime.js",
      symbolName: "coreUndoTileSnapshotRuntimeUrl"
    });
  });

  it("tracks undo-tile-restore runtime as a retired active-manifest script", () => {
    expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
      scriptPath: "core_undo_tile_restore_runtime.js",
      symbolName: "coreUndoTileRestoreRuntimeUrl"
    });
  });

  it("tracks undo-restore-payload runtime as a retired active-manifest script", () => {
    expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
      scriptPath: "core_undo_restore_payload_runtime.js",
      symbolName: "coreUndoRestorePayloadRuntimeUrl"
    });
  });

  it("tracks undo-stack-entry runtime as a retired active-manifest script", () => {
    expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
      scriptPath: "core_undo_stack_entry_runtime.js",
      symbolName: "coreUndoStackEntryRuntimeUrl"
    });
  });

  it("tracks undo-restore runtime as a retired active-manifest script", () => {
    expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
      scriptPath: "core_undo_restore_runtime.js",
      symbolName: "coreUndoRestoreRuntimeUrl"
    });
  });

  it("tracks move-apply runtime as a retired active-manifest script", () => {
    expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
      scriptPath: "core_move_apply_runtime.js",
      symbolName: "coreMoveApplyRuntimeUrl"
    });
  });

  it("tracks replay-timer runtime as a retired active-manifest script", () => {
    expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
      scriptPath: "core_replay_timer_runtime.js",
      symbolName: "coreReplayTimerRuntimeUrl"
    });
  });

  it("tracks replay-flow runtime as a retired active-manifest script", () => {
    expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
      scriptPath: "core_replay_flow_runtime.js",
      symbolName: "coreReplayFlowRuntimeUrl"
    });
  });

  it("tracks replay-control runtime as a retired active-manifest script", () => {
    expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
      scriptPath: "core_replay_control_runtime.js",
      symbolName: "coreReplayControlRuntimeUrl"
    });
  });

  it("tracks replay-loop runtime as a retired active-manifest script", () => {
    expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
      scriptPath: "core_replay_loop_runtime.js",
      symbolName: "coreReplayLoopRuntimeUrl"
    });
  });

  it("tracks replay-lifecycle runtime as a retired active-manifest script", () => {
    expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
      scriptPath: "core_replay_lifecycle_runtime.js",
      symbolName: "coreReplayLifecycleRuntimeUrl"
    });
  });

  it("tracks replay-dispatch runtime as a retired active-manifest script", () => {
    expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
      scriptPath: "core_replay_dispatch_runtime.js",
      symbolName: "coreReplayDispatchRuntimeUrl"
    });
  });

  it("tracks replay-execution runtime as a retired active-manifest script", () => {
    expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
      scriptPath: "core_replay_execution_runtime.js",
      symbolName: "coreReplayExecutionRuntimeUrl"
    });
  });

  it("tracks replay-codec runtime as a retired active-manifest script", () => {
    expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
      scriptPath: "core_replay_codec_runtime.js",
      symbolName: "coreReplayCodecRuntimeUrl"
    });
  });

  it("tracks replay-v4-actions runtime as a retired active-manifest script", () => {
    expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
      scriptPath: "core_replay_v4_actions_runtime.js",
      symbolName: "coreReplayV4ActionsRuntimeUrl"
    });
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

  it("detects entry architecture styles", () => {
    expect(
      detectEntryArchitecture('import { bootstrapHomeFamilyPage } from "./home-family-bootstrap";')
    ).toBe("manifest-bootstrap");
    expect(
      detectEntryArchitecture('import { bootstrapDirectPage } from "../app/bootstrap-direct-page";')
    ).toBe("manifest-bootstrap");
    expect(detectEntryArchitecture('import "../../js/account_page.js";')).toBe("direct-module");
  });

  it("collects page entry records from the explicit page spec list", () => {
    const records = [
      { fileName: "index.ts", content: 'bootstrapHomeFamilyPage("index");' },
      { fileName: "account.ts", content: 'import "../../js/account_page.js";' },
      {
        fileName: "account-settings.ts",
        content: 'await bootstrapDirectPage("account-settings", bootstrapAccountSettingsPage);'
      }
    ];

    const collected = collectPageEntryRecords(records);
    expect(collected.find((entry) => entry.entryFile === "index.ts")?.fileRecord).toEqual(records[0]);
    expect(collected.find((entry) => entry.entryFile === "account.ts")?.fileRecord).toEqual(records[1]);
    expect(collected.find((entry) => entry.entryFile === "account-settings.ts")?.fileRecord).toEqual(
      records[2]
    );
    expect(PAGE_ENTRY_SPECS.some((entry) => entry.entryFile === "user-profile.ts")).toBe(true);
    expect(PAGE_ENTRY_SPECS.some((entry) => entry.entryFile === "account-settings.ts")).toBe(true);
    expect(PAGE_ENTRY_SPECS.some((entry) => entry.entryFile === "register.ts")).toBe(true);
    expect(PAGE_ENTRY_SPECS.some((entry) => entry.entryFile === "password.ts")).toBe(true);
  });

  it("rejects missing page entry files and architecture drift", () => {
    expect(() =>
      ensureAllPageEntriesExist([
        { htmlFile: "2048.html", entryFile: "index.ts", fileRecord: null }
      ])
    ).toThrow(/missing page entry files/);

    expect(() =>
      ensurePageEntryArchitectures([
        {
          entryFile: "index.ts",
          architecture: "manifest-bootstrap",
          fileRecord: { content: 'import "../../js/index_page.js";' }
        }
      ])
    ).toThrow(/page entry architecture drift/);
  });
});
