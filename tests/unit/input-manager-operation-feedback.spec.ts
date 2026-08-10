import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

type InputManager = {
  on: (event: string, callback: (payload: unknown) => void) => void;
};

function loadInputManager(fileName: string, constructorName: string) {
  const dom = new JSDOM(`<!doctype html><html><body>
    <button class="retry-button"></button>
    <button class="restart-button"></button>
    <button class="keep-playing-button"></button>
    <div class="game-container"></div>
  </body></html>`);
  Object.defineProperty(dom.window, "matchMedia", {
    value: () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
  });
  const context = {
    console,
    document: dom.window.document,
    window: dom.window,
    navigator: dom.window.navigator,
    MutationObserver: dom.window.MutationObserver
  } as Record<string, unknown>;
  vm.runInNewContext(readFileSync(path.resolve(process.cwd(), "js", fileName), "utf8"), context);
  const Constructor = context[constructorName] as new () => InputManager;
  return { dom, inputManager: new Constructor() };
}

function dispatchKeyboard(
  dom: JSDOM,
  init: { key: string; code: string; which: number; repeat?: boolean },
  target: EventTarget = dom.window.document
) {
  const event = new dom.window.KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    key: init.key,
    code: init.code,
    repeat: init.repeat
  });
  Object.defineProperty(event, "which", { value: init.which });
  target.dispatchEvent(event);
}

function dispatchSwipe(dom: JSDOM) {
  const container = dom.window.document.querySelector(".game-container")!;
  const start = new dom.window.Event("touchstart", { bubbles: true, cancelable: true });
  Object.defineProperty(start, "touches", {
    value: [{ identifier: 1, clientX: 0, clientY: 0 }]
  });
  container.dispatchEvent(start);
  const end = new dom.window.Event("touchend", { bubbles: true, cancelable: true });
  Object.defineProperties(end, {
    touches: { value: [] },
    changedTouches: { value: [{ identifier: 1, clientX: 40, clientY: 0 }] }
  });
  container.dispatchEvent(end);
}

