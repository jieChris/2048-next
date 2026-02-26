import { describe, expect, it, vi } from "vitest";

import {
  applySettingsModalPageClose,
  applySettingsModalPageOpen
} from "../../src/bootstrap/settings-modal-page-host";

describe("bootstrap settings modal page host", () => {
  it("returns false result when open api is missing", () => {
    const result = applySettingsModalPageOpen({
      settingsModalHostRuntime: {}
    });

    expect(result).toEqual({
      hasApplyOpenApi: false,
      didApply: false
    });
  });

  it("delegates modal open orchestration to host runtime", () => {
    const applySettingsModalOpenOrchestration = vi.fn();
    const documentLike = { id: "document" };
    const replayModalRuntime = { id: "replay" };
    const removeLegacyUndoSettingsUI = vi.fn();
    const initThemeSettingsUI = vi.fn();
    const initTimerModuleSettingsUI = vi.fn();
    const initHomeGuideSettingsUI = vi.fn();

    const result = applySettingsModalPageOpen({
      settingsModalHostRuntime: {
        applySettingsModalOpenOrchestration
      },
      replayModalRuntime,
      documentLike,
      removeLegacyUndoSettingsUI,
      initThemeSettingsUI,
      initTimerModuleSettingsUI,
      initHomeGuideSettingsUI
    });

    expect(applySettingsModalOpenOrchestration).toHaveBeenCalledWith({
      replayModalRuntime,
      documentLike,
      removeLegacyUndoSettingsUI,
      initThemeSettingsUI,
      initTimerModuleSettingsUI,
      initHomeGuideSettingsUI
    });
    expect(result).toEqual({
      hasApplyOpenApi: true,
      didApply: true
    });
  });

  it("returns false result when close api is missing", () => {
    const result = applySettingsModalPageClose({
      settingsModalHostRuntime: {}
    });

    expect(result).toEqual({
      hasApplyCloseApi: false,
      didApply: false
    });
  });

  it("delegates modal close orchestration to host runtime", () => {
    const applySettingsModalCloseOrchestration = vi.fn();
    const replayModalRuntime = { id: "replay" };
    const documentLike = { id: "document" };

    const result = applySettingsModalPageClose({
      settingsModalHostRuntime: {
        applySettingsModalCloseOrchestration
      },
      replayModalRuntime,
      documentLike
    });

    expect(applySettingsModalCloseOrchestration).toHaveBeenCalledWith({
      replayModalRuntime,
      documentLike
    });
    expect(result).toEqual({
      hasApplyCloseApi: true,
      didApply: true
    });
  });
});
