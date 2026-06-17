import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const PAGE_ENTRY_SPECS = [
  { htmlFile: "2048.html", entryFile: "index.ts", pageId: "index", architecture: "manifest-bootstrap" },
  { htmlFile: "undo_2048.html", entryFile: "undo.ts", pageId: "undo", architecture: "manifest-bootstrap" },
  { htmlFile: "capped_2048.html", entryFile: "capped.ts", pageId: "capped", architecture: "manifest-bootstrap" },
  { htmlFile: "Practice_board.html", entryFile: "practice-board.ts", pageId: "practice", architecture: "manifest-bootstrap" },
  { htmlFile: "PKU2048.html", entryFile: "pku2048.ts", pageId: "pku2048", architecture: "manifest-bootstrap" },
  { htmlFile: "play.html", entryFile: "play.ts", pageId: "play", architecture: "manifest-bootstrap" },
  { htmlFile: "replay.html", entryFile: "replay.ts", pageId: "replay", architecture: "manifest-bootstrap" },
  { htmlFile: "index_test.html", entryFile: "index-test-page.ts", pageId: "index_test", architecture: "manifest-bootstrap" },
  { htmlFile: "account.html", entryFile: "account.ts", pageId: "account", architecture: "manifest-bootstrap" },
  { htmlFile: "account_settings.html", entryFile: "account-settings.ts", pageId: "account-settings", architecture: "manifest-bootstrap" },
  { htmlFile: "register.html", entryFile: "register.ts", pageId: "register", architecture: "manifest-bootstrap" },
  { htmlFile: "password.html", entryFile: "password.ts", pageId: "password", architecture: "manifest-bootstrap" },
  { htmlFile: "history.html", entryFile: "history.ts", pageId: "history", architecture: "manifest-bootstrap" },
  { htmlFile: "relay_5x5.html", entryFile: "relay-5x5.ts", pageId: "relay-5x5", architecture: "manifest-bootstrap" },
  { htmlFile: "modes.html", entryFile: "modes.ts", pageId: "modes", architecture: "manifest-bootstrap" },
  { htmlFile: "palette.html", entryFile: "palette.ts", pageId: "palette", architecture: "manifest-bootstrap" },
  { htmlFile: "user.html", entryFile: "user-profile.ts", pageId: "user-profile", architecture: "manifest-bootstrap" }
];

const RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS = [
  {
    scriptPath: "core_timer_interval_runtime.js",
    symbolName: "coreTimerIntervalRuntimeUrl"
  },
  {
    scriptPath: "core_scoring_runtime.js",
    symbolName: "coreScoringRuntimeUrl"
  },
  {
    scriptPath: "core_post_move_runtime.js",
    symbolName: "corePostMoveRuntimeUrl"
  },
  {
    scriptPath: "core_merge_effects_runtime.js",
    symbolName: "coreMergeEffectsRuntimeUrl"
  },
  {
    scriptPath: "core_post_move_record_runtime.js",
    symbolName: "corePostMoveRecordRuntimeUrl"
  },
  {
    scriptPath: "core_undo_snapshot_runtime.js",
    symbolName: "coreUndoSnapshotRuntimeUrl"
  },
  {
    scriptPath: "core_direction_lock_runtime.js",
    symbolName: "coreDirectionLockRuntimeUrl"
  },
  {
    scriptPath: "core_grid_scan_runtime.js",
    symbolName: "coreGridScanRuntimeUrl"
  },
  {
    scriptPath: "core_move_scan_runtime.js",
    symbolName: "coreMoveScanRuntimeUrl"
  },
  {
    scriptPath: "core_move_path_runtime.js",
    symbolName: "coreMovePathRuntimeUrl"
  },
  {
    scriptPath: "core_post_undo_record_runtime.js",
    symbolName: "corePostUndoRecordRuntimeUrl"
  },
  {
    scriptPath: "core_undo_tile_snapshot_runtime.js",
    symbolName: "coreUndoTileSnapshotRuntimeUrl"
  },
  {
    scriptPath: "core_undo_tile_restore_runtime.js",
    symbolName: "coreUndoTileRestoreRuntimeUrl"
  },
  {
    scriptPath: "core_undo_restore_payload_runtime.js",
    symbolName: "coreUndoRestorePayloadRuntimeUrl"
  },
  {
    scriptPath: "core_undo_stack_entry_runtime.js",
    symbolName: "coreUndoStackEntryRuntimeUrl"
  },
  {
    scriptPath: "core_undo_restore_runtime.js",
    symbolName: "coreUndoRestoreRuntimeUrl"
  },
  {
    scriptPath: "core_move_apply_runtime.js",
    symbolName: "coreMoveApplyRuntimeUrl"
  },
  {
    scriptPath: "core_game_settings_storage_runtime.js",
    symbolName: "coreGameSettingsStorageRuntimeUrl"
  },
  {
    scriptPath: "core_game_manager_client_record_id_runtime.js",
    symbolName: "coreGameManagerClientRecordIdRuntimeUrl"
  },
  {
    scriptPath: "core_game_manager_env_helpers_runtime.js",
    symbolName: "coreGameManagerEnvHelpersRuntimeUrl"
  },
  {
    scriptPath: "core_game_manager_base_helpers_runtime.js",
    symbolName: "coreGameManagerBaseHelpersRuntimeUrl"
  },
  {
    scriptPath: "core_game_manager_common_runtime.js",
    symbolName: "coreGameManagerCommonRuntimeUrl"
  },
  {
    scriptPath: "core_replay_timer_runtime.js",
    symbolName: "coreReplayTimerRuntimeUrl"
  },
  {
    scriptPath: "core_replay_flow_runtime.js",
    symbolName: "coreReplayFlowRuntimeUrl"
  },
  {
    scriptPath: "core_replay_control_runtime.js",
    symbolName: "coreReplayControlRuntimeUrl"
  },
  {
    scriptPath: "core_replay_loop_runtime.js",
    symbolName: "coreReplayLoopRuntimeUrl"
  },
  {
    scriptPath: "core_replay_lifecycle_runtime.js",
    symbolName: "coreReplayLifecycleRuntimeUrl"
  },
  {
    scriptPath: "core_replay_dispatch_runtime.js",
    symbolName: "coreReplayDispatchRuntimeUrl"
  },
  {
    scriptPath: "core_replay_execution_runtime.js",
    symbolName: "coreReplayExecutionRuntimeUrl"
  },
  {
    scriptPath: "core_replay_codec_runtime.js",
    symbolName: "coreReplayCodecRuntimeUrl"
  },
  {
    scriptPath: "core_replay_v4_actions_runtime.js",
    symbolName: "coreReplayV4ActionsRuntimeUrl"
  },
  {
    scriptPath: "core_replay_import_runtime.js",
    symbolName: "coreReplayImportRuntimeUrl"
  },
  {
    scriptPath: "core_replay_export_runtime.js",
    symbolName: "coreReplayExportRuntimeUrl"
  },
  {
    scriptPath: "core_replay_page_host_runtime.js",
    symbolName: "coreReplayPageHostRuntimeUrl"
  },
  {
    scriptPath: "core_replay_modal_runtime.js",
    symbolName: "coreReplayModalRuntimeUrl"
  },
  {
    scriptPath: "core_settings_modal_host_runtime.js",
    symbolName: "coreSettingsModalHostRuntimeUrl"
  },
  {
    scriptPath: "core_settings_modal_page_host_runtime.js",
    symbolName: "coreSettingsModalPageHostRuntimeUrl"
  },
  {
    scriptPath: "core_pretty_time_runtime.js",
    symbolName: "corePrettyTimeRuntimeUrl"
  },
  {
    scriptPath: "core_responsive_relayout_runtime.js",
    symbolName: "coreResponsiveRelayoutRuntimeUrl"
  },
  {
    scriptPath: "core_responsive_relayout_host_runtime.js",
    symbolName: "coreResponsiveRelayoutHostRuntimeUrl"
  },
  {
    scriptPath: "core_game_over_undo_host_runtime.js",
    symbolName: "coreGameOverUndoHostRuntimeUrl"
  },
  {
    scriptPath: "core_index_ui_startup_host_runtime.js",
    symbolName: "coreIndexUiStartupHostRuntimeUrl"
  },
  {
    scriptPath: "core_home_guide_done_notice_host_runtime.js",
    symbolName: "coreHomeGuideDoneNoticeHostRuntimeUrl"
  },
  {
    scriptPath: "core_home_guide_highlight_host_runtime.js",
    symbolName: "coreHomeGuideHighlightHostRuntimeUrl"
  },
  {
    scriptPath: "core_home_guide_panel_host_runtime.js",
    symbolName: "coreHomeGuidePanelHostRuntimeUrl"
  },
  {
    scriptPath: "core_home_guide_finish_host_runtime.js",
    symbolName: "coreHomeGuideFinishHostRuntimeUrl"
  },
  {
    scriptPath: "core_home_guide_start_host_runtime.js",
    symbolName: "coreHomeGuideStartHostRuntimeUrl"
  },
  {
    scriptPath: "core_home_guide_controls_host_runtime.js",
    symbolName: "coreHomeGuideControlsHostRuntimeUrl"
  },
  {
    scriptPath: "core_home_guide_step_flow_host_runtime.js",
    symbolName: "coreHomeGuideStepFlowHostRuntimeUrl"
  },
  {
    scriptPath: "core_home_guide_step_host_runtime.js",
    symbolName: "coreHomeGuideStepHostRuntimeUrl"
  },
  {
    scriptPath: "core_home_guide_settings_host_runtime.js",
    symbolName: "coreHomeGuideSettingsHostRuntimeUrl"
  },
  {
    scriptPath: "core_home_guide_startup_host_runtime.js",
    symbolName: "coreHomeGuideStartupHostRuntimeUrl"
  },
  {
    scriptPath: "core_home_guide_page_host_runtime.js",
    symbolName: "coreHomeGuidePageHostRuntimeUrl"
  },
  {
    scriptPath: "core_home_guide_runtime.js",
    symbolName: "coreHomeGuideRuntimeUrl"
  },
  {
    scriptPath: "core_home_guide_dom_host_runtime.js",
    symbolName: "coreHomeGuideDomHostRuntimeUrl"
  },
  {
    scriptPath: "core_home_guide_step_view_host_runtime.js",
    symbolName: "coreHomeGuideStepViewHostRuntimeUrl"
  },
  {
    scriptPath: "core_home_startup_host_runtime.js",
    symbolName: "coreHomeStartupHostRuntimeUrl"
  },
  {
    scriptPath: "core_home_page_host_runtime.js",
    symbolName: "coreHomePageHostRuntimeUrl"
  },
  {
    scriptPath: "core_home_runtime_contract_runtime.js",
    symbolName: "coreHomeRuntimeContractRuntimeUrl"
  },
  {
    scriptPath: "core_home_mode_runtime.js",
    symbolName: "coreHomeModeRuntimeUrl"
  },
  {
    scriptPath: "core_practice_mode_runtime.js",
    symbolName: "corePracticeModeRuntimeUrl"
  },
  {
    scriptPath: "core_undo_action_runtime.js",
    symbolName: "coreUndoActionRuntimeUrl"
  },
  {
    scriptPath: "core_mode_catalog_runtime.js",
    symbolName: "coreModeCatalogRuntimeUrl"
  },
  {
    scriptPath: "core_mode_runtime.js",
    symbolName: "coreModeRuntimeUrl"
  },
  {
    scriptPath: "core_rules_runtime.js",
    symbolName: "coreRulesRuntimeUrl"
  },
  {
    scriptPath: "core_crypto_random_runtime.js",
    symbolName: "coreCryptoRandomRuntimeUrl"
  },
  {
    scriptPath: "core_special_rules_runtime.js",
    symbolName: "coreSpecialRulesRuntimeUrl"
  }
];

const BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS = [
  {
    scriptPath: "core_home_guide_runtime.js"
  },
  {
    scriptPath: "core_special_rules_runtime.js"
  },
  {
    scriptPath: "core_crypto_random_runtime.js"
  },
  {
    scriptPath: "core_rules_runtime.js"
  },
  {
    scriptPath: "core_mode_catalog_runtime.js"
  },
  {
    scriptPath: "core_mode_runtime.js"
  },
  {
    scriptPath: "core_direction_lock_runtime.js"
  },
  {
    scriptPath: "core_grid_scan_runtime.js"
  },
  {
    scriptPath: "core_move_scan_runtime.js"
  },
  {
    scriptPath: "core_move_path_runtime.js"
  },
  {
    scriptPath: "core_timer_interval_runtime.js"
  },
  {
    scriptPath: "core_scoring_runtime.js"
  },
  {
    scriptPath: "core_merge_effects_runtime.js"
  },
  {
    scriptPath: "core_post_move_runtime.js"
  },
  {
    scriptPath: "core_post_move_record_runtime.js"
  },
  {
    scriptPath: "core_undo_snapshot_runtime.js"
  },
  {
    scriptPath: "core_undo_tile_snapshot_runtime.js"
  },
  {
    scriptPath: "core_undo_tile_restore_runtime.js"
  },
  {
    scriptPath: "core_undo_restore_payload_runtime.js"
  },
  {
    scriptPath: "core_undo_stack_entry_runtime.js"
  },
  {
    scriptPath: "core_post_undo_record_runtime.js"
  },
  {
    scriptPath: "core_undo_restore_runtime.js"
  },
  {
    scriptPath: "core_replay_codec_runtime.js"
  },
  {
    scriptPath: "core_replay_v4_actions_runtime.js"
  },
  {
    scriptPath: "core_replay_import_runtime.js"
  },
  {
    scriptPath: "core_replay_execution_runtime.js"
  },
  {
    scriptPath: "core_replay_dispatch_runtime.js"
  },
  {
    scriptPath: "core_replay_lifecycle_runtime.js"
  },
  {
    scriptPath: "core_replay_timer_runtime.js"
  },
  {
    scriptPath: "core_replay_flow_runtime.js"
  },
  {
    scriptPath: "core_replay_control_runtime.js"
  },
  {
    scriptPath: "core_replay_loop_runtime.js"
  },
  {
    scriptPath: "core_move_apply_runtime.js"
  },
  {
    scriptPath: "core_game_settings_storage_runtime.js"
  },
  {
    scriptPath: "core_game_manager_client_record_id_runtime.js"
  },
  {
    scriptPath: "core_game_manager_env_helpers_runtime.js"
  },
  {
    scriptPath: "core_game_manager_base_helpers_runtime.js"
  },
  {
    scriptPath: "core_game_manager_common_runtime.js"
  }
];

