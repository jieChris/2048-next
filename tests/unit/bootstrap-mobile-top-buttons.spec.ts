import { afterEach, describe, expect, it } from "vitest";

import {
  ensureMobileExpandToggleButtonDom,
  ensureMobileHintToggleButtonDom,
  ensureMobileUndoTopButtonDom
} from "../../src/bootstrap/mobile-top-buttons";

type EventHandler = (event?: unknown) => void;

type FakeElement = {
  id: string;
  className: string;
  href: string;
  innerHTML: string;
  textContent: string;
  parentNode: FakeElement | null;
  nextSibling: FakeElement | null;
  lastElementChild: FakeElement | null;
  children: FakeElement[];
  style: { display?: string };
  appendChild: (node: FakeElement) => void;
  insertBefore: (node: FakeElement, referenceNode: FakeElement | null) => void;
  getAttribute: (name: string) => string | null;
  setAttribute: (name: string, value: string) => void;
  addEventListener: (type: string, listener: EventHandler) => void;
  dispatch: (type: string, event?: unknown) => void;
};

type FakeDocument = {
  all: FakeElement[];
  host: FakeElement;
  body: FakeElement;
  documentElement: FakeElement;
  settingsBtn: FakeElement | null;
  getElementById: (id: string) => FakeElement | null;
  createElement: (tagName: string) => FakeElement;
  querySelector: (selector: string) => FakeElement | null;
};

const originalMatchMedia = (globalThis as any).matchMedia;
const originalInnerWidth = (globalThis as any).innerWidth;

function hasClass(node: FakeElement | null, className: string): boolean {
  if (!node) return false;
  return (" " + node.className + " ").indexOf(" " + className + " ") >= 0;
}

function createElement(id = ""): FakeElement {
  const attrs: Record<string, string> = {};
  const listeners: Record<string, EventHandler[]> = {};
  const el: FakeElement = {
    id,
    className: "",
    href: "",
    innerHTML: "",
    textContent: "",
    parentNode: null,
    nextSibling: null,
    lastElementChild: null,
    children: [],
    style: {},
    appendChild(node: FakeElement) {
      detach(node);
      el.children.push(node);
      node.parentNode = el;
      relink(el);
    },
    insertBefore(node: FakeElement, referenceNode: FakeElement | null) {
      detach(node);
      const idx = referenceNode ? el.children.indexOf(referenceNode) : -1;
      if (idx < 0) {
        el.children.push(node);
      } else {
        el.children.splice(idx, 0, node);
      }
      node.parentNode = el;
      relink(el);
    },
    getAttribute(name: string) {
      return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null;
    },
    setAttribute(name: string, value: string) {
      attrs[name] = String(value);
    },
    addEventListener(type: string, listener: EventHandler) {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(listener);
    },
    dispatch(type: string, event?: unknown) {
      const handlers = listeners[type] || [];
      for (let i = 0; i < handlers.length; i += 1) handlers[i](event);
    }
  };
  return el;
}

function detach(node: FakeElement): void {
  const parent = node.parentNode;
  if (!parent) return;
  const idx = parent.children.indexOf(node);
  if (idx >= 0) parent.children.splice(idx, 1);
  relink(parent);
}

function relink(parent: FakeElement): void {
  for (let i = 0; i < parent.children.length; i++) {
    parent.children[i].nextSibling = i + 1 < parent.children.length ? parent.children[i + 1] : null;
  }
  parent.lastElementChild = parent.children.length
    ? parent.children[parent.children.length - 1]
    : null;
}

function createFakeDocument(withSettings: boolean): FakeDocument {
  const host = createElement("host");
  const body = createElement("body");
  const documentElement = createElement("html");
  documentElement.setAttribute("lang", "en");
  const all: FakeElement[] = [host, body, documentElement];
  const settingsBtn = withSettings ? createElement("top-settings-btn") : null;
  if (settingsBtn) {
    host.appendChild(settingsBtn);
    all.push(settingsBtn);
  }

  return {
    all,
    host,
    body,
    documentElement,
    settingsBtn,
    getElementById(id: string) {
      for (let i = 0; i < all.length; i++) {
        if (all[i].id === id) return all[i];
      }
      return null;
    },
    createElement() {
      const node = createElement("");
      all.push(node);
      return node;
    },
    querySelector(selector: string) {
      if (selector === ".top-action-buttons") return host;
      return null;
    }
  };
}

function setCompactViewport(): void {
  (globalThis as any).matchMedia = () => ({ matches: true });
  (globalThis as any).innerWidth = 375;
}

function setDesktopViewport(): void {
  (globalThis as any).matchMedia = () => ({ matches: false });
  (globalThis as any).innerWidth = 1280;
}

afterEach(() => {
  (globalThis as any).matchMedia = originalMatchMedia;
  (globalThis as any).innerWidth = originalInnerWidth;
});

