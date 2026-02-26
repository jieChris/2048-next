import { describe, expect, it, vi } from "vitest";

import { applyMobileHintUiSync } from "../../src/bootstrap/mobile-hint-ui-host";

function createClassList() {
  const values = new Set<string>();
  return {
    values,
    add(token: string) {
      values.add(token);
    },
    remove(token: string) {
      values.delete(token);
    },
    toggle(token: string, force?: boolean) {
      if (force) {
        values.add(token);
        return true;
      }
      values.delete(token);
      return false;
    },
    has(token: string) {
      return values.has(token);
    }
  };
}

describe("bootstrap mobile hint ui host", () => {
  it("returns early when out of game scope", () => {
    const result = applyMobileHintUiSync({
      isGamePageScope() {
        return false;
      }
    });

    expect(result).toEqual({
      isScope: false,
      hasBody: false,
      hasButton: false,
      compactViewport: false,
      didSyncTextBlock: false,
      didToggleIntroVisibility: false,
      didApplyCollapsedClass: false,
      didApplyButtonDisplay: false,
      didConfigureButton: false,
      didCloseModal: false
    });
  });

  it("returns when body is missing", () => {
    const result = applyMobileHintUiSync({
      isGamePageScope() {
        return true;
      },
      documentLike: {}
    });

    expect(result.hasBody).toBe(false);
    expect(result.hasButton).toBe(false);
  });

  it("applies close-modal path when ui state requests close", () => {
    const bodyClassList = createClassList();
    const introClassList = createClassList();
    const intro = { classList: introClassList };
    const container = { id: "container" };
    const buttonAttrs: Record<string, string> = {};
    const button = {
      style: {
        display: ""
      },
      setAttribute(name: string, value: string) {
        buttonAttrs[name] = value;
      }
    };
    const closeMobileHintModal = vi.fn();

    const result = applyMobileHintUiSync({
      isGamePageScope() {
        return true;
      },
      isCompactGameViewport() {
        return true;
      },
      ensureMobileHintToggleButton() {
        return button;
      },
      closeMobileHintModal,
      mobileHintUiRuntime: {
        syncMobileHintTextBlockVisibility: vi.fn(() => 2),
        resolveMobileHintDisplayModel: vi.fn(() => ({ collapsedContentEnabled: false })),
        resolveMobileHintUiState: vi.fn(() => ({
          collapsedContentEnabled: false,
          collapsedClassName: "mobile-hint-collapsed-content",
          buttonDisplay: "none",
          shouldCloseModal: true,
          buttonLabel: "查看提示文本",
          buttonAriaExpanded: "false"
        }))
      },
      documentLike: {
        body: { classList: bodyClassList },
        querySelector(selector: string) {
          if (selector === ".above-game .game-intro") return intro;
          if (selector === ".container") return container;
          return null;
        }
      }
    });

    expect(result.didCloseModal).toBe(true);
    expect(closeMobileHintModal).toHaveBeenCalledTimes(1);
    expect(button.style.display).toBe("none");
    expect(introClassList.has("mobile-hint-hidden")).toBe(true);
    expect(bodyClassList.has("mobile-hint-collapsed-content")).toBe(false);
    expect(buttonAttrs["aria-label"]).toBeUndefined();
  });

  it("configures button attrs when ui state stays open", () => {
    const bodyClassList = createClassList();
    const introClassList = createClassList();
    const intro = { classList: introClassList };
    const container = { id: "container" };
    const buttonAttrs: Record<string, string> = {};
    const button = {
      style: {
        display: ""
      },
      setAttribute(name: string, value: string) {
        buttonAttrs[name] = value;
      }
    };

    const result = applyMobileHintUiSync({
      isGamePageScope() {
        return true;
      },
      isCompactGameViewport() {
        return false;
      },
      ensureMobileHintToggleButton() {
        return button;
      },
      mobileHintUiRuntime: {
        syncMobileHintTextBlockVisibility: vi.fn(() => 2),
        resolveMobileHintDisplayModel: vi.fn(() => ({ collapsedContentEnabled: true })),
        resolveMobileHintUiState: vi.fn(() => ({
          collapsedContentEnabled: true,
          collapsedClassName: "mobile-hint-collapsed-content",
          buttonDisplay: "inline-flex",
          shouldCloseModal: false,
          buttonLabel: "查看提示文本",
          buttonAriaExpanded: "false"
        }))
      },
      documentLike: {
        body: { classList: bodyClassList },
        querySelector(selector: string) {
          if (selector === ".above-game .game-intro") return intro;
          if (selector === ".container") return container;
          return null;
        }
      }
    });

    expect(result.didConfigureButton).toBe(true);
    expect(button.style.display).toBe("inline-flex");
    expect(buttonAttrs["aria-label"]).toBe("查看提示文本");
    expect(buttonAttrs.title).toBe("查看提示文本");
    expect(buttonAttrs["aria-expanded"]).toBe("false");
    expect(bodyClassList.has("mobile-hint-collapsed-content")).toBe(true);
    expect(introClassList.has("mobile-hint-hidden")).toBe(false);
  });
});
