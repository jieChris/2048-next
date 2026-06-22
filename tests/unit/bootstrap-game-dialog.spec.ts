import { describe, expect, it, vi } from "vitest";

import { installGameDialog } from "../../src/bootstrap/game-dialog";

type Listener = (event: { target?: unknown; key?: string; preventDefault?: () => void }) => void;

class FakeElement {
  id = "";
  className = "";
  textContent: string | null = null;
  value = "";
  style: Record<string, string> = {};
  parentNode: FakeElement | null = null;
  children: FakeElement[] = [];
  firstChild: FakeElement | null = null;
  private listeners: Record<string, Listener[]> = {};
  classList = {
    remove: (...classes: string[]) => {
      const current = new Set(this.className.split(/\s+/).filter(Boolean));
      classes.forEach((className) => current.delete(className));
      this.className = Array.from(current).join(" ");
    }
  };

  constructor(public tagName: string) {}

  appendChild(child: FakeElement): FakeElement {
    child.parentNode = this;
    this.children.push(child);
    this.firstChild = this.children[0] || null;
    return child;
  }

  removeChild(child: FakeElement): FakeElement {
    this.children = this.children.filter((item) => item !== child);
    child.parentNode = null;
    this.firstChild = this.children[0] || null;
    return child;
  }

  setAttribute(name: string, value: string): void {
    (this as unknown as Record<string, string>)[name] = value;
  }

  addEventListener(type: string, listener: Listener): void {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(listener);
  }

  dispatch(type: string, event: { target?: unknown; key?: string; preventDefault?: () => void } = {}): void {
    for (const listener of this.listeners[type] || []) {
      listener(event);
    }
  }

  focus = vi.fn();
}

class FakeDocument {
  body = new FakeElement("body");
  documentElement = new FakeElement("html");
  activeElement: FakeElement | null = null;

  createElement(tagName: string): FakeElement {
    return new FakeElement(tagName);
  }

  createTextNode(text: string): FakeElement {
    const node = new FakeElement("#text");
    node.textContent = text;
    return node;
  }

  getElementById(id: string): FakeElement | null {
    function find(node: FakeElement): FakeElement | null {
      if (node.id === id) return node;
      for (const child of node.children) {
        const found = find(child);
        if (found) return found;
      }
      return null;
    }
    return find(this.body);
  }
}

function createHarness() {
  const documentLike = new FakeDocument();
  const windowLike = {
    document: documentLike,
    setTimeout: (callback: () => void) => {
      callback();
      return 1;
    }
  };
  const runtime = installGameDialog(windowLike as unknown as Window);
  return { documentLike, runtime };
}

describe("bootstrap game dialog", () => {
  it("renders a themed confirm dialog and resolves true on confirm", async () => {
    const { documentLike, runtime } = createHarness();
    expect(runtime).not.toBeNull();

    const promise = runtime!.confirm("删除这条记录？", { kind: "danger" });
    const overlay = documentLike.getElementById("game-dialog-overlay");
    const message = documentLike.getElementById("game-dialog-message");
    const confirmButton = documentLike.getElementById("game-dialog-confirm");

    expect(overlay?.style.display).toBe("flex");
    expect(overlay?.className).toContain("is-danger");
    expect(message?.children.map((child) => child.textContent).join("")).toBe("删除这条记录？");

    confirmButton?.dispatch("click", { target: confirmButton });
    await expect(promise).resolves.toBe(true);
    expect(overlay?.style.display).toBe("none");
  });

  it("resolves false when confirm is cancelled", async () => {
    const { documentLike, runtime } = createHarness();

    const promise = runtime!.confirm("清空全部记录？");
    const cancelButton = documentLike.getElementById("game-dialog-cancel");
    cancelButton?.dispatch("click", { target: cancelButton });

    await expect(promise).resolves.toBe(false);
  });

  it("resolves prompt input text", async () => {
    const { documentLike, runtime } = createHarness();

    const promise = runtime!.prompt("昵称", "Jay");
    const inputWrap = documentLike.getElementById("game-dialog-input-wrap");
    const input = inputWrap?.children[0];
    expect(input?.value).toBe("Jay");
    if (input) input.value = "NewJay";

    documentLike.getElementById("game-dialog-confirm")?.dispatch("click");
    await expect(promise).resolves.toBe("NewJay");
  });
});
