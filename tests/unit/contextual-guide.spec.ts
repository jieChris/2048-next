import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildContextualGuideUrl,
  getContextualGuideCatalog,
  getContextualGuideDefinition,
  hasContextualGuideBeenSeen,
  openContextualGuide,
  shouldAutoOpenContextualGuide,
} from "../../src/features/contextual-guide/contextual-guide";
import { initContextualGuideCatalogUI } from "../../src/features/contextual-guide/contextual-guide-catalog";

afterEach(() => vi.unstubAllGlobals());

describe("contextual guide", () => {
  it("registers the approved guide catalog and excludes operational pages", () => {
    expect(getContextualGuideCatalog().map((guide) => guide.id)).toEqual([
      "practice-board-v1",
      "diagonal-moves-v1",
      "replay-controls-v1",
      "game-basics-v1",
      "mode-selection-v1",
      "palette-settings-v1",
      "relay-5x5-v1",
      "records-and-leaderboards-v1",
    ]);
    expect(getContextualGuideDefinition("admin-console-v1")).toBeNull();
  });

  it("uses explicit guide requests while keeping the current mode parameters", () => {
    const url = buildContextualGuideUrl(
      "Practice_board.html?practice_mode_key=diag_3x3_pow2_no_undo&practice_ruleset=pow2",
      "practice-board-v1",
    );
    expect(url).toBe(
      "Practice_board.html?practice_mode_key=diag_3x3_pow2_no_undo&practice_ruleset=pow2&guide=practice-board-v1",
    );

    const practiceGuide = getContextualGuideDefinition("practice-board-v1");
    expect(
      practiceGuide?.buildTargetUrl({
        pageId: "index",
        currentUrl: "/2048.html?mode_key=standard_4x4_pow2_no_undo",
      }),
    ).toBe("Practice_board.html?guide=practice-board-v1");
    expect(
      practiceGuide?.buildTargetUrl({
        pageId: "practice",
        currentUrl: "/Practice_board.html?practice_mode_key=fib_3x3_fibonacci_no_undo&practice_ruleset=fibonacci",
      }),
    ).toBe(
      "Practice_board.html?practice_mode_key=fib_3x3_fibonacci_no_undo&practice_ruleset=fibonacci&guide=practice-board-v1",
    );
  });

  it("only auto-opens an unseen matching guide", () => {
    const values = new Map<string, string>();
    const storageLike = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };
    expect(
      shouldAutoOpenContextualGuide({
        guideId: "diagonal-moves-v1",
        storageLike,
        isMatchingContext: true,
      }),
    ).toBe(true);
    expect(hasContextualGuideBeenSeen("diagonal-moves-v1", storageLike)).toBe(false);
    values.set("guide_seen_v1:diagonal-moves-v1", "1");
    expect(
      shouldAutoOpenContextualGuide({
        guideId: "diagonal-moves-v1",
        storageLike,
        isMatchingContext: true,
      }),
    ).toBe(false);
    expect(
      shouldAutoOpenContextualGuide({
        guideId: "diagonal-moves-v1",
        storageLike,
        isMatchingContext: false,
      }),
    ).toBe(false);
  });

  it("builds diagonal copy from the actual mode context", () => {
    const guide = getContextualGuideDefinition("diagonal-moves-v1");
    expect(guide).not.toBeNull();
    const steps = guide?.buildSteps({ modeKey: "diag_4x4_pow2_no_undo", compact: false }) ?? [];
    expect(steps).toHaveLength(3);
    expect(steps[2].body.zh).toContain("Z");
    expect(steps[2].body.zh).toContain("左下");
    expect(getContextualGuideDefinition("diagonal-moves-v1")?.matches?.({ modeKey: "standard_4x4_pow2_no_undo" })).toBe(false);
  });

  it("renders a stable settings catalog with guide links", () => {
    const dom = new JSDOM(
      '<!doctype html><html lang="zh-CN"><body><div id="contextual-guide-catalog-row"></div></body></html>',
      {
        pretendToBeVisual: true,
        url: "https://2048next.test/Practice_board.html?practice_mode_key=diag_3x3_pow2_no_undo",
      },
    );
    vi.stubGlobal("window", dom.window);
    vi.stubGlobal("document", dom.window.document);
    vi.stubGlobal("HTMLElement", dom.window.HTMLElement);
    const result = initContextualGuideCatalogUI({
      documentLike: dom.window.document,
      windowLike: dom.window,
    });
    expect(result.didBind).toBe(true);
    expect(dom.window.document.querySelectorAll("[data-contextual-guide-id]")).toHaveLength(8);
    expect(
      dom.window.document.querySelector<HTMLAnchorElement>('[data-contextual-guide-id="practice-board-v1"]')?.getAttribute("href"),
    ).toContain("guide=practice-board-v1");
    expect(
      dom.window.document.querySelector<HTMLAnchorElement>('[data-contextual-guide-id="practice-board-v1"]')?.getAttribute("role"),
    ).toBeNull();

    dom.window.document
      .querySelector<HTMLAnchorElement>('[data-contextual-guide-id="practice-board-v1"]')
      ?.click();
    expect(dom.window.document.querySelector('.contextual-guide-root[data-contextual-guide-id="practice-board-v1"]')).not.toBeNull();
  });

  it("resets the catalog scroll when returning to the guide settings section", () => {
    const dom = new JSDOM(
      '<!doctype html><html lang="zh-CN"><body><div id="contextual-guide-catalog-row"></div></body></html>',
      {
        pretendToBeVisual: true,
        url: "https://2048next.test/palette.html#contextual-guide-settings",
      },
    );
    vi.stubGlobal("window", dom.window);
    vi.stubGlobal("document", dom.window.document);
    vi.stubGlobal("HTMLElement", dom.window.HTMLElement);
    initContextualGuideCatalogUI({
      documentLike: dom.window.document,
      windowLike: dom.window,
    });

    const list = dom.window.document.querySelector<HTMLElement>(".contextual-guide-catalog-list");
    expect(list).not.toBeNull();
    if (!list) return;
    list.scrollTop = 42;
    dom.window.dispatchEvent(new dom.window.Event("hashchange"));
    expect(list.scrollTop).toBe(0);
  });

  it("moves through real targets and closes without activating them", () => {
    const dom = new JSDOM(
      '<!doctype html><html lang="zh-CN"><body><button id="first">目标一</button><button id="second">目标二</button></body></html>',
      {
        pretendToBeVisual: true,
        url: "https://2048next.test/Practice_board.html",
      },
    );
    dom.window.HTMLElement.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal("window", dom.window);
    vi.stubGlobal("document", dom.window.document);
    vi.stubGlobal("HTMLElement", dom.window.HTMLElement);

    const firstClick = vi.fn();
    dom.window.document
      .getElementById("first")
      ?.addEventListener("click", firstClick);
    openContextualGuide({
      id: "practice-board-v1",
      label: "练习板入门",
      steps: [
        { selector: "#first", title: "第一步", body: "选择棋子" },
        { selector: "#second", title: "第二步", body: "点击棋盘" },
      ],
    });

    expect(
      dom.window.document.querySelector(".contextual-guide-title")?.textContent,
    ).toBe("第一步");
    dom.window.document
      .querySelector<HTMLButtonElement>(".contextual-guide-button.is-primary")
      ?.click();
    expect(
      dom.window.document.querySelector(".contextual-guide-title")?.textContent,
    ).toBe("第二步");
    expect(firstClick).not.toHaveBeenCalled();

    dom.window.document.dispatchEvent(
      new dom.window.KeyboardEvent("keydown", { key: "Escape" }),
    );
    expect(
      dom.window.document.querySelector(".contextual-guide-root"),
    ).toBeNull();
  });
});
