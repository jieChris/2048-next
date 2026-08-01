import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("register password policy", () => {
  it("matches the backend's 10-character minimum and translates its error code", () => {
    const source = readFileSync("js/register_page.js", "utf8");

    expect(source).toContain("password.length < 10 || password.length > 16");
    expect(source).toContain('INVALID_PASSWORD: "\\u5bc6\\u7801\\u9700\\u4e3a10-16\\u4f4d');
    expect(source).toContain('INVALID_PASSWORD: "Password must be 10-16 chars');
  });
});
