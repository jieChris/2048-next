import { describe, expect, it } from "vitest";

import {
  ENGINE_FORBIDDEN_PATTERNS,
  ENGINE_AUDIT_RULES,
  LEGACY_MOVE_AUDIT_RULES,
  countMatches,
  ensureExactlyOne,
  ensureNoMatches,
  validateEngineSource,
  validateLegacyMoveSource
} from "../../scripts/engine-audit.mjs";

function makeValidEngineSource() {
  return [
    "export function createEngineFacade() {}",
    "export function createEngineSession() {}",
    "const APP_MODE_SPECS: Record<string, unknown> = {};"
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

  it("rejects forbidden runtime dependencies and precomputed move inputs", () => {
    expect(() => ensureNoMatches("const value = 1;", "browser", /window/g)).not.toThrow();
    expect(() => ensureNoMatches("window.location", "browser", /window/g)).toThrow(
      /forbidden match count expected 0 but got 1/
    );
    expect(() =>
      validateEngineSource(`${makeValidEngineSource()}\nDate.now();`)
    ).toThrow(/wall-clock read/);
    expect(ENGINE_FORBIDDEN_PATTERNS.length).toBeGreaterThan(0);
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

  it("requires the live Web move gateway to delegate shared modes once", () => {
    const source = [
      "function tryMoveWithSharedGameSession() {}",
      "function move(manager, direction) {",
      "  if (tryMoveWithSharedGameSession(manager, direction, Date.now())) return;",
      "}"
    ].join("\n");
    expect(() => validateLegacyMoveSource(source)).not.toThrow();
    expect(LEGACY_MOVE_AUDIT_RULES).toHaveLength(2);
    expect(() => validateLegacyMoveSource("function move() {}"))
      .toThrow(/shared Game Session compatibility seam/);
  });
});
