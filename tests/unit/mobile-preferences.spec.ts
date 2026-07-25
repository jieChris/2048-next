import { describe, expect, it } from "vitest";

import { resolveTogglePreference } from "../../mobile/src/preferences";

describe("mobile preferences", () => {
  it("keeps explicit toggle values and applies each product default", () => {
    expect(resolveTogglePreference("true", false)).toBe(true);
    expect(resolveTogglePreference("false", true)).toBe(false);
    expect(resolveTogglePreference(null, true)).toBe(true);
    expect(resolveTogglePreference("1", false)).toBe(false);
  });
});
