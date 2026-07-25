import { describe, expect, it } from "vitest";

import {
  APP_MESSAGES,
  createTranslator,
  resolveLocale,
  resolveLocalePreference,
  resolveSystemLocale,
  type AppLocale
} from "../../mobile/src/i18n";

describe("mobile i18n", () => {
  it.each([
    [["zh-CN"], "zh-CN"],
    [["zh-Hant-TW"], "zh-CN"],
    [["en-US"], "en"],
    [["en-GB"], "en"],
    [["fr-FR", "en-US"], "zh-CN"],
    [[], "zh-CN"]
  ] satisfies ReadonlyArray<readonly [readonly string[], AppLocale]>) (
    "resolves %j to %s",
    (languages, expected) => {
      expect(resolveSystemLocale(languages)).toBe(expected);
    }
  );

  it("keeps the simplified Chinese and English dictionaries complete", () => {
    expect(Object.keys(APP_MESSAGES.en).sort()).toEqual(
      Object.keys(APP_MESSAGES["zh-CN"]).sort()
    );
  });

  it("persists a system, Chinese, or English locale preference", () => {
    expect(resolveLocalePreference(null)).toBe("system");
    expect(resolveLocalePreference("fr")).toBe("system");
    expect(resolveLocalePreference("zh-CN")).toBe("zh-CN");
    expect(resolveLocalePreference("en")).toBe("en");
    expect(resolveLocale("system", ["en-US"])).toBe("en");
    expect(resolveLocale("system", ["ja-JP"])).toBe("zh-CN");
    expect(resolveLocale("zh-CN", ["en-US"])).toBe("zh-CN");
  });

  it("translates the approved privacy and empty-home shell copy", () => {
    expect(createTranslator("zh-CN")("privacy.title")).toBe("开始之前");
    expect(createTranslator("en")("privacy.offlineAction")).toBe(
      "Continue offline"
    );
    expect(createTranslator("zh-CN")("home.title")).toBe("今天继续一局");
  });
});
