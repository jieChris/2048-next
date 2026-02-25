import { describe, expect, it } from "vitest";

import {
  ensureMobileHintToggleButtonDom,
  ensureMobileUndoTopButtonDom
} from "../../src/bootstrap/mobile-top-buttons";

type FakeElement = {
  id: string;
  className: string;
  href: string;
  innerHTML: string;
  parentNode: FakeElement | null;
  nextSibling: FakeElement | null;
  lastElementChild: FakeElement | null;
  children: FakeElement[];
  appendChild: (node: FakeElement) => void;
  insertBefore: (node: FakeElement, referenceNode: FakeElement | null) => void;
};

type FakeDocument = {
  all: FakeElement[];
  host: FakeElement;
  settingsBtn: FakeElement | null;
  getElementById: (id: string) => FakeElement | null;
  createElement: (tagName: string) => FakeElement;
  querySelector: (selector: string) => FakeElement | null;
};

function createElement(id = ""): FakeElement {
  const el: FakeElement = {
    id,
    className: "",
    href: "",
    innerHTML: "",
    parentNode: null,
    nextSibling: null,
    lastElementChild: null,
    children: [],
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
  const all: FakeElement[] = [host];
  const settingsBtn = withSettings ? createElement("top-settings-btn") : null;
  if (settingsBtn) {
    host.appendChild(settingsBtn);
    all.push(settingsBtn);
  }

  return {
    all,
    host,
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
});
