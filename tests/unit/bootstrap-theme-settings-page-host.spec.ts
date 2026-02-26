import { describe, expect, it, vi } from "vitest";

import { applyThemeSettingsPageInit } from "../../src/bootstrap/theme-settings-page-host";

describe("bootstrap theme settings page host", () => {
  it("returns false result when host runtime api is missing", () => {
    const result = applyThemeSettingsPageInit({
      themeSettingsHostRuntime: {}
    });

    expect(result).toEqual({
      hasApplyUiApi: false,
      hasThemeManager: false,
      didApply: false
    });
  });

  it("delegates theme settings init and resolves ThemeManager from window", () => {
    const applyThemeSettingsUi = vi.fn();
    const themeManager = { id: "theme-manager" };
    const documentLike = { id: "document" };
    const themeSettingsRuntime = { id: "theme-runtime" };
    const windowLike = { ThemeManager: themeManager };

    const result = applyThemeSettingsPageInit({
      themeSettingsHostRuntime: {
        applyThemeSettingsUi
      },
      themeSettingsRuntime,
      documentLike,
      windowLike
    });

    expect(applyThemeSettingsUi).toHaveBeenCalledWith({
      documentLike,
      windowLike,
      themeSettingsRuntime,
      themeManager
    });
    expect(result).toEqual({
      hasApplyUiApi: true,
      hasThemeManager: true,
      didApply: true
    });
  });

  it("passes null theme manager when window has none", () => {
    const applyThemeSettingsUi = vi.fn();

    applyThemeSettingsPageInit({
      themeSettingsHostRuntime: {
        applyThemeSettingsUi
      },
      windowLike: {}
    });

    expect(applyThemeSettingsUi).toHaveBeenCalledWith(
      expect.objectContaining({
        themeManager: null
      })
    );
  });
});
