import { describe, expect, it } from "vitest";

import {
  resolveTheme,
  resolveThemePreference
} from "../../mobile/src/theme";

describe("mobile theme", () => {
  it.each([
    [null, "system"],
    ["", "system"],
    ["system", "system"],
    ["light", "light"],
    ["dark", "dark"],
    ["midnight", "system"]
  ] as const)("normalizes %s to %s", (value, expected) => {
    expect(resolveThemePreference(value)).toBe(expected);
  });

  it("resolves system, light, and dark without duplicating page markup", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});