describe("input manager operation feedback metadata", () => {
  it.each([
    ["keyboard_input_manager.js", "KeyboardInputManager"],
    ["capped_input_manager.js", "CappedInputManager"]
  ])("emits metadata for keyboard moves but keeps swipe payloads numeric: %s", (fileName, ctor) => {
    const { dom, inputManager } = loadInputManager(fileName, ctor);
    const payloads: unknown[] = [];
    inputManager.on("move", (payload) => payloads.push(payload));

    dispatchKeyboard(dom, { key: "ArrowUp", code: "ArrowUp", which: 38, repeat: true });
    dispatchSwipe(dom);

    expect(payloads[0]).toEqual({
      direction: 0,
      feedback: { id: expect.any(String), key: "arrow-up", repeat: true }
    });
    expect(payloads[1]).toBe(1);
  });

  it.each([
    ["keyboard_input_manager.js", "KeyboardInputManager"],
    ["capped_input_manager.js", "CappedInputManager"]
  ])("uses the physical key code for feedback tokens: %s", (fileName, ctor) => {
    const { dom, inputManager } = loadInputManager(fileName, ctor);
    const payloads: Array<{ feedback: { key: string } }> = [];
    inputManager.on("move", (payload) => payloads.push(payload as (typeof payloads)[number]));

    dispatchKeyboard(dom, { key: "ц", code: "KeyW", which: 87 });

    expect(payloads[0]?.feedback.key).toBe("W");
  });

  it("uses classic undo/redo semantics and stable keyboard tokens", () => {
    const { dom, inputManager } = loadInputManager("keyboard_input_manager.js", "KeyboardInputManager");
    const payloads: Array<{ direction: number; feedback: { id: string; key: string } }> = [];
    inputManager.on("move", (payload) => payloads.push(payload as (typeof payloads)[number]));

    dispatchKeyboard(dom, { key: "w", code: "KeyW", which: 87 });
    dispatchKeyboard(dom, { key: "z", code: "KeyZ", which: 90 });
    dispatchKeyboard(dom, { key: "u", code: "KeyU", which: 85 });
    dispatchKeyboard(dom, { key: "Backspace", code: "Backspace", which: 8 });
    dispatchKeyboard(dom, { key: "y", code: "KeyY", which: 89 });
    dispatchKeyboard(dom, { key: "e", code: "KeyE", which: 69 });
    dispatchKeyboard(dom, { key: "c", code: "KeyC", which: 67 });
    dispatchKeyboard(dom, { key: "q", code: "KeyQ", which: 81 });

    expect(payloads.map(({ direction, feedback }) => [direction, feedback.key])).toEqual([
      [0, "W"],
      [-1, "Z"],
      [-1, "U"],
      [-1, "backspace"],
      [-2, "Y"]
    ]);
    expect(new Set(payloads.map((payload) => payload.feedback.id)).size).toBe(payloads.length);
  });

  it("maps E/C/Z/Q diagonally and reserves only Backspace for undo in diagonal mode", () => {
    const { dom, inputManager } = loadInputManager("keyboard_input_manager.js", "KeyboardInputManager");
    dom.window.document.body.setAttribute("data-mode-id", "diag_4x4_pow2");
    const payloads: Array<{ direction: number; feedback: { key: string } }> = [];
    inputManager.on("move", (payload) => payloads.push(payload as (typeof payloads)[number]));

    for (const [key, which] of [["e", 69], ["c", 67], ["z", 90], ["q", 81], ["u", 85]] as const) {
      dispatchKeyboard(dom, { key, code: `Key${key.toUpperCase()}`, which });
    }
    dispatchKeyboard(dom, { key: "Backspace", code: "Backspace", which: 8 });
    dispatchKeyboard(dom, { key: "y", code: "KeyY", which: 89 });

    expect(payloads.map(({ direction, feedback }) => [direction, feedback.key])).toEqual([
      [4, "E"],
      [5, "C"],
      [6, "Z"],
      [7, "Q"],
      [-1, "backspace"]
    ]);
  });

  it("maps diagonal keys in practice when the active practice config allows diagonal moves", () => {
    const { dom, inputManager } = loadInputManager("keyboard_input_manager.js", "KeyboardInputManager");
    dom.window.document.body.setAttribute("data-mode-id", "practice");
    (dom.window as unknown as { game_manager: unknown }).game_manager = {
      modeConfig: { special_rules: { allow_diagonal_moves: true } }
    };
    const payloads: Array<{ direction: number; feedback: { key: string } }> = [];
    inputManager.on("move", (payload) => payloads.push(payload as (typeof payloads)[number]));

    for (const [key, which] of [["e", 69], ["c", 67], ["z", 90], ["q", 81], ["u", 85]] as const) {
      dispatchKeyboard(dom, { key, code: `Key${key.toUpperCase()}`, which });
    }
    dispatchKeyboard(dom, { key: "Backspace", code: "Backspace", which: 8 });

    expect(payloads.map(({ direction, feedback }) => [direction, feedback.key])).toEqual([
      [4, "E"],
      [5, "C"],
      [6, "Z"],
      [7, "Q"],
      [-1, "backspace"]
    ]);
  });

  it("does not create feedback attempts for editable text, items, restart, or capped Backspace", () => {
    const keyboard = loadInputManager("keyboard_input_manager.js", "KeyboardInputManager");
    const capped = loadInputManager("capped_input_manager.js", "CappedInputManager");
    const keyboardPayloads: unknown[] = [];
    const cappedPayloads: unknown[] = [];
    keyboard.inputManager.on("move", (payload) => keyboardPayloads.push(payload));
    capped.inputManager.on("move", (payload) => cappedPayloads.push(payload));
    const input = keyboard.dom.window.document.createElement("input");
    keyboard.dom.window.document.body.appendChild(input);

    dispatchKeyboard(keyboard.dom, { key: "w", code: "KeyW", which: 87 }, input);
    dispatchKeyboard(keyboard.dom, { key: "1", code: "Digit1", which: 49 });
    dispatchKeyboard(keyboard.dom, { key: "r", code: "KeyR", which: 82 });
    dispatchKeyboard(capped.dom, { key: "Backspace", code: "Backspace", which: 8 });
    const cappedInput = capped.dom.window.document.createElement("input");
    capped.dom.window.document.body.appendChild(cappedInput);
    dispatchKeyboard(capped.dom, { key: "w", code: "KeyW", which: 87 }, cappedInput);

    expect(keyboardPayloads).toEqual([]);
    expect(cappedPayloads).toEqual([]);
  });
});