describe("bootstrap mobile top buttons", () => {
  it("returns null outside game scope", () => {
    const doc = createFakeDocument(true);
    expect(
      ensureMobileUndoTopButtonDom({ isGamePageScope: false, documentLike: doc as any })
    ).toBeNull();
    expect(
      ensureMobileHintToggleButtonDom({ isGamePageScope: false, documentLike: doc as any })
    ).toBeNull();
  });

  it("creates undo top button and appends at host tail", () => {
    const doc = createFakeDocument(true);
    const btn = ensureMobileUndoTopButtonDom({ isGamePageScope: true, documentLike: doc as any });
    expect(btn).not.toBeNull();
    expect(btn?.id).toBe("top-mobile-undo-btn");
    expect(doc.host.lastElementChild?.id).toBe("top-mobile-undo-btn");
  });

  it("moves existing undo top button to host tail", () => {
    const doc = createFakeDocument(true);
    const existing = createElement("top-mobile-undo-btn");
    doc.all.push(existing);
    doc.host.insertBefore(existing, doc.settingsBtn);
    const another = createElement("tail");
    doc.all.push(another);
    doc.host.appendChild(another);

    const btn = ensureMobileUndoTopButtonDom({ isGamePageScope: true, documentLike: doc as any });
    expect(btn).toBe(existing);
    expect(doc.host.lastElementChild?.id).toBe("top-mobile-undo-btn");
  });

  it("creates hint toggle button before settings button", () => {
    const doc = createFakeDocument(true);
    const btn = ensureMobileHintToggleButtonDom({ isGamePageScope: true, documentLike: doc as any });
    expect(btn).not.toBeNull();
    expect(btn?.id).toBe("top-mobile-hint-btn");
    expect(doc.host.children.map((item) => item.id)).toEqual(["top-mobile-hint-btn", "top-settings-btn"]);
  });

  it("appends hint toggle button when settings button is absent", () => {
    const doc = createFakeDocument(false);
    const btn = ensureMobileHintToggleButtonDom({ isGamePageScope: true, documentLike: doc as any });
    expect(btn).not.toBeNull();
    expect(doc.host.lastElementChild?.id).toBe("top-mobile-hint-btn");
  });

  it("supports text and icon variants for expand button", () => {
    setCompactViewport();
    const doc = createFakeDocument(true);
    doc.body.setAttribute("data-top-button-style", "text");
    const btn = ensureMobileExpandToggleButtonDom({ isGamePageScope: true, documentLike: doc as any });
    expect(btn).not.toBeNull();
    expect(btn?.textContent).toBe("Expand");

    (btn as FakeElement).dispatch("click", { preventDefault() {} });
    expect(btn?.textContent).toBe("Collapse");
    expect(doc.body.getAttribute("data-mobile-actions-expanded")).toBe("1");

    doc.body.setAttribute("data-top-button-style", "icon");
    ensureMobileExpandToggleButtonDom({ isGamePageScope: true, documentLike: doc as any });
    expect(btn?.innerHTML).toContain('rect x="4" y="4" width="16" height="16" rx="3"');
    expect(btn?.innerHTML).toContain("M8 12h8");
    expect(btn?.innerHTML).not.toContain("M12 8v8");

    (btn as FakeElement).dispatch("click", { preventDefault() {} });
    expect(btn?.innerHTML).toContain("M12 8v8");
  });

  it("hides expand button when viewport is not compact", () => {
    setCompactViewport();
    const doc = createFakeDocument(true);
    const btn = ensureMobileExpandToggleButtonDom({ isGamePageScope: true, documentLike: doc as any });
    expect(btn).not.toBeNull();
    expect(btn?.style.display).toBe("");

    setDesktopViewport();
    const desktopResult = ensureMobileExpandToggleButtonDom({
      isGamePageScope: true,
      documentLike: doc as any
    });
    expect(desktopResult).toBeNull();
    expect(btn?.style.display).toBe("none");
    expect(btn?.getAttribute("aria-hidden")).toBe("true");
  });

  it("uses undo button as primary and collapses timer in undo modes", () => {
    setCompactViewport();
    const doc = createFakeDocument(true);
    const stats = createElement("stats-panel-toggle");
    const practice = createElement("top-practice-btn");
    const restart = createElement("top-restart-btn");
    const timer = createElement("timerbox-toggle-btn");
    const extra = createElement("top-history-btn");
    doc.all.push(stats, practice, restart, timer, extra);
    doc.host.insertBefore(stats, doc.settingsBtn);
    doc.host.insertBefore(practice, doc.settingsBtn);
    doc.host.insertBefore(restart, doc.settingsBtn);
    doc.host.insertBefore(timer, doc.settingsBtn);
    doc.host.insertBefore(extra, doc.settingsBtn);
    const undo = ensureMobileUndoTopButtonDom({ isGamePageScope: true, documentLike: doc as any }) as FakeElement;
    ensureMobileExpandToggleButtonDom({ isGamePageScope: true, documentLike: doc as any });

    doc.body.setAttribute("data-mode-id", "standard_4x4_pow2_no_undo");
    ensureMobileExpandToggleButtonDom({ isGamePageScope: true, documentLike: doc as any });
    expect(hasClass(timer, "mobile-actions-primary")).toBe(true);
    expect(hasClass(undo, "mobile-actions-collapse-target")).toBe(true);
    expect(hasClass(extra, "mobile-actions-collapse-target")).toBe(true);

    doc.body.setAttribute("data-mode-id", "classic_4x4_pow2_undo");
    ensureMobileExpandToggleButtonDom({ isGamePageScope: true, documentLike: doc as any });
    expect(hasClass(timer, "mobile-actions-collapse-target")).toBe(true);
    expect(hasClass(timer, "mobile-actions-primary")).toBe(false);
    expect(hasClass(undo, "mobile-actions-primary")).toBe(true);
    expect(hasClass(undo, "mobile-actions-collapse-target")).toBe(false);
  });
});
