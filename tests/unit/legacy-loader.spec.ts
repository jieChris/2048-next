import { afterEach, describe, expect, it, vi } from "vitest";

const originalDocument = globalThis.document;

describe("legacy-loader", () => {
  afterEach(() => {
    if (originalDocument) {
      Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: originalDocument
      });
    } else {
      delete (globalThis as { document?: Document }).document;
    }
    vi.resetModules();
  });

  it("appends ordered script tags before waiting for individual script loads", async () => {
    const appendedScripts: Array<{
      tagName: string;
      src: string;
      async: boolean;
      onload?: () => void;
      onerror?: () => void;
    }> = [];

    const documentLike = {
      readyState: "loading",
      addEventListener: vi.fn(),
      createElement: (tagName: string) => ({
        tagName: tagName.toUpperCase(),
        rel: "",
        as: "",
        href: "",
        src: "",
        async: true,
        onload: undefined as undefined | (() => void),
        onerror: undefined as undefined | (() => void)
      }),
      head: {
        appendChild: vi.fn((node) => {
          if (node.tagName === "SCRIPT") {
            appendedScripts.push(node);
          }
          return node;
        })
      },
      documentElement: {
        appendChild: vi.fn()
      }
    };

    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: documentLike
    });

    const { loadLegacyScriptsSequentially } = await import("../../src/entries/legacy-loader");
    const pending = loadLegacyScriptsSequentially(["/a.js", "/b.js", "/c.js"]);

    await Promise.resolve();

    expect(appendedScripts.map((script) => script.src)).toEqual(["/a.js", "/b.js", "/c.js"]);
    expect(appendedScripts.every((script) => script.async === false)).toBe(true);

    for (const script of appendedScripts) {
      script.onload?.();
    }
    await expect(pending).resolves.toBeUndefined();
  });
});
