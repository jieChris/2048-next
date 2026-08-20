import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("register password policy", () => {
  it("uses the shared policy and translates backend errors in every account flow", () => {
    const sources = [
      "js/register_page.js",
      "js/password_page.js",
      "js/account_settings_page.js",
      "js/account_page.js"
    ].map((file) => readFileSync(file, "utf8"));

    for (const source of sources) {
      expect(source).toContain("isValidAccountPassword");
      expect(source).toContain("INVALID_PASSWORD:");
      expect(source).toMatch(/10-16(?:\\u4f4d| chars| 位)/);
      expect(source).not.toMatch(/密码需(?:为| )?8-16|Password must be 8-16/);
    }
    expect(sources.join("\n")).not.toMatch(
      /(?:register-password|password-reset-new-password|password-change-new-password|settings-new-password)[^\n]*\.trim\(\)/
    );
  });

  it("does not let asynchronous nickname validation erase password errors", () => {
    const source = readFileSync("js/register_page.js", "utf8");
    const nicknameValidation = source.slice(
      source.indexOf("async function validateNicknameAvailability"),
      source.indexOf("function readRegisterForm")
    );

    expect(nicknameValidation).not.toContain('setTip("", "")');
  });
});
