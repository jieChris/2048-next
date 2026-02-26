import { describe, expect, it, vi } from "vitest";

import {
  applyReplayModalClose,
  applyReplayModalOpen,
  applySettingsModalClose,
  applySettingsModalOpen
} from "../../src/bootstrap/replay-modal";

describe("bootstrap replay modal", () => {
  it("opens replay modal and binds action/close handlers", () => {
    const closeBtn = { onclick: null as null | (() => unknown) };
    const modal = {
      style: { display: "none" },
      querySelector: vi.fn(() => closeBtn)
    };
    const titleEl = { textContent: "" };
    const textEl = { value: "" };
    const actionBtn = {
      style: { display: "none" },
      textContent: "",
      onclick: null as null | (() => unknown)
    };
    const getElementById = vi.fn((id: string) => {
      if (id === "replay-modal") return modal;
      if (id === "replay-modal-title") return titleEl;
      if (id === "replay-textarea") return textEl;
      if (id === "replay-action-btn") return actionBtn;
      return null;
    });
    const actionCallback = vi.fn();
    const closeCallback = vi.fn();

    const result = applyReplayModalOpen({
      getElementById,
      title: "导出回放",
      content: "data",
      actionName: "再次复制",
      actionCallback,
      closeCallback
    });

    expect(result).toEqual({ opened: true, hasActionButton: true });
    expect(modal.style.display).toBe("flex");
    expect(titleEl.textContent).toBe("导出回放");
    expect(textEl.value).toBe("data");
    expect(actionBtn.style.display).toBe("inline-block");
    expect(actionBtn.textContent).toBe("再次复制");

    actionBtn.onclick?.();
    expect(actionCallback).toHaveBeenCalledWith("data");

    closeBtn.onclick?.();
    expect(closeCallback).toHaveBeenCalledTimes(1);
  });

  it("hides replay action button when action is not provided", () => {
    const modal = {
      style: { display: "none" },
      querySelector: vi.fn(() => null)
    };
    const actionBtn = {
      style: { display: "inline-block" },
      textContent: "x",
      onclick: vi.fn()
    };
    const result = applyReplayModalOpen({
      getElementById(id: string) {
        if (id === "replay-modal") return modal;
        if (id === "replay-action-btn") return actionBtn;
        return null;
      }
    });

    expect(result).toEqual({ opened: true, hasActionButton: false });
    expect(actionBtn.style.display).toBe("none");
    expect(actionBtn.onclick).toBeNull();
  });

  it("closes replay modal", () => {
    const modal = {
      style: { display: "flex" }
    };
    const result = applyReplayModalClose({
      getElementById(id: string) {
        return id === "replay-modal" ? modal : null;
      }
    });

    expect(result).toEqual({ closed: true });
    expect(modal.style.display).toBe("none");
  });

  it("opens and closes settings modal", () => {
    const modal = {
      style: { display: "none" }
    };

    const openResult = applySettingsModalOpen({
      getElementById(id: string) {
        return id === "settings-modal" ? modal : null;
      }
    });
    const closeResult = applySettingsModalClose({
      getElementById(id: string) {
        return id === "settings-modal" ? modal : null;
      }
    });

    expect(openResult).toEqual({ opened: true });
    expect(closeResult).toEqual({ closed: true });
    expect(modal.style.display).toBe("none");
  });
});