function fail(message) {
  throw new Error(message);
}

async function readUtf8(relativePath) {
  const fullPath = path.resolve(repoRoot, relativePath);
  return readFile(fullPath, "utf8");
}

function ensureEntryUsesManifest(entryContent, entryName, pageId) {
  if (!entryContent.includes('bootstrapHomeFamilyPage')) {
    fail(`${entryName}: missing bootstrapHomeFamilyPage import/call`);
  }
  if (!entryContent.includes(`bootstrapHomeFamilyPage("${pageId}")`)) {
    fail(`${entryName}: must call bootstrapHomeFamilyPage("${pageId}")`);
  }
  if (entryContent.includes("loadLegacyScriptsSequentially")) {
    fail(`${entryName}: should not directly call loadLegacyScriptsSequentially`);
  }
}

function ensureDirectPageUsesManifest(entryContent, entryName, pageId) {
  if (!entryContent.includes("bootstrapDirectPage")) {
    fail(`${entryName}: missing bootstrapDirectPage import/call`);
  }
  if (!entryContent.includes(`bootstrapDirectPage("${pageId}"`)) {
    fail(`${entryName}: must call bootstrapDirectPage("${pageId}", ...)`);
  }
  if (entryContent.includes("loadLegacyScriptsSequentially")) {
    fail(`${entryName}: should not directly call loadLegacyScriptsSequentially`);
  }
}

