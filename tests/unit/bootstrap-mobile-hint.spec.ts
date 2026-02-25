import { describe, expect, it } from "vitest";

import {
  collectMobileHintTexts,
  dedupeHintLines,
  extractHintNodeText,
  normalizeHintParagraphText
} from "../../src/bootstrap/mobile-hint";

function textNode(text: string) {
  return {
    nodeType: 3,
    textContent: text,
    childNodes: [] as unknown[]
  };
}

function element(
  tagName: string,
  children: unknown[] = [],
  extra: Record<string, unknown> = {}
) {
  const node: Record<string, unknown> = {
    nodeType: 1,
    tagName: tagName.toUpperCase(),
    childNodes: children,
    getAttribute() {
      return null;
    },
    closest() {
      return null;
    },
    ...extra
  };
  for (let i = 0; i < children.length; i++) {
    const child = children[i] as { parentNode?: unknown } | null;
    if (child && typeof child === "object") child.parentNode = node;
  }
  return node;
}

describe("bootstrap mobile hint", () => {
  it("normalizes and dedupes hint lines", () => {
    expect(normalizeHintParagraphText("  A\tB  \n\n\nC ")).toBe("A B\nC");
    expect(dedupeHintLines([" A  B ", "A B", "", "C"])).toEqual(["A B", "C"]);
  });

  it("extracts link text with href", () => {
    const anchor = element("a", [textNode("文档")], {
      getAttribute(key: string) {
        return key === "href" ? "https://example.com" : null;
      }
    });
    const paragraph = element("p", [textNode("查看"), anchor, element("br"), textNode("更多")]);
    expect(extractHintNodeText(paragraph)).toBe("查看文档（https://example.com）\n更多");
  });

  it("collects intro and main hints while skipping excluded areas", () => {
    const intro = element("p", [textNode("玩法说明")]);
    const ignored = element("p", [textNode("忽略")], {
      closest(selector: string) {
        return selector === ".above-game" ? { id: "above" } : null;
      }
    });
    const kept = element("p", [textNode("主区域提示")]);
    const container = element("div", [], {
      querySelectorAll(selector: string) {
        return selector === "p" ? [ignored, kept] : [];
      },
      querySelector() {
        return null;
      }
    });

    const lines = collectMobileHintTexts({
      isGamePageScope: true,
      introNode: intro,
      containerNode: container
    });
    expect(lines).toEqual(["玩法说明", "主区域提示"]);
  });

  it("falls back to explain node then default text", () => {
    const explain = element("p", [], { innerText: "解释文本" });
    const emptyContainer = element("div", [], {
      querySelectorAll() {
        return [];
      },
      querySelector() {
        return null;
      }
    });

    const explainLines = collectMobileHintTexts({
      isGamePageScope: true,
      containerNode: emptyContainer,
      explainNode: explain
    });
    expect(explainLines).toEqual(["解释文本"]);

    const fallbackLines = collectMobileHintTexts({
      isGamePageScope: true,
      containerNode: emptyContainer
    });
    expect(fallbackLines).toEqual(["合并数字，合成 2048 方块。"]);
  });

  it("returns empty list outside game scope", () => {
    expect(
      collectMobileHintTexts({
        isGamePageScope: false,
        defaultText: "x"
      })
    ).toEqual([]);
  });
});
