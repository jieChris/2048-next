import * as indexUiPageActionsHostRuntime from "../bootstrap/index-ui-page-actions-host";
import * as indexUiPageHostRuntime from "../bootstrap/index-ui-page-host";
import * as indexUiPageResolversHostRuntime from "../bootstrap/index-ui-page-resolvers-host";
import * as indexUiRuntimeContractRuntime from "../bootstrap/index-ui-runtime-contract";
import { installIndexUiStartupHostRuntime } from "../bootstrap/index-ui-startup-host";
import * as mobileHintRuntime from "../bootstrap/mobile-hint";
import * as mobileHintHostRuntime from "../bootstrap/mobile-hint-host";
import * as mobileHintModalRuntime from "../bootstrap/mobile-hint-modal";
import * as mobileHintOpenHostRuntime from "../bootstrap/mobile-hint-open-host";
import * as mobileHintPageHostRuntime from "../bootstrap/mobile-hint-page-host";
import * as mobileHintUiRuntime from "../bootstrap/mobile-hint-ui";
import * as mobileHintUiHostRuntime from "../bootstrap/mobile-hint-ui-host";
import * as mobileTimerboxRuntime from "../bootstrap/mobile-timerbox";
import * as mobileTimerboxHostRuntime from "../bootstrap/mobile-timerbox-host";
import * as mobileTimerboxPageHostRuntime from "../bootstrap/mobile-timerbox-page-host";
import * as mobileTopButtonsRuntime from "../bootstrap/mobile-top-buttons";
import * as mobileTopButtonsPageHostRuntime from "../bootstrap/mobile-top-buttons-page-host";
import * as mobileUndoTopRuntime from "../bootstrap/mobile-undo-top";
import * as mobileUndoTopAvailabilityHostRuntime from "../bootstrap/mobile-undo-top-availability-host";
import * as mobileUndoTopHostRuntime from "../bootstrap/mobile-undo-top-host";
import * as mobileViewportRuntime from "../bootstrap/mobile-viewport";
import * as mobileViewportPageHostRuntime from "../bootstrap/mobile-viewport-page-host";
import * as practiceTransferRuntime from "../bootstrap/practice-transfer";
import * as practiceTransferHostRuntime from "../bootstrap/practice-transfer-host";
import * as practiceTransferPageHostRuntime from "../bootstrap/practice-transfer-page-host";
import { installReplayExportRuntime } from "../bootstrap/replay-export";
import { installReplayModalRuntime } from "../bootstrap/replay-modal";
import { installReplayPageHostRuntime } from "../bootstrap/replay-page-host";
import { installSettingsModalHostRuntime } from "../bootstrap/settings-modal-host";
import { installSettingsModalPageHostRuntime } from "../bootstrap/settings-modal-page-host";
import * as storageRuntime from "../bootstrap/storage";
import * as themeSettingsRuntime from "../bootstrap/theme-settings";
import * as themeSettingsHostRuntime from "../bootstrap/theme-settings-host";
import * as themeSettingsPageHostRuntime from "../bootstrap/theme-settings-page-host";
import * as timerModuleRuntime from "../bootstrap/timer-module";
import * as timerModuleSettingsHostRuntime from "../bootstrap/timer-module-settings-host";
import * as timerModuleSettingsPageHostRuntime from "../bootstrap/timer-module-settings-page-host";
import * as topActionBindingsHostRuntime from "../bootstrap/top-action-bindings-host";
import * as topActionsRuntime from "../bootstrap/top-actions";
import * as topActionsHostRuntime from "../bootstrap/top-actions-host";
import * as topActionsPageHostRuntime from "../bootstrap/top-actions-page-host";