function ensureCapabilityMapped(sharedContent, capability, symbolName) {
  const bindingPattern = new RegExp(`\\b${capability}\\s*:\\s*${symbolName}\\b`);
  if (!bindingPattern.test(sharedContent)) {
    fail(`home-family-shared: capability \"${capability}\" is not mapped to ${symbolName}`);
  }
}

function ensureEntryHasNoLegacyImports(entryContent, entryName) {
  const lines = entryContent.split(/\r?\n/);
  const directLegacyImports = lines.filter(
    (line) =>
      line.startsWith("import ") && (line.includes("../../js/") || line.includes("?url"))
  );
  if (directLegacyImports.length > 0) {
    fail(`${entryName}: should not import runtime scripts directly`);
  }
}

function ensureRetiredRuntimeScriptAbsent(moduleContent, moduleName, retiredScript) {
  const matches = [];
  if (moduleContent.includes(retiredScript.scriptPath)) {
    matches.push(retiredScript.scriptPath);
  }
  if (moduleContent.includes(retiredScript.symbolName)) {
    matches.push(retiredScript.symbolName);
  }
  if (matches.length === 0) return;
  fail(`${moduleName}: retired runtime script still referenced (${matches.join(", ")})`);
}

function detectEntryArchitecture(entryContent) {
  return String(entryContent || "").match(/bootstrapHomeFamilyPage|bootstrapDirectPage/)
    ? "manifest-bootstrap"
    : "direct-module";
}

function collectPageEntryRecords(fileRecords) {
  return PAGE_ENTRY_SPECS.map((spec) => {
    const record = fileRecords.find((entry) => entry.fileName === spec.entryFile) || null;
    return {
      ...spec,
      fileRecord: record
    };
  });
}

function ensureAllPageEntriesExist(pageEntryRecords) {
  const missing = pageEntryRecords.filter((entry) => !entry.fileRecord);
  if (missing.length === 0) return;
  fail(
    "[entry-manifest-audit] missing page entry files: " +
      missing.map((entry) => `${entry.htmlFile} -> ${entry.entryFile}`).join(", ")
  );
}

function ensurePageEntryArchitectures(pageEntryRecords) {
  const mismatches = [];
  for (const entry of pageEntryRecords) {
    if (!entry.fileRecord) continue;
    const actualArchitecture = detectEntryArchitecture(entry.fileRecord.content);
    if (actualArchitecture !== entry.architecture) {
      mismatches.push(
        `${entry.entryFile}: expected ${entry.architecture}, received ${actualArchitecture}`
      );
    }
  }
  if (mismatches.length === 0) return;
  fail("[entry-manifest-audit] page entry architecture drift: " + mismatches.join(", "));
}

function extractScriptImportOrder(moduleContent, exportName, moduleName) {
  const importMatches = Array.from(
    moduleContent.matchAll(/import\s+([A-Za-z0-9_]+)\s+from\s+"[^"]+\?url";/g)
  );
  const importOrder = importMatches.map((match) => match[1]);

  const exportPattern = new RegExp(
    `export const ${exportName} = \\[([\\s\\S]*?)\\] as const;`,
    "m"
  );
  const exportMatch = moduleContent.match(exportPattern);
  if (!exportMatch) {
    fail(`${moduleName}: unable to locate export array ${exportName}`);
  }
  const exportedOrder = exportMatch[1]
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/,$/, ""))
    .filter(Boolean);

  return { importOrder, exportedOrder };
}

function ensureScriptOrderConstraints(order, moduleName, constraints) {
  for (const { before, after } of constraints) {
    const beforeIndex = order.indexOf(before);
    const afterIndex = order.indexOf(after);
    if (beforeIndex < 0 || afterIndex < 0) {
      fail(`${moduleName}: missing order anchor (${before} -> ${after})`);
    }
    if (beforeIndex >= afterIndex) {
      fail(`${moduleName}: invalid order (${before} must be before ${after})`);
    }
  }
}

