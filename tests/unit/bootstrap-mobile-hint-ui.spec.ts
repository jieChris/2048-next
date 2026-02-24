import { describe, expect, it } from "vitest";

import {
  collectMobileHintTextBlockNodes,
  resolveMobileHintDisplayModel,
  syncMobileHintTextBlockVisibility
} from "../../src/bootstrap/mobile-hint-ui";

type FakeElement = {
  nodeType: number;
  tagName: string;
  children: FakeElement[];
  classList: { contains: (token: string) => boolean };
  style: {
    values: Record<string, string>;
    setProperty: (property: string, value: string, priority?: string) => void;
    removeProperty: (property: string) => void;
  };
  attrs: Record<string, string>;
  getAttribute: (name: string) => string | null;
  setAttribute: (name: string, value: string) => void;
  removeAttribute: (name: string) => void;
};

function makeElement(tagName: string, classNames: string[] = []): FakeElement {
  const attrs: Record<string, string> = {};
  const values: Record<string, string> = {};
  return {
    nodeType: 1,
    tagName: tagName.toUpperCase(),
    children: [],
    classList: {
      contains(token: string) {
        return classNames.indexOf(token) !== -1;
      }
    },
    style: {
      values,
      setProperty(property: string, value: string, priority?: string) {
        values[property] = priority ? value + "!" + priority : value;
      },
      removeProperty(property: string) {
        delete values[property];
      }
    },
    attrs,
    getAttribute(name: string) {
      return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null;
    },
    setAttribute(name: string, value: string) {
      attrs[name] = value;
    },
    removeAttribute(name: string) {
      delete attrs[name];
    }
  };
}

describe("bootstrap mobile hint ui", () => {
  it("collects only p/hr nodes after game-container", () => {
    const before = makeElement("p");
    const gameContainer = makeElement("div", ["game-container"]);
    const p = makeElement("p");
    const hr = makeElement("hr");
    const div = makeElement("div");
    const container = makeElement("div");
    container.children = [before, gameContainer, p, hr, div];

    const nodes = collectMobileHintTextBlockNodes(container);
    expect(nodes).toEqual([p, hr]);
  });

  it("hides collected nodes in game scope", () => {
    const gameContainer = makeElement("div", ["game-container"]);
    const p = makeElement("p");
    const hr = makeElement("hr");
    const container = makeElement("div");
    container.children = [gameContainer, p, hr];

    const count = syncMobileHintTextBlockVisibility({
      isGamePageScope: true,
      containerNode: container,
      hidden: true
    });
    expect(count).toBe(2);
    expect(p.style.values.display).toBe("none!important");
    expect(hr.style.values.display).toBe("none!important");
    expect(p.getAttribute("data-mobile-hint-collapsed")).toBe("1");
    expect(hr.getAttribute("data-mobile-hint-collapsed")).toBe("1");
  });

  it("restores only previously-collapsed nodes", () => {
    const gameContainer = makeElement("div", ["game-container"]);
    const p = makeElement("p");
    const hr = makeElement("hr");
    p.setAttribute("data-mobile-hint-collapsed", "1");
    p.style.setProperty("display", "none", "important");
    hr.style.setProperty("display", "none", "important");
    const container = makeElement("div");
    container.children = [gameContainer, p, hr];

    syncMobileHintTextBlockVisibility({
      isGamePageScope: true,
      containerNode: container,
      hidden: false
    });
    expect(p.style.values.display).toBeUndefined();
    expect(p.getAttribute("data-mobile-hint-collapsed")).toBeNull();
    expect(hr.style.values.display).toBe("none!important");
  });

  it("does nothing outside game scope", () => {
    const gameContainer = makeElement("div", ["game-container"]);
    const p = makeElement("p");
    const container = makeElement("div");
    container.children = [gameContainer, p];

    const count = syncMobileHintTextBlockVisibility({
      isGamePageScope: false,
      containerNode: container,
      hidden: true
    });
    expect(count).toBe(0);
    expect(p.style.values.display).toBeUndefined();
  });

  it("resolves display model by compact viewport", () => {
    expect(resolveMobileHintDisplayModel(true)).toEqual({
      collapsedContentEnabled: true,
      buttonDisplay: "inline-flex",
      buttonLabel: "查看提示文本"
    });
    expect(resolveMobileHintDisplayModel(false)).toEqual({
      collapsedContentEnabled: false,
      buttonDisplay: "none",
      buttonLabel: "查看提示文本"
    });
  });
});
