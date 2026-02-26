import { describe, expect, it, vi } from "vitest";

import { applyMobileHintModalOpen } from "../../src/bootstrap/mobile-hint-open-host";

describe("bootstrap mobile hint open host", () => {
  it("returns early when not in game page scope", () => {
    const result = applyMobileHintModalOpen({
      isGamePageScope() {
        return false;
      }
    });

    expect(result).toEqual({
      isScope: false,
      isCompact: false,
      hasDom: false,
      lineCount: 0,
      didRenderLines: false,
      didShowOverlay: false
    });
  });

  it("returns early when viewport is not compact", () => {
    const result = applyMobileHintModalOpen({
      isGamePageScope() {
        return true;
      },
      isCompactGameViewport() {
        return false;
      }
    });

    expect(result).toEqual({
      isScope: true,
      isCompact: false,
      hasDom: false,
      lineCount: 0,
      didRenderLines: false,
      didShowOverlay: false
    });
  });

  it("returns no dom when modal ensure fails", () => {
    const result = applyMobileHintModalOpen({
      isGamePageScope() {
        return true;
      },
      isCompactGameViewport() {
        return true;
      },
      ensureMobileHintModalDom() {
        return null;
      }
    });

    expect(result).toEqual({
      isScope: true,
      isCompact: true,
      hasDom: false,
      lineCount: 0,
      didRenderLines: false,
      didShowOverlay: false
    });
  });

  it("collects lines, renders paragraphs and shows overlay", () => {
    const introNode = { id: "intro" };
    const containerNode = { id: "container" };
    const explainNode = { id: "explain" };
    const querySelector = vi.fn((selector: string) => {
      if (selector === ".above-game .game-intro") return introNode;
      if (selector === ".container") return containerNode;
      if (selector === ".game-explanation") return explainNode;
      return null;
    });
    const createElement = vi.fn((tagName: string) => ({ tagName, textContent: "" }));
    const appended: Array<{ tagName: string; textContent: string }> = [];
    const body = {
      innerHTML: "stale",
      appendChild(node: { tagName: string; textContent: string }) {
        appended.push(node);
      }
    };
    const overlay = { style: { display: "none" } };
    const collectMobileHintTexts = vi.fn(() => ["提示 1", "提示 2"]);

    const result = applyMobileHintModalOpen({
      isGamePageScope() {
        return true;
      },
      isCompactGameViewport() {
        return true;
      },
      ensureMobileHintModalDom() {
        return { overlay, body };
      },
      mobileHintRuntime: {
        collectMobileHintTexts
      },
      documentLike: {
        querySelector,
        createElement
      },
      defaultText: "默认提示"
    });

    expect(collectMobileHintTexts).toHaveBeenCalledWith({
      isGamePageScope: true,
      introNode,
      containerNode,
      explainNode,
      defaultText: "默认提示"
    });
    expect(createElement).toHaveBeenCalledTimes(2);
    expect(body.innerHTML).toBe("");
    expect(appended).toEqual([
      { tagName: "p", textContent: "提示 1" },
      { tagName: "p", textContent: "提示 2" }
    ]);
    expect(overlay.style.display).toBe("flex");
    expect(result).toEqual({
      isScope: true,
      isCompact: true,
      hasDom: true,
      lineCount: 2,
      didRenderLines: true,
      didShowOverlay: true
    });
  });
});