function ensureImportAndExportOrderAligned(importOrder, exportedOrder, moduleName) {
  if (importOrder.length !== exportedOrder.length) {
    fail(`${moduleName}: import/export script count mismatch`);
  }
  for (let index = 0; index < importOrder.length; index += 1) {
    if (importOrder[index] !== exportedOrder[index]) {
      fail(
        `${moduleName}: exported script order drift at index ${index} (${importOrder[index]} != ${exportedOrder[index]})`
      );
    }
  }
}

async function runEntryManifestAudit() {
  const entryDir = path.resolve(repoRoot, "src", "entries");
  const { readdir } = await import("node:fs/promises");
  const entryDirEntries = await readdir(entryDir, { withFileTypes: true });
  const entryFileRecords = [];
  for (const entry of entryDirEntries) {
    if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
    const filePath = path.resolve(entryDir, entry.name);
    const content = await readFile(filePath, "utf8");
    entryFileRecords.push({ fileName: entry.name, filePath, content });
  }
  const pageEntryRecords = collectPageEntryRecords(entryFileRecords);

  const playEntry = await readUtf8("src/entries/play.ts");
  const replayEntry = await readUtf8("src/entries/replay.ts");
  const accountEntry = await readUtf8("src/entries/account.ts");
  const accountSettingsEntry = await readUtf8("src/entries/account-settings.ts");
  const registerEntry = await readUtf8("src/entries/register.ts");
  const passwordEntry = await readUtf8("src/entries/password.ts");
  const userProfileEntry = await readUtf8("src/entries/user-profile.ts");
  const modesEntry = await readUtf8("src/entries/modes.ts");
  const paletteEntry = await readUtf8("src/entries/palette.ts");
  const cappedEntry = await readUtf8("src/entries/capped.ts");
  const shared = await readUtf8("src/entries/home-family-shared.ts");
  const playRuntimeScripts = await readUtf8("src/entries/play-runtime-scripts.ts");
  const replayRuntimeScripts = await readUtf8("src/entries/replay-runtime-scripts.ts");
  const viteConfig = await readUtf8("vite.config.ts");

  ensureEntryUsesManifest(playEntry, "src/entries/play.ts", "play");
  ensureEntryUsesManifest(replayEntry, "src/entries/replay.ts", "replay");
  ensureDirectPageUsesManifest(accountEntry, "src/entries/account.ts", "account");
  ensureDirectPageUsesManifest(
    accountSettingsEntry,
    "src/entries/account-settings.ts",
    "account-settings"
  );
  ensureDirectPageUsesManifest(registerEntry, "src/entries/register.ts", "register");
  ensureDirectPageUsesManifest(passwordEntry, "src/entries/password.ts", "password");
  ensureDirectPageUsesManifest(userProfileEntry, "src/entries/user-profile.ts", "user-profile");
  ensureDirectPageUsesManifest(await readUtf8("src/entries/history.ts"), "src/entries/history.ts", "history");
  ensureDirectPageUsesManifest(modesEntry, "src/entries/modes.ts", "modes");
  ensureDirectPageUsesManifest(paletteEntry, "src/entries/palette.ts", "palette");
  ensureEntryHasNoLegacyImports(playEntry, "src/entries/play.ts");
  ensureEntryHasNoLegacyImports(replayEntry, "src/entries/replay.ts");
  ensureEntryHasNoLegacyImports(accountEntry, "src/entries/account.ts");
  ensureEntryHasNoLegacyImports(accountSettingsEntry, "src/entries/account-settings.ts");
  ensureEntryHasNoLegacyImports(registerEntry, "src/entries/register.ts");
  ensureEntryHasNoLegacyImports(passwordEntry, "src/entries/password.ts");
  ensureEntryHasNoLegacyImports(userProfileEntry, "src/entries/user-profile.ts");
  ensureEntryHasNoLegacyImports(await readUtf8("src/entries/history.ts"), "src/entries/history.ts");
  ensureEntryHasNoLegacyImports(modesEntry, "src/entries/modes.ts");
  ensureEntryHasNoLegacyImports(paletteEntry, "src/entries/palette.ts");

  ensureCapabilityMapped(shared, "play", "playLegacyScripts");
  ensureCapabilityMapped(shared, "replay", "replayLegacyScripts");
  for (const retiredRuntimeScript of RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS) {
    ensureRetiredRuntimeScriptAbsent(
      playRuntimeScripts,
      "src/entries/play-runtime-scripts.ts",
      retiredRuntimeScript
    );
    ensureRetiredRuntimeScriptAbsent(
      replayRuntimeScripts,
      "src/entries/replay-runtime-scripts.ts",
      retiredRuntimeScript
    );
    ensureRetiredRuntimeScriptAbsent(cappedEntry, "src/entries/capped.ts", retiredRuntimeScript);
    ensureRetiredRuntimeScriptAbsent(shared, "src/entries/home-family-shared.ts", retiredRuntimeScript);
  }
  for (const retiredRuntimeScript of BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS) {
    ensureRetiredRuntimeScriptAbsent(viteConfig, "vite.config.ts", retiredRuntimeScript);
  }
  ensureAllPageEntriesExist(pageEntryRecords);
  ensurePageEntryArchitectures(pageEntryRecords);

  const playOrder = extractScriptImportOrder(
    playRuntimeScripts,
    "playLegacyScripts",
    "src/entries/play-runtime-scripts.ts"
  );
  const replayOrder = extractScriptImportOrder(
    replayRuntimeScripts,
    "replayLegacyScripts",
    "src/entries/replay-runtime-scripts.ts"
  );

  ensureImportAndExportOrderAligned(
    playOrder.importOrder,
    playOrder.exportedOrder,
    "src/entries/play-runtime-scripts.ts"
  );
  ensureImportAndExportOrderAligned(
    replayOrder.importOrder,
    replayOrder.exportedOrder,
    "src/entries/replay-runtime-scripts.ts"
  );

  ensureScriptOrderConstraints(playOrder.exportedOrder, "src/entries/play-runtime-scripts.ts", [
    { before: "coreGameManagerBindingsRuntimeUrl", after: "gameManagerUrl" },
    { before: "coreBootstrapRuntimeUrl", after: "gameManagerUrl" },
    { before: "corePlayPageHostRuntimeUrl", after: "playApplicationUrl" },
    { before: "playApplicationUrl", after: "coreI18nRuntimeUrl" }
  ]);
  ensureScriptOrderConstraints(replayOrder.exportedOrder, "src/entries/replay-runtime-scripts.ts", [
    { before: "coreGameManagerBindingsRuntimeUrl", after: "gameManagerUrl" },
    { before: "gameManagerUrl", after: "coreBootstrapRuntimeUrl" },
    { before: "coreSimplePageHostRuntimeUrl", after: "replayApplicationUrl" },
    { before: "replayApplicationUrl", after: "replayUiUrl" }
  ]);

  console.log(
    "[entry-manifest-audit] PASS: page entries are classified, manifest-driven entries are guarded, and play/replay order is stable"
  );
}

function isDirectCliExecution() {
  return Boolean(process.argv[1] && path.resolve(process.argv[1]) === __filename);
}

if (isDirectCliExecution()) {
  runEntryManifestAudit().catch((err) => {
    console.error(
      `[entry-manifest-audit] FAIL: ${err instanceof Error ? err.message : String(err)}`
    );
    process.exitCode = 1;
  });
}

export {
  BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS,
  PAGE_ENTRY_SPECS,
  RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS,
  collectPageEntryRecords,
  detectEntryArchitecture,
  ensureCapabilityMapped,
  ensureAllPageEntriesExist,
  ensureEntryHasNoLegacyImports,
  ensurePageEntryArchitectures,
  ensureDirectPageUsesManifest,
  ensureEntryUsesManifest,
  ensureImportAndExportOrderAligned,
  ensureRetiredRuntimeScriptAbsent,
  ensureScriptOrderConstraints,
  extractScriptImportOrder,
  isDirectCliExecution,
  runEntryManifestAudit
};
