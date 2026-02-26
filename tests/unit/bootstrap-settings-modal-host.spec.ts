import { describe, expect, it, vi } from "vitest";

import {
  applySettingsModalCloseOrchestration,
  applySettingsModalOpenOrchestration
} from "../../src/bootstrap/settings-modal-host";

describe("bootstrap settings modal host", () => {
  it("opens settings modal and runs init chain", () => {
    const applySettingsModalOpen = vi.fn();
    const removeLegacyUndoSettingsUI = vi.fn();
    const initThemeSettingsUI = vi.fn();
    const initTimerModuleSettingsUI = vi.fn();
    const initHomeGuideSettingsUI = vi.fn();
    const documentLike = { key: "document" };

    const result = applySettingsModalOpenOrchestration({
      replayModalRuntime: {
        applySettingsModalOpen
      },
      documentLike,
      removeLegacyUndoSettingsUI,
      initThemeSettingsUI,
      initTimerModuleSettingsUI,
      initHomeGuideSettingsUI
    });

    expect(result).toEqual({
      didOpen: true,
      initCallCount: 4
    });
    expect(applySettingsModalOpen).toHaveBeenCalledTimes(1);
    expect(applySettingsModalOpen).toHaveBeenCalledWith({
      documentLike
    });
    expect(removeLegacyUndoSettingsUI).toHaveBeenCalledTimes(1);
    expect(initThemeSettingsUI).toHaveBeenCalledTimes(1);
    expect(initTimerModuleSettingsUI).toHaveBeenCalledTimes(1);
    expect(initHomeGuideSettingsUI).toHaveBeenCalledTimes(1);
  });

  it("returns partial open result when replay runtime is missing", () => {
    const initThemeSettingsUI = vi.fn();

    const result = applySettingsModalOpenOrchestration({
      replayModalRuntime: {},
      initThemeSettingsUI
    });

    expect(result).toEqual({
      didOpen: false,
      initCallCount: 1
    });
    expect(initThemeSettingsUI).toHaveBeenCalledTimes(1);
  });

  it("closes settings modal when replay runtime method exists", () => {
    const applySettingsModalClose = vi.fn();
    const documentLike = { key: "document" };

    const result = applySettingsModalCloseOrchestration({
      replayModalRuntime: {
        applySettingsModalClose
      },
      documentLike
    });

    expect(result).toEqual({
      didClose: true
    });
    expect(applySettingsModalClose).toHaveBeenCalledTimes(1);
    expect(applySettingsModalClose).toHaveBeenCalledWith({
      documentLike
    });
  });

  it("returns false close status when replay runtime method is missing", () => {
    const result = applySettingsModalCloseOrchestration({
      replayModalRuntime: {}
    });

    expect(result).toEqual({
      didClose: false
    });
  });
});
