import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";

import { describe, expect, it } from "vitest";

function loadHTMLActuatorPrototype(): Record<string, (...args: unknown[]) => unknown> {
  const source = readFileSync(resolve("js/html_actuator.js"), "utf8");
  const context: Record<string, unknown> = {
    document: {},
    window: {},
    setTimeout,
    clearTimeout
  };
  vm.runInNewContext(source, context);
  const ctor = context.HTMLActuator as { prototype: Record<string, (...args: unknown[]) => unknown> };
  return ctor.prototype;
}

describe("HTMLActuator score size classes", () => {
  it("keeps regular score size below 10000", () => {
    const prototype = loadHTMLActuatorPrototype();

    expect(prototype.resolveScoreSizeClass(9999)).toBe("");
  });

  it("uses compact score size at 10000", () => {
    const prototype = loadHTMLActuatorPrototype();

    expect(prototype.resolveScoreSizeClass(10000)).toBe("score-value-compact");
  });

  it("uses tiny score size at 1000000", () => {
    const prototype = loadHTMLActuatorPrototype();

    expect(prototype.resolveScoreSizeClass(1000000)).toBe("score-value-tiny");
  });
});
