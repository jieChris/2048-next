import { describe, expect, it, vi } from "vitest";

import {
  bindFlyingClickEffect,
  createFlyingClickEffectRuntime,
  installFlyingClickEffectRuntime,
  triggerFlyingClickEffect,
  type FlyingClickEffectBinding,
  type FlyingClickEffectRuntime
} from "../../src/bootstrap/flying-click-effect";

type Listener = (event?: unknown) => void;

class FakeClassList {
  values = new Set<string>();

  add(value: string): void {
    this.values.add(value);
  }

  contains(value: string): boolean {
    return this.values.has(value);
  }
}

class FakeStyle {
  values = new Map<string, string>();

  setProperty(name: string, value: string): void {
    this.values.set(name, value);
  }

  getPropertyValue(name: string): string {
    return this.values.get(name) || "";
  }
}

class FakeElement {
  attributes = new Map<string, string>();
  children: FakeElement[] = [];
  classList = new FakeClassList();
  listeners = new Map<string, Listener[]>();
  parentNode: FakeElement | null = null;
  style = new FakeStyle();
  textContent = "";

  constructor(public readonly tagName = "span") {}

  appendChild(child: FakeElement): FakeElement {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child: FakeElement): FakeElement {
    this.children = this.children.filter((current) => current !== child);
    child.parentNode = null;
    return child;
  }

  addEventListener(type: string, listener: Listener): void {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: Listener): void {
    const listeners = this.listeners.get(type) || [];
    this.listeners.set(
      type,
      listeners.filter((current) => current !== listener)
    );
  }

  dispatch(type: string, event?: unknown): void {
    const listeners = this.listeners.get(type) || [];
    for (const listener of listeners) listener(event);
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.has(name) ? this.attributes.get(name) || "" : null;
  }

  querySelector(selector: string): FakeElement | null {
    if (selector !== "[data-flying-click-effect-layer=\"1\"]") return null;
    return this.children.find((child) => child.getAttribute("data-flying-click-effect-layer") === "1") || null;
  }
}

function createDocumentLike() {
  return {
    createElement(tagName: string) {
      return new FakeElement(tagName);
    }
  };
}

function createWindowLike(reducedMotion = false) {
  return {
    matchMedia(query: string) {
      return { matches: reducedMotion && query === "(prefers-reduced-motion: reduce)" };
    },
    setTimeout: vi.fn(() => 7),
    clearTimeout: vi.fn()
  };
}

describe("flying click effect", () => {
  it("creates a reusable flight layer and removes the particle after animationend", () => {
    const root = new FakeElement("div");
    const particle = triggerFlyingClickEffect({
      root,
      documentLike: createDocumentLike(),
      windowLike: createWindowLike(),
      random: () => 0.75
    });

    expect(root.classList.contains("flying-click-effect-root")).toBe(true);
    expect(root.children).toHaveLength(1);
    expect(root.children[0].classList.contains("flying-click-effect-layer")).toBe(true);
    expect(particle?.classList.contains("flying-click-effect-particle")).toBe(true);
    expect(particle?.classList.contains("tile")).toBe(true);
    expect(particle?.classList.contains("tile-8192")).toBe(true);
    expect(particle?.classList.contains("tile-super")).toBe(true);
    expect(particle?.textContent).toBe("");
    expect(particle?.children[0].classList.contains("tile-inner")).toBe(true);
    expect(particle?.children[0].textContent).toBe("8192");
    expect(particle?.style.getPropertyValue("--flying-click-x")).toBe("10px");

    particle?.dispatch("animationend");

    expect(root.children[0].children).toHaveLength(0);
  });

  it("binds click handling and can be destroyed without touching the original click behavior", () => {
    const target = new FakeElement("button");
    const root = new FakeElement("div");
    const clickSpy = vi.fn();
    target.addEventListener("click", clickSpy);

    const binding: FlyingClickEffectBinding = bindFlyingClickEffect(target, {
      root,
      documentLike: createDocumentLike(),
      windowLike: createWindowLike(),
      random: () => 0.5
    });

    target.dispatch("click");

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(root.children[0].children[0].children[0].textContent).toBe("512");

    binding.destroy();
    target.dispatch("click");

    expect(clickSpy).toHaveBeenCalledTimes(2);
    expect(root.children[0].children).toHaveLength(1);
  });

  it("uses 65536 as the highest flying tile value", () => {
    const root = new FakeElement("div");
    const particle = triggerFlyingClickEffect({
      root,
      documentLike: createDocumentLike(),
      windowLike: createWindowLike(),
      random: () => 1
    });

    expect(particle?.classList.contains("tile-65536")).toBe(true);
    expect(particle?.classList.contains("tile-super")).toBe(true);
    expect(particle?.children[0].textContent).toBe("65536");
  });

  it("can render an image particle for special click milestones", () => {
    const root = new FakeElement("div");
    const particle = triggerFlyingClickEffect({
      root,
      documentLike: createDocumentLike(),
      windowLike: createWindowLike(),
      particleKind: "image",
      imageSrc: "meta/favicon.svg?v=20260606-fillframe",
      imageAlt: "2048"
    });

    expect(particle?.classList.contains("flying-click-effect-particle")).toBe(true);
    expect(particle?.classList.contains("flying-click-effect-logo")).toBe(true);
    expect(particle?.getAttribute("data-flying-click-effect-kind")).toBe("logo");
    expect(particle?.children[0].tagName).toBe("img");
    expect(particle?.children[0].classList.contains("flying-click-effect-logo-image")).toBe(true);
    expect(particle?.children[0].getAttribute("src")).toBe("meta/favicon.svg?v=20260606-fillframe");
    expect(particle?.children[0].getAttribute("alt")).toBe("2048");
  });

  it("can render a bursting image particle and call completion once on cleanup", () => {
    const root = new FakeElement("div");
    const onComplete = vi.fn();
    const particle = triggerFlyingClickEffect({
      root,
      documentLike: createDocumentLike(),
      windowLike: createWindowLike(),
      particleKind: "image",
      imageSrc: "meta/favicon.svg?v=20260606-fillframe",
      imageBurst: true,
      onComplete
    });

    expect(particle?.classList.contains("flying-click-effect-logo--burst")).toBe(true);
    expect(particle?.children).toHaveLength(13);
    expect(particle?.children[1].classList.contains("flying-click-effect-logo-powder")).toBe(true);
    expect(particle?.children[1].style.getPropertyValue("--flying-click-powder-x")).toBe("-28px");
    expect(particle?.children[1].style.getPropertyValue("--flying-click-powder-y")).toBe("-20px");

    particle?.dispatch("animationend");
    particle?.dispatch("animationend");

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(particle);
    expect(root.children[0].children).toHaveLength(0);
  });

  it("skips particle creation when reduced motion is requested", () => {
    const root = new FakeElement("div");
    const particle = triggerFlyingClickEffect({
      root,
      documentLike: createDocumentLike(),
      windowLike: createWindowLike(true)
    });

    expect(particle).toBeNull();
    expect(root.children).toHaveLength(0);
  });

  it("installs a runtime without overwriting an existing one", () => {
    const runtime = createFlyingClickEffectRuntime();
    const windowLike: { CoreFlyingClickEffectRuntime?: FlyingClickEffectRuntime } = {
      CoreFlyingClickEffectRuntime: runtime
    };

    expect(installFlyingClickEffectRuntime({ windowLike })).toBe(runtime);
    expect(windowLike.CoreFlyingClickEffectRuntime).toBe(runtime);
  });
});
