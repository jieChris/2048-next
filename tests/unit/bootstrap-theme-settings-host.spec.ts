import { describe, expect, it, vi } from "vitest";

import { applyThemeSettingsUi } from "../../src/bootstrap/theme-settings-host";
import {
  formatThemePreviewValue,
  resolveThemeBindingState,
  resolveThemeDropdownToggleState,
  resolveThemeOptionSelectedState,
  resolveThemeOptionValue,
  resolveThemeOptions,
  resolveThemePreviewCssSelectors,
  resolveThemePreviewLayout,
  resolveThemePreviewTileValues,
  resolveThemeSelectLabel
} from "../../src/bootstrap/theme-settings";

function createClassList(initial: string[] = []) {
  const set = new Set(initial);
  return {
    add(value: string) {
      set.add(value);
    },
    remove(value: string) {
      set.delete(value);
    },
    contains(value: string) {
      return set.has(value);
    }
  };
}

function createHarness() {
  let styleNode: Record<string, unknown> | null = null;
  const optionNodes: Array<Record<string, unknown>> = [];
  const documentHandlers: Record<string, (payload: unknown) => void> = {};
  const windowHandlers: Record<string, (payload?: unknown) => void> = {};
  const customTriggerHandlers: Record<string, (payload: unknown) => void> = {};
  const customSelectHandlers: Record<string, () => void> = {};

  const triggerText = { textContent: "" };
  const customTrigger = {
    __bound: false,
    addEventListener(name: string, handler: (payload: unknown) => void) {
      customTriggerHandlers[name] = handler;
    },
    querySelector(selector: string) {
      return selector === "span" ? triggerText : null;
    }
  };

  const customSelect = {
    __mouseleaveBound: false,
    classList: createClassList(),
    addEventListener(name: string, handler: () => void) {
      customSelectHandlers[name] = handler;
    },
    contains(target: unknown) {
      return target === customSelect || target === customTrigger || optionNodes.includes(target as never);
    }
  };

  const customOptionsContainer = {
    children: optionNodes,
    innerHTML: "",
    scrollTop: 0,
    offsetTop: 10,
    appendChild(node: Record<string, unknown>) {
      node.offsetTop = optionNodes.length * 20 + 10;
      optionNodes.push(node);
    },
    querySelector(selector: string) {
      if (selector !== ".custom-option.selected") return null;
      for (let i = 0; i < optionNodes.length; i += 1) {
        const node = optionNodes[i];
        if ((node.classList as ReturnType<typeof createClassList>).contains("selected")) {
          return node;
        }
      }
      return null;
    },
    querySelectorAll(selector: string) {
      return selector === ".custom-option" ? optionNodes : [];
    }
  };

  const previewPow2 = {
    innerHTML: "",
    children: [] as Array<Record<string, unknown>>,
    appendChild(node: Record<string, unknown>) {
      this.children.push(node);
    }
  };
  const previewFib = {
    innerHTML: "",
    children: [] as Array<Record<string, unknown>>,
    appendChild(node: Record<string, unknown>) {
      this.children.push(node);
    }
  };
  const previewRoot = {
    className: "",
    innerHTML: "",
    __dualPreviewRefs: null as unknown
  };

  const documentLike = {
    head: {
      appendChild(node: Record<string, unknown>) {
        styleNode = node;
      }
    },
    getElementById(id: string) {
      if (id === "theme-select") return { id: "theme-select" };
      if (id === "theme-preview-grid") return previewRoot;
      if (id === "theme-select-trigger") return customTrigger;
      if (id === "theme-select-options") return customOptionsContainer;
      if (id === "theme-preview-grid-pow2") return previewPow2;
      if (id === "theme-preview-grid-fib") return previewFib;
      if (id === "theme-preview-style") return styleNode;
      return null;
    },
    querySelector(selector: string) {
      return selector === ".custom-select" ? customSelect : null;
    },
    createElement(tagName: string) {
      if (tagName === "style") {
        return {
          id: "",
          textContent: ""
        };
      }
      return {
        className: "",
        textContent: "",
        dataset: {},
        classList: createClassList(),
        addEventListener(name: string, handler: (payload?: unknown) => void) {
          (this as Record<string, unknown>).__handlers =
            (this as Record<string, unknown>).__handlers || {};
          ((this as Record<string, unknown>).__handlers as Record<string, (payload?: unknown) => void>)[name] =
            handler;
        }
      };
    },
    addEventListener(name: string, handler: (payload: unknown) => void) {
      documentHandlers[name] = handler;
    }
  };

  const windowLike = {
    __clickOutsideBound: false,
    __themeChangeSyncBound: false,
    addEventListener(name: string, handler: (payload?: unknown) => void) {
      windowHandlers[name] = handler;
    }
  };

  let currentThemeId = "classic";
  const themeManager = {
    getThemes: vi.fn(() => [
      { id: "classic", label: "经典" },
      { id: "mint", label: "薄荷" }
    ]),
    getCurrentTheme: vi.fn(() => currentThemeId),
    applyTheme: vi.fn((themeId: string) => {
      currentThemeId = themeId;
    }),
    getPreviewCss: vi.fn((themeId: string, selectors: { pow2Selector: string; fibSelector: string }) => {
      return themeId + ":" + selectors.pow2Selector + ":" + selectors.fibSelector;
    }),
    getTileValues: vi.fn((ruleset: "pow2" | "fibonacci") => {
      return ruleset === "pow2" ? [2, 4] : [1, 2];
    })
  };

  const runtime = {
    formatThemePreviewValue: vi.fn((value: unknown) =>
      formatThemePreviewValue(typeof value === "number" ? value : Number(value))
    ),
    resolveThemePreviewTileValues: vi.fn((payload: unknown) =>
      resolveThemePreviewTileValues(payload as Parameters<typeof resolveThemePreviewTileValues>[0])
    ),
    resolveThemePreviewLayout: vi.fn(() => resolveThemePreviewLayout()),
    resolveThemePreviewCssSelectors: vi.fn((payload: unknown) =>
      resolveThemePreviewCssSelectors(payload as Parameters<typeof resolveThemePreviewCssSelectors>[0])
    ),
    resolveThemeOptions: vi.fn((payload: unknown) =>
      resolveThemeOptions(payload as Parameters<typeof resolveThemeOptions>[0])
    ),
    resolveThemeSelectLabel: vi.fn((payload: unknown) =>
      resolveThemeSelectLabel(payload as Parameters<typeof resolveThemeSelectLabel>[0])
    ),
    resolveThemeDropdownToggleState: vi.fn((payload: unknown) =>
      resolveThemeDropdownToggleState(payload as Parameters<typeof resolveThemeDropdownToggleState>[0])
    ),
    resolveThemeBindingState: vi.fn((payload: unknown) =>
      resolveThemeBindingState(payload as Parameters<typeof resolveThemeBindingState>[0])
    ),
    resolveThemeOptionValue: vi.fn((payload: unknown) =>
      resolveThemeOptionValue(payload as Parameters<typeof resolveThemeOptionValue>[0])
    ),
    resolveThemeOptionSelectedState: vi.fn((payload: unknown) =>
      resolveThemeOptionSelectedState(payload as Parameters<typeof resolveThemeOptionSelectedState>[0])
    )
  };

  return {
    documentLike,
    windowLike,
    themeManager,
    runtime,
    styleNodeRef: () => styleNode,
    optionNodes,
    previewRoot,
    triggerText,
    customSelect,
    customTriggerHandlers,
    customSelectHandlers,
    documentHandlers,
    windowHandlers
  };
}

