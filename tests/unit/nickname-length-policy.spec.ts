import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("nickname length policy", () => {
  it("caps register and account-settings nicknames at 10 characters", () => {
    const registerHtml = readFileSync("register.html", "utf8");
    const settingsHtml = readFileSync("account_settings.html", "utf8");
    const registerRuntime = readFileSync("js/register_page.js", "utf8");
    const settingsRuntime = readFileSync("js/account_settings_page.js", "utf8");
    const accountRuntime = readFileSync("js/account_page.js", "utf8");

    expect(registerHtml).toContain('id="register-nickname" class="account-input" type="text" maxlength="10"');
    expect(settingsHtml).toContain('id="settings-new-nickname" class="account-input" type="text" maxlength="10"');

    for (const source of [registerRuntime, settingsRuntime]) {
      expect(source).toContain("nickname.length < 2 || nickname.length > 10");
      expect(source).toContain("2-10");
      expect(source).not.toContain("2-20");
    }

    expect(accountRuntime).toContain("昵称长度需在 2-10 个字符");
    expect(accountRuntime).toContain("Nickname length must be 2-10 characters");
    expect(accountRuntime).not.toContain("2-20");
  });
});
