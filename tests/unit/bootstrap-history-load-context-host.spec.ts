import { describe, expect, it } from "vitest";

import { resolveHistoryLoadPanelContext } from "../../src/bootstrap/history-load-context-host";

describe("bootstrap history load context host", () => {
  it("builds history panel context with defaults", () => {
    const getElementById = () => null;
    const context = resolveHistoryLoadPanelContext({
      getElementById,
      documentLike: {},
      localHistoryStore: {},
      modeCatalog: {},
      historyAdapterHostRuntime: {},
      historyAdapterDiagnosticsRuntime: {},
      historyRecordViewRuntime: {},
      historyRecordItemRuntime: {},
      historyRecordActionsRuntime: {},
      historyRecordHostRuntime: {},
      historyExportRuntime: {},
      historyRecordListHostRuntime: {},
      historyBoardRuntime: {},
      confirmAction: () => true,
      navigateToHref: () => undefined,
      historyBurnInHostRuntime: {},
      historyBurnInRuntime: {},
      runtime: {},
      readStorageValue: () => null,
      adapterModeStorageKey: "adapter_mode",
      defaultModeStorageKey: "default_mode",
      forceLegacyStorageKey: "force_legacy",
      historyCanarySourceRuntime: {},
      historyCanaryPolicyRuntime: {},
      historyCanaryViewRuntime: {},
      historyCanaryPanelRuntime: {},
      historyCanaryActionRuntime: {},
      historyCanaryHostRuntime: {},
      writeStorageValue: () => true
    });

    expect(context.getElementById).toBe(getElementById);
    expect(context.listElementId).toBe("history-list");
    expect(context.burnInPanelElementId).toBe("history-burnin-summary");
    expect(context.adapterFilterElementId).toBe("history-adapter-filter");
    expect(context.canaryPanelElementId).toBe("history-canary-policy");
    expect(context.adapterModeStorageKey).toBe("adapter_mode");
    expect(context.defaultModeStorageKey).toBe("default_mode");
    expect(context.forceLegacyStorageKey).toBe("force_legacy");
  });

  it("accepts explicit element ids when provided", () => {
    const context = resolveHistoryLoadPanelContext({
      listElementId: "custom-list",
      burnInPanelElementId: "custom-burnin",
      adapterFilterElementId: "custom-filter",
      canaryPanelElementId: "custom-canary"
    });

    expect(context.listElementId).toBe("custom-list");
    expect(context.burnInPanelElementId).toBe("custom-burnin");
    expect(context.adapterFilterElementId).toBe("custom-filter");
    expect(context.canaryPanelElementId).toBe("custom-canary");
  });
});