describe("bootstrap theme settings host", () => {
  it("initializes theme settings ui and wires dropdown interactions", () => {
    const harness = createHarness();
    const result = applyThemeSettingsUi({
      documentLike: harness.documentLike,
      windowLike: harness.windowLike,
      themeSettingsRuntime: harness.runtime,
      themeManager: harness.themeManager
    });

    expect(result.hasThemeUi).toBe(true);
    expect(result.optionCount).toBe(2);
    expect(result.didBindTrigger).toBe(true);
    expect(result.didBindOutside).toBe(true);
    expect(result.didBindLeave).toBe(true);
    expect(result.didBindThemeChange).toBe(true);
    expect(result.didRenderPreview).toBe(true);
    expect(result.didSyncUi).toBe(true);
    expect(result.didApplyPreview).toBe(true);
    expect(harness.previewRoot.className).toBe("theme-preview-dual-wrap");
    expect(harness.runtime.resolveThemeOptions).toHaveBeenCalledTimes(1);
    expect(harness.runtime.resolveThemePreviewTileValues).toHaveBeenCalledTimes(1);

    const styleNode = harness.styleNodeRef();
    expect(styleNode).not.toBeNull();
    expect(String(styleNode?.textContent || "")).toContain("classic");

    const stopA = vi.fn();
    harness.customTriggerHandlers.click({ stopPropagation: stopA });
    expect(stopA).toHaveBeenCalledTimes(1);
    expect((harness.customSelect.classList as ReturnType<typeof createClassList>).contains("open")).toBe(true);

    const stopB = vi.fn();
    harness.customTriggerHandlers.click({ stopPropagation: stopB });
    expect((harness.customSelect.classList as ReturnType<typeof createClassList>).contains("open")).toBe(false);

    const secondOption = harness.optionNodes[1];
    const secondHandlers = (secondOption.__handlers || {}) as Record<string, (payload?: unknown) => void>;
    const stopClick = vi.fn();
    secondHandlers.click({ stopPropagation: stopClick });
    expect(stopClick).toHaveBeenCalledTimes(1);
    expect(harness.themeManager.applyTheme).toHaveBeenCalledWith("mint");
    expect(String(harness.styleNodeRef()?.textContent || "")).toContain("mint");

    harness.windowHandlers.themechange();
    expect(harness.triggerText.textContent).toBe("薄荷");

    harness.customTriggerHandlers.click({ stopPropagation: vi.fn() });
    expect((harness.customSelect.classList as ReturnType<typeof createClassList>).contains("open")).toBe(true);
    harness.documentHandlers.click({ target: {} });
    expect((harness.customSelect.classList as ReturnType<typeof createClassList>).contains("open")).toBe(false);

    harness.customTriggerHandlers.click({ stopPropagation: vi.fn() });
    harness.customSelectHandlers.mouseleave();
    expect(String(harness.styleNodeRef()?.textContent || "")).toContain("mint");
  });

  it("returns empty result when required runtime contracts are missing", () => {
    expect(
      applyThemeSettingsUi({
        documentLike: {},
        windowLike: {},
        themeSettingsRuntime: {},
        themeManager: {}
      })
    ).toEqual({
      hasThemeUi: false,
      didInitOptions: false,
      didBindTrigger: false,
      didBindOutside: false,
      didBindLeave: false,
      didBindThemeChange: false,
      didRenderPreview: false,
      didSyncUi: false,
      didApplyPreview: false,
      optionCount: 0
    });
  });
});
