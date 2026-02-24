import { describe, expect, it } from "vitest";

import { ensureMobileHintModalDom } from "../../src/bootstrap/mobile-hint-modal";

type Listener = (event: { target?: unknown }) => void;

class FakeElement {
  nodeType = 1;
  tagName: string;
  id = "";
  className = "";
  textContent: string | null = null;
  style: { display?: string } = {};
  parentNode: FakeElement | null = null;
  children: FakeElement[] = [];
  private listeners: Record<string, Listener[]> = {};

  constructor(tagName: string) {
    this.tagName = tagName.toUpperCase();
  }

  appendChild(child: FakeElement): void {
    child.parentNode = this;
    this.children.push(child);
  }

  addEventListener(type: string, listener: Listener): void {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(listener);
  }

  dispatch(type: string, event: { target?: unknown }): void {
    const list = this.listeners[type] || [];
    for (let i = 0; i < list.length; i++) {
      list[i](event);
    }
  }

  listenerCount(type: string): number {
    return (this.listeners[type] || []).length;
  }
}

class FakeDocument {
  body = new FakeElement("body");

  createElement(tagName: string): FakeElement {
    return new FakeElement(tagName);
  }

  getElementById(id: string): FakeElement | null {
    function find(node: FakeElement): FakeElement | null {
      if (node.id === id) return node;
      for (let i = 0; i < node.children.length; i++) {
        const found = find(node.children[i]);
        if (found) return found;
      }
      return null;
    }
    return find(this.body);
  }
}

describe("bootstrap mobile hint modal", () => {
  it("returns null outside game scope", () => {
    const doc = new FakeDocument();
    expect(
      ensureMobileHintModalDom({
        isGamePageScope: false,
        documentLike: doc
      })
    ).toBeNull();
  });

  it("creates overlay/body/close button on first call", () => {
    const doc = new FakeDocument();
    const result = ensureMobileHintModalDom({
      isGamePageScope: true,
      documentLike: doc
    });

    expect(result).not.toBeNull();
    expect(result?.overlay.id).toBe("mobile-hint-overlay");
    expect(result?.body.id).toBe("mobile-hint-body");
    expect(result?.closeButton.id).toBe("mobile-hint-close");
    expect(result?.overlay.style?.display).toBe("none");
  });

  it("binds close handlers once and closes on overlay/button click", () => {
    const doc = new FakeDocument();
    const result = ensureMobileHintModalDom({
      isGamePageScope: true,
      documentLike: doc
    });
    expect(result).not.toBeNull();
    const overlay = result!.overlay as FakeElement;
    const closeButton = result!.closeButton as FakeElement;

    const again = ensureMobileHintModalDom({
      isGamePageScope: true,
      documentLike: doc
    });
    expect(again).not.toBeNull();
    expect(overlay.listenerCount("click")).toBe(1);
    expect(closeButton.listenerCount("click")).toBe(1);

    overlay.style.display = "flex";
    overlay.dispatch("click", { target: overlay });
    expect(overlay.style.display).toBe("none");

    overlay.style.display = "flex";
    closeButton.dispatch("click", { target: closeButton });
    expect(overlay.style.display).toBe("none");
  });
});
