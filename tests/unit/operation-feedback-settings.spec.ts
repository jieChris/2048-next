import { afterEach, describe, expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";

import { initOperationFeedbackSettingsUI } from "../../src/bootstrap/operation-feedback-settings";
import {
  OPERATION_FEEDBACK_RESET_EVENT,
  OPERATION_FEEDBACK_RESULT_EVENT
} from "../../src/core/game-manager-input-events";

function createDom(): JSDOM {
  const dom = new JSDOM(`
    <div id="timerbox"></div>
    <div id="settings-modal" style="display:flex"></div>
    <div id="operation-feedback-settings-row">
      <input id="operation-feedback-toggle" type="checkbox">
    </div>
  `, { url: "https://example.test/" });
  Object.defineProperty(dom.window, "matchMedia", {
    value: () => ({ matches: true })
  });
  Object.defineProperties(dom.window, {
    innerWidth: { value: 1024 },
    innerHeight: { value: 720 }
  });
  return dom;
}

function dispatchResult(
  dom: JSDOM,
  detail: { id: string; key: string; repeat?: boolean; valid?: boolean }
): void {
  dom.window.document.dispatchEvent(new dom.window.CustomEvent(OPERATION_FEEDBACK_RESULT_EVENT, {
    detail: { repeat: false, valid: true, ...detail }
  }));
}

afterEach(() => {
  vi.useRealTimers();
});

describe("operation feedback settings", () => {
  it("keeps the existing page editing interactions and an eight-key preview", () => {
    const dom = createDom();

    expect(initOperationFeedbackSettingsUI({ documentLike: dom.window.document, windowLike: dom.window })).toEqual({
      hasToggle: true,
      didBind: true
    });

    const toggle = dom.window.document.getElementById("operation-feedback-toggle") as HTMLInputElement;
    toggle.checked = true;
    toggle.dispatchEvent(new dom.window.Event("change"));
    expect(JSON.parse(dom.window.localStorage.getItem("settings_operation_feedback_v1") || "{}")).toMatchObject({
      enabled: true,
      placement: "timer",
      locked: true
    });
    const overlay = dom.window.document.getElementById("operation-feedback-overlay") as HTMLElement;
    expect(overlay.classList.contains("is-locked")).toBe(true);
    expect(overlay.querySelectorAll(".operation-feedback-key-stack b")).toHaveLength(0);
    expect((overlay.querySelector("[data-operation-feedback-lock]") as HTMLButtonElement).ariaLabel).toBe(
      "解锁并调整操作反馈位置"
    );
    expect(dom.window.document.querySelector("[data-operation-feedback-layout-open]")).toBeNull();
    expect((dom.window.document.getElementById("settings-modal") as HTMLElement).style.display).toBe("flex");

    (overlay.querySelector("[data-operation-feedback-lock]") as HTMLButtonElement).click();
    expect(overlay.classList.contains("is-editing")).toBe(true);
    expect(overlay.querySelectorAll(".operation-feedback-key-stack b")).toHaveLength(8);
    expect(overlay.querySelectorAll(".operation-feedback-arrow path[d='M6 16h20M17 7l9 9-9 9']")).toHaveLength(4);
    expect(overlay.querySelector(".operation-feedback-backspace[viewBox='0 0 52 32']")).not.toBeNull();
    expect(overlay.textContent).not.toMatch(/[\u2190-\u21ff\u232b]/u);
    expect(dom.window.document.getElementById("operation-feedback-layout-modal")).toBeNull();
    expect(overlay.querySelectorAll("[data-operation-feedback-placement]")).toHaveLength(2);
    expect(overlay.querySelector("[data-operation-feedback-reset]")).not.toBeNull();

    overlay.dispatchEvent(new dom.window.MouseEvent("pointerdown", { bubbles: true, clientX: 10, clientY: 10 }));
    overlay.dispatchEvent(new dom.window.MouseEvent("pointermove", { bubbles: true, clientX: 110, clientY: 150 }));
    overlay.dispatchEvent(new dom.window.MouseEvent("pointerup", { bubbles: true }));
    expect(JSON.parse(dom.window.localStorage.getItem("settings_operation_feedback_v1") || "{}")).toMatchObject({
      placement: "custom",
      customLeft: 100,
      customTop: 140
    });

    (overlay.querySelector("[data-operation-feedback-placement='edge']") as HTMLButtonElement).click();
    expect(overlay.classList.contains("placement-edge")).toBe(true);
    expect({ left: overlay.style.left, top: overlay.style.top }).toEqual({ left: "910px", top: "100px" });
    expect(JSON.parse(dom.window.localStorage.getItem("settings_operation_feedback_v1") || "{}")).toMatchObject({
      placement: "edge"
    });

    const lockedGeometry = { left: overlay.style.left, top: overlay.style.top };
    (overlay.querySelector("[data-operation-feedback-lock]") as HTMLButtonElement).click();
    expect(overlay.classList.contains("is-locked")).toBe(true);
    expect({ left: overlay.style.left, top: overlay.style.top }).toEqual(lockedGeometry);
    expect(overlay.querySelectorAll(".operation-feedback-key-stack b")).toHaveLength(0);
    expect(JSON.parse(dom.window.localStorage.getItem("settings_operation_feedback_v1") || "{}")).toMatchObject({
      locked: true
    });
  });

  it("renders only confirmed results with stable nodes and an eight-key capacity", () => {
    vi.useFakeTimers();
    const dom = createDom();
    dom.window.localStorage.setItem("settings_operation_feedback_v1", JSON.stringify({ enabled: true, locked: true }));
    initOperationFeedbackSettingsUI({ documentLike: dom.window.document, windowLike: dom.window });
    const overlay = dom.window.document.getElementById("operation-feedback-overlay") as HTMLElement;
    const stack = overlay.querySelector(".operation-feedback-key-stack") as HTMLElement;

    dom.window.document.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowUp", code: "ArrowUp" }));
    expect(stack.querySelectorAll("b")).toHaveLength(0);

    ["arrow-up", "W", "arrow-right", "A", "S", "D", "arrow-left", "Q"].forEach((key, index) => {
      dispatchResult(dom, { id: `key-${index + 1}`, key });
    });
    vi.advanceTimersByTime(1);
    expect(stack.querySelectorAll("b")).toHaveLength(8);
    const originalKey2Node = stack.querySelector("[data-input-id='key-2']");

    dispatchResult(dom, { id: "key-9", key: "backspace", valid: false });
    expect(stack.querySelectorAll("b")).toHaveLength(9);
    expect(stack.querySelector("[data-input-id='key-1']")?.classList.contains("is-leaving")).toBe(true);
    expect(stack.lastElementChild?.getAttribute("data-input-id")).toBe("key-9");
    expect(stack.lastElementChild?.classList.contains("is-invalid")).toBe(true);
    expect(stack.lastElementChild?.classList.contains("is-wide")).toBe(true);
    expect(stack.querySelector("[data-input-id='key-2']")).toBe(originalKey2Node);
    expect(stack.textContent).not.toContain("9");

    vi.advanceTimersByTime(239);
    expect(stack.querySelectorAll("b")).toHaveLength(9);
    vi.advanceTimersByTime(1);
    expect(stack.querySelectorAll("b")).toHaveLength(8);
    expect(stack.firstElementChild?.getAttribute("data-input-id")).toBe("key-2");
    expect(stack.lastElementChild?.getAttribute("data-input-id")).toBe("key-9");
  });

  it("idles after five seconds, wakes immediately, and keeps editing preview isolated", () => {
    vi.useFakeTimers();
    const dom = createDom();
    dom.window.localStorage.setItem("settings_operation_feedback_v1", JSON.stringify({ enabled: true, locked: true }));
    initOperationFeedbackSettingsUI({ documentLike: dom.window.document, windowLike: dom.window });
    const overlay = dom.window.document.getElementById("operation-feedback-overlay") as HTMLElement;
    const lock = overlay.querySelector("[data-operation-feedback-lock]") as HTMLButtonElement;

    dispatchResult(dom, { id: "key-1", key: "W" });
    expect(overlay.classList.contains("is-idle")).toBe(false);
    vi.advanceTimersByTime(4999);
    expect(overlay.classList.contains("is-idle")).toBe(false);
    vi.advanceTimersByTime(1);
    expect(overlay.classList.contains("is-idle")).toBe(true);

    dispatchResult(dom, { id: "key-2", key: "arrow-down" });
    expect(overlay.classList.contains("is-idle")).toBe(false);
    lock.click();
    const previewNodes = Array.from(overlay.querySelectorAll(".operation-feedback-key-stack b"));
    expect(previewNodes).toHaveLength(8);
    expect(overlay.classList.contains("is-idle")).toBe(false);

    dispatchResult(dom, { id: "key-3", key: "backspace", valid: false });
    expect(Array.from(overlay.querySelectorAll(".operation-feedback-key-stack b"))).toEqual(previewNodes);
    vi.advanceTimersByTime(5000);
    expect(overlay.classList.contains("is-idle")).toBe(false);

    lock.click();
    expect(Array.from(overlay.querySelectorAll<HTMLElement>(".operation-feedback-key-stack b")).map((key) => key.dataset.inputId))
      .toEqual(["key-1", "key-2", "key-3"]);
  });

  it("clears the previous round history when a new round starts", () => {
    const dom = createDom();
    dom.window.localStorage.setItem("settings_operation_feedback_v1", JSON.stringify({ enabled: true, locked: true }));
    initOperationFeedbackSettingsUI({ documentLike: dom.window.document, windowLike: dom.window });
    const overlay = dom.window.document.getElementById("operation-feedback-overlay") as HTMLElement;

    dispatchResult(dom, { id: "old-round", key: "W" });
    expect(overlay.querySelectorAll(".operation-feedback-key")).toHaveLength(1);

    dom.window.document.dispatchEvent(new dom.window.Event(OPERATION_FEEDBACK_RESET_EVENT));

    expect(overlay.querySelectorAll(".operation-feedback-key")).toHaveLength(0);
    expect(overlay.classList.contains("is-idle")).toBe(true);
  });
});
