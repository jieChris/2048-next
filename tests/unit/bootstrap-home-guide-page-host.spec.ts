import { describe, expect, it, vi } from "vitest";

import {
  applyHomeGuideAutoStartPage,
  applyHomeGuideAutoStartPageFromContext,
  applyHomeGuideSettingsPageInit
} from "../../src/bootstrap/home-guide-page-host";

describe("bootstrap home guide page host", () => {
  it("returns false result when settings host api is missing", () => {
    const result = applyHomeGuideSettingsPageInit({
      homeGuideSettingsHostRuntime: {}
    });

    expect(result).toEqual({
      hasApplySettingsUiApi: false,
      didApply: false
    });
  });

  it("delegates settings init to settings host runtime", () => {
    const applyHomeGuideSettingsUi = vi.fn();
    const documentLike = { id: "document" };
    const windowLike = { id: "window" };
    const homeGuideRuntime = { id: "runtime" };
    const homeGuideState = { active: false };
    const isHomePage = vi.fn(() => true);
    const closeSettingsModal = vi.fn();
    const startHomeGuide = vi.fn();

    const result = applyHomeGuideSettingsPageInit({
      homeGuideSettingsHostRuntime: {
        applyHomeGuideSettingsUi
      },
      documentLike,
      windowLike,
      homeGuideRuntime,
      homeGuideState,
      isHomePage,
      closeSettingsModal,
      startHomeGuide
    });

    expect(applyHomeGuideSettingsUi).toHaveBeenCalledWith({
      documentLike,
      windowLike,
      homeGuideRuntime,
      homeGuideState,
      isHomePage,
      closeSettingsModal,
      startHomeGuide
    });
    expect(result).toEqual({
      hasApplySettingsUiApi: true,
      didApply: true
    });
  });

  it("returns false result when startup host api is missing", () => {
    const result = applyHomeGuideAutoStartPage({
      homeGuideStartupHostRuntime: {}
    });

    expect(result).toEqual({
      hasApplyAutoStartApi: false,
      didApply: false
    });
  });

  it("delegates auto-start orchestration to startup host runtime", () => {
    const applyHomeGuideAutoStart = vi.fn();
    const homeGuideRuntime = { id: "runtime" };
    const locationLike = { pathname: "/index.html" };
    const storageLike = { getItem: vi.fn(() => null) };
    const startHomeGuide = vi.fn();
    const setTimeoutLike = vi.fn();

    const result = applyHomeGuideAutoStartPage({
      homeGuideStartupHostRuntime: {
        applyHomeGuideAutoStart
      },
      homeGuideRuntime,
      locationLike,
      storageLike,
      seenKey: "home_guide_seen_v1",
      startHomeGuide,
      setTimeoutLike,
      delayMs: 260
    });

    expect(applyHomeGuideAutoStart).toHaveBeenCalledWith({
      homeGuideRuntime,
      locationLike,
      storageLike,
      seenKey: "home_guide_seen_v1",
      startHomeGuide,
      setTimeoutLike,
      delayMs: 260
    });
    expect(result).toEqual({
      hasApplyAutoStartApi: true,
      didApply: true
    });
  });

  it("resolves localStorage from context and delegates auto-start orchestration", () => {
    const applyHomeGuideAutoStart = vi.fn();
    const storageLike = { getItem: vi.fn(() => null) };

    const result = applyHomeGuideAutoStartPageFromContext({
      homeGuideStartupHostRuntime: {
        applyHomeGuideAutoStart
      },
      homeGuideRuntime: { id: "runtime" },
      locationLike: { pathname: "/index.html" },
      storageRuntime: {
        resolveStorageByName(payload: { storageName?: string }) {
          return payload.storageName === "localStorage" ? storageLike : null;
        }
      },
      windowLike: { localStorage: storageLike },
      seenKey: "home_guide_seen_v1",
      startHomeGuide: vi.fn(),
      setTimeoutLike: vi.fn(),
      delayMs: 260
    });

    expect(result.didInvokePageAutoStart).toBe(true);
    expect(result.localStorageResolved).toBe(true);
    expect(result.pageResult).toEqual({
      hasApplyAutoStartApi: true,
      didApply: true
    });
    expect(applyHomeGuideAutoStart).toHaveBeenCalledWith(
      expect.objectContaining({
        storageLike,
        seenKey: "home_guide_seen_v1"
      })
    );
  });
});
