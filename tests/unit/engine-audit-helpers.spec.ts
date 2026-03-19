import { describe, expect, it } from "vitest";

import {
  ENGINE_AUDIT_RULES,
  countMatches,
  ensureExactlyOne,
  validateEngineSource
} from "../../scripts/engine-audit.mjs";

function makeValidEngineSource() {
  return [
    "export function createEngineFacade() {}",
    "export function createEngineSession() {}",
    "type UndoSnapshotLike = { value: number };"
  ].join("\n");
}

describe("engine-audit helpers", () => {
  it("counts regex matches", () => {
    expect(countMatches("abc abc", /abc/g)).toBe(2);
  });

  it("passes when declaration appears exactly once", () => {
    expect(() =>
      ensureExactlyOne(
        "export function createEngineFacade() {}",
        "createEngineFacade",
        /export\s+function\s+createEngineFacade\s*\(/g
      )
    ).not.toThrow();
  });

  it("throws when declaration count is not 1", () => {
    expect(() =>
      ensureExactlyOne("", "createEngineFacade", /createEngineFacade/g)
    ).toThrow(/declaration count expected 1 but got 0/);
  });

  it("validates default engine audit rules", () => {
    expect(() => validateEngineSource(makeValidEngineSource())).not.toThrow();
    expect(ENGINE_AUDIT_RULES).toHaveLength(3);
  });

  it("can validate custom rules", () => {
    const source = "const sentinel = true;";
    const rules = [{ label: "sentinel", regex: /sentinel/g }];

    expect(() => validateEngineSource(source, rules)).not.toThrow();
    expect(() => validateEngineSource("const noop = true;", rules)).toThrow(
      /sentinel declaration count expected 1 but got 0/
    );
  });
});
