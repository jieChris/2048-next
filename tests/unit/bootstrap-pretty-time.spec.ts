import { describe, expect, it } from "vitest";

import { formatPrettyTime } from "../../src/bootstrap/pretty-time";

describe("bootstrap pretty time", () => {
  it("returns DNF for negative or invalid values", () => {
    expect(formatPrettyTime(-1)).toBe("DNF");
    expect(formatPrettyTime("x")).toBe("DNF");
  });

  it("formats milliseconds under one minute", () => {
    expect(formatPrettyTime(0)).toBe("0.000");
    expect(formatPrettyTime(1234)).toBe("1.234");
  });

  it("formats minutes and hours with zero padding", () => {
    expect(formatPrettyTime(61_234)).toBe("1:01.234");
    expect(formatPrettyTime(3_661_234)).toBe("1:01:01.234");
  });
});
