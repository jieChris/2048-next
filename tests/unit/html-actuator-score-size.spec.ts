import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";

import { describe, expect, it, vi } from "vitest";

function loadHTMLActuatorContext(): Record<string, unknown> {
  const source = readFileSync(resolve("js/html_actuator.js"), "utf8");
  const context: Record<string, unknown> = {
    document: {
      documentElement: {
        getAttribute: (name: string) => (name === "data-ui-lang" ? "en" : "")
      }
    },
    window: {
      UII18N: {
        getLanguage: () => "en"
      }
    },
    setTimeout,
    clearTimeout
  };
  vm.runInNewContext(source, context);
  return context;
}

function loadHTMLActuatorPrototype(): Record<string, (...args: unknown[]) => unknown> {
  const context = loadHTMLActuatorContext();
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

  it("uses English game-over copy when the UI language is English", () => {
    const prototype = loadHTMLActuatorPrototype();
    const messageText = { textContent: "" };
    const actuator = Object.assign(Object.create(prototype), {
      activeMessageType: null,
      messageContainer: {
        classList: {
          add: vi.fn()
        },
        getElementsByTagName: vi.fn(() => [messageText])
      }
    });

    prototype.message.call(actuator, false);

    expect(messageText.textContent).toBe("Game over!");
  });
});