const INDEX_UI_RUNTIME_GLOBALS: readonly (readonly [string, Record<string, unknown>])[] = [
  ["CorePracticeTransferRuntime", practiceTransferRuntime as unknown as Record<string, unknown>],
  ["CorePracticeTransferHostRuntime", practiceTransferHostRuntime as unknown as Record<string, unknown>],
  ["CorePracticeTransferPageHostRuntime", practiceTransferPageHostRuntime as unknown as Record<string, unknown>],
  ["CoreTimerModuleRuntime", timerModuleRuntime as unknown as Record<string, unknown>],
  ["CoreTimerModuleSettingsHostRuntime", timerModuleSettingsHostRuntime as unknown as Record<string, unknown>],
  [
    "CoreTimerModuleSettingsPageHostRuntime",
    timerModuleSettingsPageHostRuntime as unknown as Record<string, unknown>
  ],
  ["CoreThemeSettingsRuntime", themeSettingsRuntime as unknown as Record<string, unknown>],
  ["CoreThemeSettingsHostRuntime", themeSettingsHostRuntime as unknown as Record<string, unknown>],
  ["CoreThemeSettingsPageHostRuntime", themeSettingsPageHostRuntime as unknown as Record<string, unknown>],
  ["CoreMobileHintRuntime", mobileHintRuntime as unknown as Record<string, unknown>],
  ["CoreMobileHintUiRuntime", mobileHintUiRuntime as unknown as Record<string, unknown>],
  ["CoreMobileHintModalRuntime", mobileHintModalRuntime as unknown as Record<string, unknown>],
  ["CoreMobileHintOpenHostRuntime", mobileHintOpenHostRuntime as unknown as Record<string, unknown>],
  ["CoreMobileHintUiHostRuntime", mobileHintUiHostRuntime as unknown as Record<string, unknown>],
  ["CoreMobileHintHostRuntime", mobileHintHostRuntime as unknown as Record<string, unknown>],
  ["CoreMobileHintPageHostRuntime", mobileHintPageHostRuntime as unknown as Record<string, unknown>],
  ["CoreMobileTimerboxRuntime", mobileTimerboxRuntime as unknown as Record<string, unknown>],
  ["CoreMobileTimerboxHostRuntime", mobileTimerboxHostRuntime as unknown as Record<string, unknown>],
  ["CoreMobileTimerboxPageHostRuntime", mobileTimerboxPageHostRuntime as unknown as Record<string, unknown>],
  ["CoreMobileUndoTopRuntime", mobileUndoTopRuntime as unknown as Record<string, unknown>],
  ["CoreMobileUndoTopHostRuntime", mobileUndoTopHostRuntime as unknown as Record<string, unknown>],
  ["CoreMobileUndoTopAvailabilityHostRuntime", mobileUndoTopAvailabilityHostRuntime as unknown as Record<string, unknown>],
  ["CoreTopActionsRuntime", topActionsRuntime as unknown as Record<string, unknown>],
  ["CoreTopActionsHostRuntime", topActionsHostRuntime as unknown as Record<string, unknown>],
  ["CoreTopActionsPageHostRuntime", topActionsPageHostRuntime as unknown as Record<string, unknown>],
  ["CoreMobileTopButtonsRuntime", mobileTopButtonsRuntime as unknown as Record<string, unknown>],
  ["CoreMobileTopButtonsPageHostRuntime", mobileTopButtonsPageHostRuntime as unknown as Record<string, unknown>],
  ["CoreMobileViewportRuntime", mobileViewportRuntime as unknown as Record<string, unknown>],
  ["CoreMobileViewportPageHostRuntime", mobileViewportPageHostRuntime as unknown as Record<string, unknown>],
  ["CoreStorageRuntime", storageRuntime as unknown as Record<string, unknown>],
  ["CoreTopActionBindingsHostRuntime", topActionBindingsHostRuntime as unknown as Record<string, unknown>],
  ["CoreIndexUiRuntimeContractRuntime", indexUiRuntimeContractRuntime as unknown as Record<string, unknown>],
  ["CoreIndexUiPageHostRuntime", indexUiPageHostRuntime as unknown as Record<string, unknown>],
  ["CoreIndexUiPageResolversHostRuntime", indexUiPageResolversHostRuntime as unknown as Record<string, unknown>],
  ["CoreIndexUiPageActionsHostRuntime", indexUiPageActionsHostRuntime as unknown as Record<string, unknown>]
];
const PRESERVE_EXISTING_RUNTIME_GLOBALS = new Set(["CoreTopActionBindingsHostRuntime"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function installIndexUiRuntimeGlobals(): void {
  if (typeof window === "undefined") return;
  const windowRecord = window as unknown as Record<string, unknown>;
  for (const [key, runtime] of INDEX_UI_RUNTIME_GLOBALS) {
    const existingRuntime = windowRecord[key];
    if (isRecord(existingRuntime)) {
      if (
        PRESERVE_EXISTING_RUNTIME_GLOBALS.has(key) &&
        asFunction(existingRuntime.applyTopActionBindings)
      ) {
        continue;
      }
      Object.assign(existingRuntime, runtime);
      continue;
    }
    windowRecord[key] = { ...runtime };
  }
}

function installIndexUiHostRuntimes(): void {
  installIndexUiStartupHostRuntime();
  installReplayExportRuntime();
  installReplayModalRuntime();
  installReplayPageHostRuntime();
  installSettingsModalHostRuntime();
  installSettingsModalPageHostRuntime();
}

export function applyIndexUiBootstrapFromTsRuntime(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  installIndexUiHostRuntimes();
  installIndexUiRuntimeGlobals();
  const windowLike = window;
  const windowRecord = window as unknown as Record<string, unknown>;
  const indexUiRuntimeContractRuntimeGlobal = toRecord(
    windowRecord.CoreIndexUiRuntimeContractRuntime
  );
  const resolveIndexUiRuntimeContractsCompat = asFunction<
    (runtimeLike: unknown, windowLike: unknown) => indexUiRuntimeContractRuntime.IndexUiRuntimeContractsBundle
  >(indexUiRuntimeContractRuntimeGlobal.resolveIndexUiRuntimeContractsCompat);
  if (!resolveIndexUiRuntimeContractsCompat) {
    throw new Error("CoreIndexUiRuntimeContractRuntime is required");
  }
  const indexUiRuntimeContractsBundle = resolveIndexUiRuntimeContractsCompat(
    indexUiRuntimeContractRuntimeGlobal,
    windowLike
  );
  const modalContracts = indexUiRuntimeContractsBundle.modalContracts;
  const coreContracts = indexUiRuntimeContractsBundle.coreContracts;
  const indexUiPageHostRuntimeGlobal = toRecord(coreContracts.indexUiPageHostRuntime);
  const createIndexUiTryUndoHandler = asFunction<(input: unknown) => () => boolean>(
    indexUiPageHostRuntimeGlobal.createIndexUiTryUndoHandler
  );
  const createIndexUiBootstrapResolvers = asFunction<
    (input: unknown) => indexUiPageHostRuntime.IndexUiBootstrapResolvers
  >(indexUiPageHostRuntimeGlobal.createIndexUiBootstrapResolvers);
  const applyIndexUiPageBootstrap = asFunction<(input: unknown) => unknown>(
    indexUiPageHostRuntimeGlobal.applyIndexUiPageBootstrap
  );
  if (!createIndexUiTryUndoHandler || !createIndexUiBootstrapResolvers || !applyIndexUiPageBootstrap) {
    throw new Error("CoreIndexUiPageHostRuntime is required");
  }
  const tryUndoFromUi = createIndexUiTryUndoHandler({
    undoActionRuntime: coreContracts.undoActionRuntime,
    windowLike
  });
  const indexUiBootstrapResolvers = createIndexUiBootstrapResolvers({
    indexUiPageResolversHostRuntime: coreContracts.indexUiPageResolversHostRuntime,
    indexUiPageActionsHostRuntime: coreContracts.indexUiPageActionsHostRuntime,
    coreContracts,
    modalContracts,
    documentLike: document,
    windowLike,
    tryUndoFromUi
  });

  applyIndexUiPageBootstrap({
    indexUiStartupHostRuntime: coreContracts.indexUiStartupHostRuntime,
    topActionBindingsHostRuntime: coreContracts.topActionBindingsHostRuntime,
    gameOverUndoHostRuntime: coreContracts.gameOverUndoHostRuntime,
    documentLike: document,
    windowLike,
    tryUndoFromUi,
    exportReplay: indexUiBootstrapResolvers.exportReplay,
    closeReplayModal: indexUiBootstrapResolvers.closeReplayModal,
    openPracticeBoardFromCurrent: indexUiBootstrapResolvers.openPracticeBoardFromCurrent,
    openSettingsModal: indexUiBootstrapResolvers.openSettingsModal,
    closeSettingsModal: indexUiBootstrapResolvers.closeSettingsModal,
    initThemeSettingsUI: indexUiBootstrapResolvers.initThemeSettingsUI,
    removeLegacyUndoSettingsUI: indexUiBootstrapResolvers.removeLegacyUndoSettingsUI,
    initTimerModuleSettingsUI: indexUiBootstrapResolvers.initTimerModuleSettingsUI,
    initMobileHintToggle: indexUiBootstrapResolvers.initMobileHintToggle,
    initMobileUndoTopButton: indexUiBootstrapResolvers.initMobileUndoTopButton,
    initMobileTimerboxToggle: indexUiBootstrapResolvers.initMobileTimerboxToggle,
    requestResponsiveGameRelayout: indexUiBootstrapResolvers.requestResponsiveGameRelayout,
    syncMobileTimerboxUI: indexUiBootstrapResolvers.syncMobileTimerboxUI,
    syncMobileHintUI: indexUiBootstrapResolvers.syncMobileHintUI,
    syncMobileUndoTopButtonAvailability: indexUiBootstrapResolvers.syncMobileUndoTopButtonAvailability,
    prettyTimeRuntime: coreContracts.prettyTimeRuntime
  });
}
