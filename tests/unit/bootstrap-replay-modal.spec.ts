import { describe, expect, it, vi } from "vitest";

import {
  applyReplayModalClose,
  applyReplayModalOpen,
  applySettingsModalClose,
  applySettingsModalOpen
} from "../../src/bootstrap/replay-modal";

function hasClass(node: { className?: string }, className: string): boolean {
  return (" " + String(node.className || "") + " ").indexOf(" " + className + " ") >= 0;
}

describe("bootstrap replay modal", () => {
  it("opens replay modal and binds action/close handlers", () => {
    const closeBtn = { onclick: null as null | (() => unknown) };
    const modal = {
      style: { display: "none" },
      className: "replay-modal-overlay is-hidden",
      onclick: null as null | ((eventLike?: unknown) => unknown)
    };
    const titleEl = { textContent: "" };
    const textEl = { value: "" };
    const actionBtn = {
      style: { display: "none" },
      className: "replay-button is-hidden",
      textContent: "",
      onclick: null as null | (() => unknown)
    };
    const downloadBtn = {
      style: { display: "inline-block" },
      className: "replay-button",
      onclick: vi.fn()
    };
    const openPageBtn = {
      style: { display: "inline-block" },
      className: "replay-button",
      onclick: vi.fn()
    };
    const getElementById = vi.fn((id: string) => {
      if (id === "replay-modal") return modal;
      if (id === "replay-modal-title") return titleEl;
      if (id === "replay-textarea") return textEl;
      if (id === "replay-action-btn") return actionBtn;
      if (id === "replay-download-btn") return downloadBtn;
      if (id === "replay-open-page-btn") return openPageBtn;
      if (id === "replay-close-btn") return closeBtn;
      return null;
    });
    const actionCallback = vi.fn();
    const closeCallback = vi.fn();

    const result = applyReplayModalOpen({
      getElementById,
      title: "导出回放",
      content: "data",
      actionName: "复制回放",
      actionCallback,
      closeCallback
    });

    expect(result).toEqual({ opened: true, hasActionButton: true });
    expect(hasClass(modal, "is-hidden")).toBe(false);
    expect(titleEl.textContent).toBe("导出回放");
    expect(textEl.value).toBe("data");
    expect(hasClass(actionBtn, "is-hidden")).toBe(false);
    expect(actionBtn.textContent).toBe("复制回放");
    expect(hasClass(downloadBtn, "is-hidden")).toBe(true);
    expect(downloadBtn.onclick).toBeNull();
    expect(hasClass(openPageBtn, "is-hidden")).toBe(true);
    expect(openPageBtn.onclick).toBeNull();

    actionBtn.onclick?.();
    expect(actionCallback).toHaveBeenCalledWith("data");

    modal.onclick?.({ target: actionBtn });
    expect(closeCallback).toHaveBeenCalledTimes(0);

    modal.onclick?.({ target: modal });
    expect(closeCallback).toHaveBeenCalledTimes(1);

    closeBtn.onclick?.();
    expect(closeCallback).toHaveBeenCalledTimes(2);
  });

  it("hides replay action button when action is not provided", () => {
    const modal = {
      style: { display: "none" },
      className: "replay-modal-overlay is-hidden"
    };
    const actionBtn = {
      style: { display: "inline-block" },
      className: "replay-button",
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
    expect(hasClass(actionBtn, "is-hidden")).toBe(true);
    expect(actionBtn.onclick).toBeNull();
  });

  it("closes replay modal", () => {
    const modal = {
      style: { display: "" },
      className: "replay-modal-overlay"
    };
    const result = applyReplayModalClose({
      getElementById(id: string) {
        return id === "replay-modal" ? modal : null;
      }
    });

    expect(result).toEqual({ closed: true });
    expect(hasClass(modal, "is-hidden")).toBe(true);
  });

  it("opens and closes settings modal", () => {
    const modal = {
      style: { display: "none" },
      className: "replay-modal-overlay is-hidden"
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
    expect(hasClass(modal, "is-hidden")).toBe(true);
  });
});
