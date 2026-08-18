import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it, vi } from "vitest";

const SETTINGS_HTML = `
  <nav class="settings-category-nav">
    <span class="settings-category-active-bookmark"></span>
    <a class="settings-category-link is-active" href="#timer-settings" aria-current="location">计时器</a>
    <a class="settings-category-link" href="#appearance-settings" aria-current="false">外观与配色</a>
    <a class="settings-category-link" href="#language-settings" aria-current="false">界面语言</a>
    <a class="settings-category-link" href="#contextual-guide-settings" aria-current="false">新手指引</a>
  </nav>
  <section id="timer-settings"><details id="custom-secondary-timer-editor"></details></section>
  <section id="appearance-settings"><details id="appearance-settings-editor"></details></section>
  <section id="language-settings"><details id="language-settings-editor"></details></section>
  <section id="contextual-guide-settings"></section>
`;

async function loadPalettePageModule(hash: string) {
  vi.resetModules();
  const dom = new JSDOM(SETTINGS_HTML, {
    url: `http://127.0.0.1/palette.html${hash}`,
    pretendToBeVisual: true
  });
  vi.stubGlobal("window", dom.window);
  vi.stubGlobal("document", dom.window.document);
  vi.stubGlobal("Event", dom.window.Event);
  vi.stubGlobal("CustomEvent", dom.window.CustomEvent);
  return {
    dom,
    module: await import("../../src/pages/palette-page")
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("palette settings navigation", () => {
  it("opens and scrolls the settings module targeted by the hash", async () => {
    const { dom, module } = await loadPalettePageModule("#appearance-settings");
    const section = dom.window.document.getElementById("appearance-settings") as HTMLElement;
    let scrollOptions: ScrollIntoViewOptions | undefined;
    section.scrollIntoView = (options?: boolean | ScrollIntoViewOptions) => {
      if (typeof options === "object") scrollOptions = options;
    };

    module.syncSettingsCategory();

    expect((dom.window.document.getElementById("appearance-settings-editor") as HTMLDetailsElement).open).toBe(true);
    expect((dom.window.document.getElementById("custom-secondary-timer-editor") as HTMLDetailsElement).open).toBe(false);
    expect(scrollOptions).toEqual({ behavior: "smooth", block: "start" });
    expect(dom.window.document.querySelector('a[href="#appearance-settings"]')?.getAttribute("aria-current")).toBe("location");
    dom.window.close();
  });

  it("updates the active bookmark from the most visible settings module", async () => {
    const { dom, module } = await loadPalettePageModule("");
    const timer = dom.window.document.getElementById("timer-settings") as HTMLElement;
    const appearance = dom.window.document.getElementById("appearance-settings") as HTMLElement;

    module.syncSettingsCategoryFromEntries([
      { isIntersecting: true, intersectionRatio: 0.2, target: timer },
      { isIntersecting: true, intersectionRatio: 0.8, target: appearance }
    ] as IntersectionObserverEntry[]);

    expect(dom.window.document.querySelector('a[href="#timer-settings"]')?.classList.contains("is-active")).toBe(false);
    expect(dom.window.document.querySelector('a[href="#appearance-settings"]')?.classList.contains("is-active")).toBe(true);
    expect(dom.window.document.querySelector('a[href="#appearance-settings"]')?.getAttribute("aria-current")).toBe("location");
    dom.window.close();
  });

  it("reopens the target when its already-active bookmark is clicked again", async () => {
    const { dom, module } = await loadPalettePageModule("#appearance-settings");
    const disclosure = dom.window.document.getElementById("appearance-settings-editor") as HTMLDetailsElement;
    const section = dom.window.document.getElementById("appearance-settings") as HTMLElement;
    section.scrollIntoView = () => undefined;
    disclosure.open = false;

    module.bindSettingsCategoryNavigation();
    dom.window.document.querySelector('a[href="#appearance-settings"]')?.dispatchEvent(
      new dom.window.MouseEvent("click", { bubbles: true })
    );

    expect(disclosure.open).toBe(true);
    dom.window.close();
  });

  it("opens the language module from its settings bookmark", async () => {
    const { dom, module } = await loadPalettePageModule("#language-settings");
    const section = dom.window.document.getElementById("language-settings") as HTMLElement;
    section.scrollIntoView = () => undefined;

    module.syncSettingsCategory();

    expect((dom.window.document.getElementById("language-settings-editor") as HTMLDetailsElement).open).toBe(true);
    expect(dom.window.document.querySelector('a[href="#language-settings"]')?.classList.contains("is-active")).toBe(true);
    dom.window.close();
  });

  it("opens the beginner guide module from its settings bookmark", async () => {
    const { dom, module } = await loadPalettePageModule("#contextual-guide-settings");
    const section = dom.window.document.getElementById("contextual-guide-settings") as HTMLElement;
    section.scrollIntoView = () => undefined;

    module.syncSettingsCategory();

    expect(dom.window.document.querySelector('a[href="#contextual-guide-settings"]')?.classList.contains("is-active")).toBe(true);
    expect(dom.window.document.querySelector('a[href="#contextual-guide-settings"]')?.getAttribute("aria-current")).toBe("location");
    dom.window.close();
  });
});
