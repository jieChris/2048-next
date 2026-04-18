import { expect, test } from "@playwright/test";

test.describe("Legacy Multi-Page Smoke", () => {
  test("play page keeps background music lazy and persists the settings toggle", async ({
    page
  }) => {
    const response = await page.goto("/play.html?mode_key=classic_4x4_pow2_undo", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Play response should exist").not.toBeNull();
    expect(response?.ok(), "Play response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();

    await page.waitForFunction(() => {
      const runtime = (window as any).CoreBgmRuntime;
      return Boolean(
        runtime &&
          typeof runtime.setBgmEnabled === "function" &&
          typeof runtime.syncBgmSettingsUI === "function" &&
          typeof runtime.getBgmRuntimeSnapshot === "function" &&
          typeof (window as any).openSettingsModal === "function"
      );
    }, null, { timeout: 15000 });

    const before = await page.evaluate(() => {
      const runtime = (window as any).CoreBgmRuntime;
      return runtime.getBgmRuntimeSnapshot();
    });

    expect(before.enabled).toBe(false);
    expect(before.hasAudio).toBe(false);

    await page.evaluate(() => {
      (window as any).openSettingsModal();
    });

    await expect(page.locator("#settings-modal")).toHaveCSS("display", "flex");
    await expect(page.locator("label.settings-switch[for='bgm-toggle']")).toBeVisible();
    await expect(page.locator("#bgm-note")).toHaveText(/.+/);

    await page.click("label.settings-switch[for='bgm-toggle']");
    await page.waitForFunction(() => {
      return window.localStorage.getItem("settings_bgm_enabled_v1") === "1";
    });
    await expect(page.locator("#bgm-toggle")).toBeChecked();

    const afterEnable = await page.evaluate(() => {
      const runtime = (window as any).CoreBgmRuntime;
      return {
        storageValue: window.localStorage.getItem("settings_bgm_enabled_v1"),
        snapshot: runtime.getBgmRuntimeSnapshot()
      };
    });

    expect(afterEnable.storageValue).toBe("1");
    expect(afterEnable.snapshot.enabled).toBe(true);
    expect(afterEnable.snapshot.hasAudio).toBe(true);
    expect(
      ["/audio/windows-bgm.ogg", "/audio/windows-bgm.m4a"].some((suffix) =>
        String(afterEnable.snapshot.audioSrc || "").includes(suffix)
      )
    ).toBe(true);
    expect(
      ["audio/windows-bgm.ogg", "audio/windows-bgm.m4a"].includes(
        String(afterEnable.snapshot.sourcePath || "")
      )
    ).toBe(true);
    expect(afterEnable.snapshot.audioPreload).toBe("none");
    expect(afterEnable.snapshot.audioLoop).toBe(true);

    await page.click("label.settings-switch[for='bgm-toggle']");
    await page.waitForFunction(() => {
      return window.localStorage.getItem("settings_bgm_enabled_v1") === "0";
    });
    await expect(page.locator("#bgm-toggle")).not.toBeChecked();

    const afterDisable = await page.evaluate(() => {
      const runtime = (window as any).CoreBgmRuntime;
      return {
        storageValue: window.localStorage.getItem("settings_bgm_enabled_v1"),
        snapshot: runtime.getBgmRuntimeSnapshot()
      };
    });

    expect(afterDisable.storageValue).toBe("0");
    expect(afterDisable.snapshot.enabled).toBe(false);
    expect(afterDisable.snapshot.audioPaused).toBe(true);
  });
});
