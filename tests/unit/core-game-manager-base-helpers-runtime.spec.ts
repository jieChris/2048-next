import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it } from "vitest";

type MockElement = {
  id?: string;
  nodeType?: number;
  style: Record<string, string>;
  parentNode: MockElement | null;
  nextSibling: MockElement | MockTextNode | null;
  children?: Array<MockElement | MockTextNode>;
  querySelector?: (selector: string) => MockElement | null;
  addEventListener?: (name: string, listener: (event?: unknown) => void) => void;
  getAttribute?: (name: string) => string | null;
  setAttribute?: (name: string, value: string) => void;
  removeAttribute?: (name: string) => void;
  appendChild?: (node: MockElement | MockTextNode) => void;
  insertBefore?: (node: MockElement | MockTextNode, reference: MockElement | MockTextNode | null) => void;
  removeChild?: (node: MockElement | MockTextNode) => void;
  textContent?: string;
  tagName?: string;
};

type MockTextNode = {
  nodeType: 3;
  nodeValue: string;
  nextSibling: MockElement | MockTextNode | null;
  parentNode: MockElement | null;
};

function createClickableElement(options?: { querySelector?: (selector: string) => MockElement | null }) {
  const attrs = new Map<string, string>();
  const listeners: Record<string, Array<(event?: unknown) => void>> = {};
  const element: MockElement = {
    style: {},
    parentNode: null,
    nextSibling: null,
    querySelector: options?.querySelector,
    addEventListener(name: string, listener: (event?: unknown) => void) {
      if (!listeners[name]) listeners[name] = [];
      listeners[name].push(listener);
    },
    getAttribute(name: string) {
      return attrs.has(name) ? String(attrs.get(name)) : null;
    },
    setAttribute(name: string, value: string) {
      attrs.set(String(name), String(value));
    },
    removeAttribute(name: string) {
      attrs.delete(String(name));
    }
  };

  return {
    element,
    getListenerCount(name: string) {
      return (listeners[name] || []).length;
    }
  };
}

function createBasicElement(options?: { id?: string; tagName?: string }) {
  return {
    id: options?.id,
    tagName: options?.tagName,
    style: {},
    parentNode: null,
    nextSibling: null
  } as MockElement;
}

function createContainerElement() {
  const container = {
    style: {},
    parentNode: null,
    nextSibling: null,
    children: [] as Array<MockElement | MockTextNode>
  } as MockElement;

  function relink() {
    const children = container.children || [];
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as MockElement | MockTextNode;
      child.parentNode = container;
      child.nextSibling = i + 1 < children.length ? (children[i + 1] as MockElement | MockTextNode) : null;
    }
  }

  container.appendChild = (node: MockElement | MockTextNode) => {
    const children = container.children || [];
    const existingIndex = children.indexOf(node);
    if (existingIndex >= 0) children.splice(existingIndex, 1);
    children.push(node);
    container.children = children;
    relink();
  };

  container.insertBefore = (node: MockElement | MockTextNode, reference: MockElement | MockTextNode | null) => {
    const children = container.children || [];
    const existingIndex = children.indexOf(node);
    if (existingIndex >= 0) children.splice(existingIndex, 1);
    const refIndex = reference ? children.indexOf(reference) : -1;
    if (refIndex < 0) {
      children.push(node);
    } else {
      children.splice(refIndex, 0, node);
    }
    container.children = children;
    relink();
  };

  container.removeChild = (node: MockElement | MockTextNode) => {
    const children = container.children || [];
    const existingIndex = children.indexOf(node);
    if (existingIndex >= 0) {
      children.splice(existingIndex, 1);
      container.children = children;
      relink();
    }
  };

  return container;
}

function loadBaseHelpersRuntime(slotIds: number[]) {
  const scriptPath = path.resolve(process.cwd(), "js/core_game_manager_base_helpers_runtime.js");
  const script = readFileSync(scriptPath, "utf8");
  const context = {
    console,
    GameManager: {
      TIMER_SLOT_IDS: slotIds
    },
    resolveManagerElementById(manager: Record<string, unknown>, id: string) {
      const elements = (manager.elements || {}) as Record<string, unknown>;
      return Object.prototype.hasOwnProperty.call(elements, id) ? elements[id] : null;
    },
    resolveManagerDocumentLike() {
      return null;
    }
  } as Record<string, unknown>;

  vm.runInNewContext(script, context);
  return context as {
    bindSecondaryTimerParentToggleEvents: (manager: Record<string, unknown>) => void;
    resolveSecondaryTimerParentAnchor: (manager: Record<string, unknown>, timerBox: MockElement, parent: number) => unknown;
    stampSecondaryTimersForMergedValue: (manager: Record<string, unknown>, merged: number, timeStr: string) => void;
    stampSecondaryTimerDescriptor: (descriptor: Record<string, unknown>, timeStr?: string) => void;
    invalidateSecondaryTimersByLimit: (
      manager: Record<string, unknown>,
      limitValue: unknown,
      placeholderText?: string
    ) => boolean;
    resolveSecondaryTimerDescriptors: (manager: Record<string, unknown>) => Array<Record<string, unknown>>;
    refreshSecondaryTimerRowsVisibility: (manager: Record<string, unknown>) => void;
    ensureSecondaryTimerDescriptorRow: (
      manager: Record<string, unknown>,
      container: MockElement,
      rowId: string,
      parent: number,
      child: number
    ) => unknown;
    placeSecondaryTimerRowsNearParents: (
      manager: Record<string, unknown>,
      descriptors: Array<Record<string, unknown>>
    ) => void;
    applySecondaryTimerRowsState: (manager: Record<string, unknown>, rowsState: Array<Record<string, unknown>>) => void;
    resolveSecondaryTimerPlacementDebugSummary: (manager: Record<string, unknown>) => Record<string, unknown> | null;
    resolveSecondaryTimerPlacementDiagnosticsPayload: (
      manager: Record<string, unknown>,
      options?: Record<string, unknown>
    ) => Record<string, unknown> | null;
    resolveSecondaryTimerPlacementDiagnosticsIndexEntry: (
      manager: Record<string, unknown>,
      options?: Record<string, unknown>
    ) => Record<string, unknown> | null;
  };
}

describe("core game manager base helpers runtime", () => {
  it("binds toggle targets once per parent and supports legend fallback from timerbox", () => {
    const runtime = loadBaseHelpersRuntime([8192]);
    const row = createClickableElement({
      querySelector() {
        return null;
      }
    });
    const legend = createClickableElement();
    const timer = createClickableElement();
    const timerBox: MockElement = {
      style: {},
      parentNode: null,
      nextSibling: null,
      querySelector(selector: string) {
        return selector === ".timer-legend-8192" ? legend.element : null;
      }
    };
    const manager = {
      elements: {
        timerbox: timerBox,
        timer8192: timer.element
      },
      getTimerRowEl() {
        return row.element;
      }
    };

    runtime.bindSecondaryTimerParentToggleEvents(manager);
    runtime.bindSecondaryTimerParentToggleEvents(manager);

    expect(row.getListenerCount("click")).toBe(1);
    expect(legend.getListenerCount("click")).toBe(1);
    expect(timer.getListenerCount("click")).toBe(1);
    expect(row.element.getAttribute?.("data-secondary-toggle-bound")).toBe("1");
    expect(legend.element.getAttribute?.("data-secondary-toggle-bound")).toBe("1");
    expect(timer.element.getAttribute?.("data-secondary-toggle-bound")).toBe("1");
    expect(row.element.style.cursor).toBe("pointer");
    expect(legend.element.style.cursor).toBe("pointer");
    expect(timer.element.style.cursor).toBe("pointer");
  });

  it("resolves parent anchor from row first, then falls back to legacy timer+br chain", () => {
    const runtime = loadBaseHelpersRuntime([8192]);
    const timerBox: MockElement = {
      style: {},
      parentNode: null,
      nextSibling: null
    };
    const rowAnchor: MockElement = {
      style: {},
      parentNode: timerBox,
      nextSibling: null
    };
    const timerAnchor: MockElement = {
      style: {},
      parentNode: timerBox,
      nextSibling: null,
      tagName: "div"
    };
    const whitespace: MockTextNode = {
      nodeType: 3,
      nodeValue: " \n ",
      nextSibling: null,
      parentNode: timerBox
    };
    const br1: MockElement = {
      nodeType: 1,
      style: {},
      parentNode: timerBox,
      nextSibling: null,
      tagName: "BR"
    };
    const br2: MockElement = {
      nodeType: 1,
      style: {},
      parentNode: timerBox,
      nextSibling: null,
      tagName: "br"
    };
    const tailNode: MockElement = {
      style: {},
      parentNode: timerBox,
      nextSibling: null,
      tagName: "div"
    };
    timerAnchor.nextSibling = whitespace;
    whitespace.nextSibling = br1;
    br1.nextSibling = br2;
    br2.nextSibling = tailNode;

    const managerWithRow = {
      elements: {
        timer8192: timerAnchor
      },
      getTimerRowEl() {
        return rowAnchor;
      }
    };
    const managerLegacy = {
      elements: {
        timer8192: timerAnchor
      },
      getTimerRowEl() {
        return null;
      }
    };

    expect(runtime.resolveSecondaryTimerParentAnchor(managerWithRow, timerBox, 8192)).toBe(rowAnchor);
    expect(runtime.resolveSecondaryTimerParentAnchor(managerLegacy, timerBox, 8192)).toBe(br2);
  });

  it("uses only first two legacy <br> nodes as anchor extension when more breaks exist", () => {
    const runtime = loadBaseHelpersRuntime([8192]);
    const timerBox: MockElement = {
      style: {},
      parentNode: null,
      nextSibling: null
    };
    const timerAnchor: MockElement = {
      style: {},
      parentNode: timerBox,
      nextSibling: null,
      tagName: "div"
    };
    const br1: MockElement = {
      nodeType: 1,
      style: {},
      parentNode: timerBox,
      nextSibling: null,
      tagName: "br"
    };
    const br2: MockElement = {
      nodeType: 1,
      style: {},
      parentNode: timerBox,
      nextSibling: null,
      tagName: "br"
    };
    const br3: MockElement = {
      nodeType: 1,
      style: {},
      parentNode: timerBox,
      nextSibling: null,
      tagName: "br"
    };
    const tailNode: MockElement = {
      style: {},
      parentNode: timerBox,
      nextSibling: null,
      tagName: "div"
    };
    timerAnchor.nextSibling = br1;
    br1.nextSibling = br2;
    br2.nextSibling = br3;
    br3.nextSibling = tailNode;

    const managerLegacy = {
      elements: {
        timer8192: timerAnchor
      },
      getTimerRowEl() {
        return null;
      }
    };

    expect(runtime.resolveSecondaryTimerParentAnchor(managerLegacy, timerBox, 8192)).toBe(br2);
  });

  it("stamps only eligible descriptors and refreshes rows only when changed", () => {
    const runtime = loadBaseHelpersRuntime([8192, 16384]);
    const stamped = { textContent: "" };
    const alreadySet = { textContent: "existing" };
    const blockedByParent = { textContent: "" };
    const descriptors = [
      { parent: 8192, child: 4096, timerEl: stamped },
      { parent: 8192, child: 4096, timerEl: alreadySet },
      { parent: 16384, child: 4096, timerEl: blockedByParent }
    ];
    const manager = {
      elements: {
        timer8192: { textContent: "1:23.456" },
        timer16384: { textContent: "" }
      }
    };
    let refreshCalls = 0;
    runtime.resolveSecondaryTimerDescriptors = () => descriptors as Array<Record<string, unknown>>;
    runtime.refreshSecondaryTimerRowsVisibility = () => {
      refreshCalls += 1;
    };

    runtime.stampSecondaryTimersForMergedValue(manager, 4096, "9:99.000");
    expect(stamped.textContent).toBe("9:99.000");
    expect(alreadySet.textContent).toBe("existing");
    expect(blockedByParent.textContent).toBe("");
    expect(refreshCalls).toBe(1);

    runtime.stampSecondaryTimersForMergedValue(manager, 4096, "7:77.000");
    runtime.stampSecondaryTimersForMergedValue(manager, 1024, "0:00.000");
    expect(stamped.textContent).toBe("9:99.000");
    expect(refreshCalls).toBe(1);
  });

  it("normalizes empty and undefined stamp text to empty string", () => {
    const runtime = loadBaseHelpersRuntime([8192]);
    const descriptor = {
      timerEl: {
        textContent: "previous"
      }
    };

    runtime.stampSecondaryTimerDescriptor(descriptor, "");
    expect(descriptor.timerEl.textContent).toBe("");

    descriptor.timerEl.textContent = "previous";
    runtime.stampSecondaryTimerDescriptor(descriptor);
    expect(descriptor.timerEl.textContent).toBe("");
  });

  it("ignores merged values below 2048 or non-power-of-two without side effects", () => {
    const runtime = loadBaseHelpersRuntime([8192]);
    const descriptor = {
      parent: 8192,
      child: 4096,
      timerEl: {
        textContent: ""
      }
    };
    const manager = {
      elements: {
        timer8192: { textContent: "1:23.456" }
      }
    };
    let descriptorResolveCalls = 0;
    let refreshCalls = 0;
    runtime.resolveSecondaryTimerDescriptors = () => {
      descriptorResolveCalls += 1;
      return [descriptor] as Array<Record<string, unknown>>;
    };
    runtime.refreshSecondaryTimerRowsVisibility = () => {
      refreshCalls += 1;
    };

    runtime.stampSecondaryTimersForMergedValue(manager, 1024, "1:11.111");
    runtime.stampSecondaryTimersForMergedValue(manager, 3000, "2:22.222");

    expect(descriptor.timerEl.textContent).toBe("");
    expect(descriptorResolveCalls).toBe(0);
    expect(refreshCalls).toBe(0);
  });

  it("skips invalidation scan for non-integer or empty limit values", () => {
    const runtime = loadBaseHelpersRuntime([8192]);
    const manager = { elements: {} };
    let descriptorResolveCalls = 0;
    let refreshCalls = 0;
    runtime.resolveSecondaryTimerDescriptors = () => {
      descriptorResolveCalls += 1;
      return [];
    };
    runtime.refreshSecondaryTimerRowsVisibility = () => {
      refreshCalls += 1;
    };

    expect(runtime.invalidateSecondaryTimersByLimit(manager, 2048.5, "X")).toBe(false);
    expect(runtime.invalidateSecondaryTimersByLimit(manager, "", "X")).toBe(false);

    expect(descriptorResolveCalls).toBe(0);
    expect(refreshCalls).toBe(0);
  });

  it("applies limit=2048 invalidation only to <=limit descriptors and refreshes once", () => {
    const runtime = loadBaseHelpersRuntime([8192]);
    const atLimit = { textContent: "9:99.999" };
    const aboveLimit = { textContent: "8:88.888" };
    const descriptors = [
      { parent: 2048, child: 2048, timerEl: atLimit },
      { parent: 8192, child: 4096, timerEl: aboveLimit }
    ];
    const manager = { elements: {} };
    let descriptorResolveCalls = 0;
    let refreshCalls = 0;
    runtime.resolveSecondaryTimerDescriptors = () => {
      descriptorResolveCalls += 1;
      return descriptors as Array<Record<string, unknown>>;
    };
    runtime.refreshSecondaryTimerRowsVisibility = () => {
      refreshCalls += 1;
    };

    expect(runtime.invalidateSecondaryTimersByLimit(manager, 2048, "")).toBe(true);
    expect(atLimit.textContent).toBe("---------");
    expect(aboveLimit.textContent).toBe("8:88.888");
    expect(descriptorResolveCalls).toBe(1);
    expect(refreshCalls).toBe(1);
  });

  it("does not refresh when invalidation placeholder matches existing values", () => {
    const runtime = loadBaseHelpersRuntime([8192]);
    const alreadyInvalidated = { textContent: "---------" };
    const descriptors = [{ parent: 2048, child: 2048, timerEl: alreadyInvalidated }];
    const manager = { elements: {} };
    let descriptorResolveCalls = 0;
    let refreshCalls = 0;
    runtime.resolveSecondaryTimerDescriptors = () => {
      descriptorResolveCalls += 1;
      return descriptors as Array<Record<string, unknown>>;
    };
    runtime.refreshSecondaryTimerRowsVisibility = () => {
      refreshCalls += 1;
    };

    expect(runtime.invalidateSecondaryTimersByLimit(manager, 2048, "")).toBe(false);
    expect(alreadyInvalidated.textContent).toBe("---------");
    expect(descriptorResolveCalls).toBe(1);
    expect(refreshCalls).toBe(0);
  });

  it("filters malformed secondary state rows before applying timer text", () => {
    const runtime = loadBaseHelpersRuntime([8192, 16384]);
    const validTimer = { textContent: "" };
    const invalidEqualTimer = { textContent: "old-equal" };
    const invalidNonPowerTimer = { textContent: "old-non-power" };
    const manager = { elements: {} };
    let refreshCalls = 0;
    runtime.resolveSecondaryTimerDescriptors = () =>
      [
        { parent: 8192, child: 4096, timerEl: validTimer },
        { parent: 16384, child: 16384, timerEl: invalidEqualTimer },
        { parent: 16384, child: 6000, timerEl: invalidNonPowerTimer }
      ] as Array<Record<string, unknown>>;
    runtime.refreshSecondaryTimerRowsVisibility = () => {
      refreshCalls += 1;
    };

    runtime.applySecondaryTimerRowsState(manager, [
      { parent: 8192, child: 4096, time: "1:11.111" },
      { parent: 16384, child: 16384, time: "2:22.222" },
      { parent: 16384, child: 6000, time: "3:33.333" }
    ]);

    expect(validTimer.textContent).toBe("1:11.111");
    expect(invalidEqualTimer.textContent).toBe("");
    expect(invalidNonPowerTimer.textContent).toBe("");
    expect(refreshCalls).toBe(1);
  });

  it("applies duplicate secondary state rows by last occurrence order", () => {
    const runtime = loadBaseHelpersRuntime([8192]);
    const timer = { textContent: "" };
    const manager = { elements: {} };
    let refreshCalls = 0;
    runtime.resolveSecondaryTimerDescriptors = () => [{ parent: 8192, child: 4096, timerEl: timer }] as Array<Record<string, unknown>>;
    runtime.refreshSecondaryTimerRowsVisibility = () => {
      refreshCalls += 1;
    };

    runtime.applySecondaryTimerRowsState(manager, [
      { parent: 8192, child: 4096, time: "1:11.111" },
      { parent: 8192, child: 4096, time: "2:22.222" }
    ]);
    expect(timer.textContent).toBe("2:22.222");

    runtime.applySecondaryTimerRowsState(manager, [
      { parent: 8192, child: 4096, time: "2:22.222" },
      { parent: 8192, child: 4096, time: "1:11.111" }
    ]);
    expect(timer.textContent).toBe("1:11.111");
    expect(refreshCalls).toBe(2);
  });

  it("treats empty-string state time as valid and ignores non-string overrides", () => {
    const runtime = loadBaseHelpersRuntime([8192]);
    const timer = { textContent: "seed" };
    const manager = { elements: {} };
    runtime.resolveSecondaryTimerDescriptors = () => [{ parent: 8192, child: 4096, timerEl: timer }] as Array<
      Record<string, unknown>
    >;
    runtime.refreshSecondaryTimerRowsVisibility = () => {};

    runtime.applySecondaryTimerRowsState(manager, [
      { parent: 8192, child: 4096, time: "1:11.111" },
      { parent: 8192, child: 4096, time: 0 }
    ]);
    expect(timer.textContent).toBe("1:11.111");

    runtime.applySecondaryTimerRowsState(manager, [
      { parent: 8192, child: 4096, time: "1:11.111" },
      { parent: 8192, child: 4096, time: "" }
    ]);
    expect(timer.textContent).toBe("");
  });

  it("reattaches detached secondary timer row into target container", () => {
    const runtime = loadBaseHelpersRuntime([8192]);
    const targetContainer = createContainerElement();
    const oldContainer = createContainerElement();
    const detachedRow = createBasicElement({ id: "timer-row-secondary-8192-4096" });
    oldContainer.appendChild?.(detachedRow);
    const manager = {
      elements: {
        "timer-row-secondary-8192-4096": detachedRow
      }
    };

    const resolved = runtime.ensureSecondaryTimerDescriptorRow(
      manager,
      targetContainer,
      "timer-row-secondary-8192-4096",
      8192,
      4096
    );

    expect(resolved).toBe(detachedRow);
    expect(detachedRow.parentNode).toBe(targetContainer);
    expect(targetContainer.children?.includes(detachedRow)).toBe(true);
  });

  it("removes only canonical stale secondary rows during descriptor refresh", () => {
    const runtime = loadBaseHelpersRuntime([8192]);
    const timerBox = createContainerElement();
    const activeRow = createBasicElement({ id: "timer-row-secondary-8192-4096" });
    const activeRowAttrs = new Map<string, string>();
    activeRow.setAttribute = (name: string, value: string) => {
      activeRowAttrs.set(String(name), String(value));
    };
    activeRow.getAttribute = (name: string) => {
      return activeRowAttrs.has(String(name)) ? String(activeRowAttrs.get(String(name))) : null;
    };
    activeRow.removeAttribute = (name: string) => {
      activeRowAttrs.delete(String(name));
    };
    const staleManagedRow = createBasicElement({ id: "timer-row-secondary-16384-8192" });
    const malformedPrefixedRow = createBasicElement({ id: "timer-row-secondary-legacy-extra" });
    timerBox.appendChild?.(activeRow);
    timerBox.appendChild?.(staleManagedRow);
    timerBox.appendChild?.(malformedPrefixedRow);

    const manager = {
      elements: {
        timerbox: timerBox,
        "timer-row-secondary-8192-4096": activeRow
      },
      getTimerRowEl() {
        return null;
      }
    };

    runtime.resolveSecondaryTimerDescriptors(manager);

    const children = timerBox.children || [];
    expect(children.includes(activeRow)).toBe(true);
    expect(children.includes(staleManagedRow)).toBe(false);
    expect(children.includes(malformedPrefixedRow)).toBe(true);
  });

  it("skips invalid placement descriptors and anchors outside timerbox", () => {
    const runtime = loadBaseHelpersRuntime([8192, 16384]);
    const timerBox = createContainerElement();
    const foreignContainer = createContainerElement();
    const parentTimerOutside = createBasicElement({ id: "timer8192", tagName: "div" });
    const parentTimerInside = createBasicElement({ id: "timer16384", tagName: "div" });
    const controls = createBasicElement({ id: "timer-scroll-controls", tagName: "div" });
    const validRow = createBasicElement({ id: "timer-row-secondary-16384-8192" });
    const skippedRow = createBasicElement({ id: "timer-row-secondary-8192-4096" });

    foreignContainer.appendChild?.(parentTimerOutside);
    timerBox.appendChild?.(parentTimerInside);
    timerBox.appendChild?.(controls);

    const manager = {
      elements: {
        timerbox: timerBox,
        timer8192: parentTimerOutside,
        timer16384: parentTimerInside,
        "timer-scroll-controls": controls
      },
      getTimerRowEl() {
        return null;
      }
    };

    runtime.placeSecondaryTimerRowsNearParents(manager, [
      { parent: 8192, row: skippedRow },
      { parent: 0, row: createBasicElement({ id: "invalid-parent-row" }) },
      { parent: 16384, row: validRow },
      { parent: 16384 }
    ]);

    expect(skippedRow.parentNode).not.toBe(timerBox);
    expect(validRow.parentNode).toBe(timerBox);
    const children = timerBox.children || [];
    expect(children.indexOf(validRow)).toBeGreaterThan(children.indexOf(parentTimerInside));
    expect(children[children.length - 1]).toBe(controls);
    expect(runtime.resolveSecondaryTimerPlacementDebugSummary(manager)).toMatchObject({
      totalDescriptors: 4,
      validPlacementDescriptors: 2,
      placed: 1,
      skippedDuplicate: 0,
      skippedMissingAnchor: 1,
      dedupeKeyKinds: 2,
      rowIdStrategyHits: 2,
      parentChildStrategyHits: 0,
      rowReferenceStrategyHits: 0
    });
  });

  it("keeps debug summary stable when all descriptors are invalid", () => {
    const runtime = loadBaseHelpersRuntime([8192]);
    const timerBox = createContainerElement();
    const controls = createBasicElement({ id: "timer-scroll-controls", tagName: "div" });
    timerBox.appendChild?.(controls);

    const manager = {
      elements: {
        timerbox: timerBox,
        "timer-scroll-controls": controls
      },
      getTimerRowEl() {
        return null;
      }
    };

    runtime.placeSecondaryTimerRowsNearParents(manager, [
      { parent: 0, row: createBasicElement({ id: "invalid-parent-row" }) },
      { parent: "invalid", child: "invalid", row: createBasicElement({ id: "timer-row-secondary-legacy-extra" }) },
      { parent: 8192 }
    ]);

    expect(runtime.resolveSecondaryTimerPlacementDebugSummary(manager)).toEqual({
      totalDescriptors: 3,
      validPlacementDescriptors: 0,
      placed: 0,
      skippedDuplicate: 0,
      skippedMissingAnchor: 0,
      dedupeKeyKinds: 0,
      rowIdStrategyHits: 0,
      parentChildStrategyHits: 0,
      rowReferenceStrategyHits: 0
    });
  });

  it("reports missing-anchor counts when all valid descriptors cannot be placed", () => {
    const runtime = loadBaseHelpersRuntime([8192]);
    const timerBox = createContainerElement();
    const foreignContainer = createContainerElement();
    const parentTimerOutside = createBasicElement({ id: "timer8192", tagName: "div" });
    const controls = createBasicElement({ id: "timer-scroll-controls", tagName: "div" });
    const rowA = createBasicElement({ id: "timer-row-secondary-8192-4096-a" });
    const rowB = createBasicElement({ id: "timer-row-secondary-8192-2048-b" });
    foreignContainer.appendChild?.(parentTimerOutside);
    timerBox.appendChild?.(controls);

    const manager = {
      elements: {
        timerbox: timerBox,
        timer8192: parentTimerOutside,
        "timer-scroll-controls": controls
      },
      getTimerRowEl() {
        return null;
      }
    };

    runtime.placeSecondaryTimerRowsNearParents(manager, [
      { parent: 8192, row: rowA },
      { parent: 8192, row: rowB }
    ]);

    expect(rowA.parentNode).not.toBe(timerBox);
    expect(rowB.parentNode).not.toBe(timerBox);
    expect(runtime.resolveSecondaryTimerPlacementDebugSummary(manager)).toEqual({
      totalDescriptors: 2,
      validPlacementDescriptors: 2,
      placed: 0,
      skippedDuplicate: 0,
      skippedMissingAnchor: 2,
      dedupeKeyKinds: 2,
      rowIdStrategyHits: 2,
      parentChildStrategyHits: 0,
      rowReferenceStrategyHits: 0
    });
  });

  it("returns zeroed debug summary when placement has not run", () => {
    const runtime = loadBaseHelpersRuntime([8192]);
    const manager = { elements: {} };

    expect(runtime.resolveSecondaryTimerPlacementDebugSummary(manager)).toEqual({
      totalDescriptors: 0,
      validPlacementDescriptors: 0,
      placed: 0,
      skippedDuplicate: 0,
      skippedMissingAnchor: 0,
      dedupeKeyKinds: 0,
      rowIdStrategyHits: 0,
      parentChildStrategyHits: 0,
      rowReferenceStrategyHits: 0
    });
  });

  it("returns null diagnostics payload by default when failure flag is not set", () => {
    const runtime = loadBaseHelpersRuntime([8192]);
    const timerBox = createContainerElement();
    const timer8192 = createBasicElement({ id: "timer8192", tagName: "div" });
    const controls = createBasicElement({ id: "timer-scroll-controls", tagName: "div" });
    const row = createBasicElement({ id: "timer-row-secondary-8192-4096" });
    timerBox.appendChild?.(timer8192);
    timerBox.appendChild?.(controls);
    const manager = {
      elements: {
        timerbox: timerBox,
        timer8192,
        "timer-scroll-controls": controls
      },
      getTimerRowEl() {
        return null;
      }
    };

    runtime.placeSecondaryTimerRowsNearParents(manager, [{ parent: 8192, row }]);

    expect(runtime.resolveSecondaryTimerPlacementDiagnosticsPayload(manager)).toBeNull();
  });

  it("returns whitelisted diagnostics payload with optional dedupe key samples", () => {
    const runtime = loadBaseHelpersRuntime([8192]);
    const manager = {
      elements: {},
      secondaryTimerPlacementDebugSnapshot: {
        totalDescriptors: 4,
        validPlacementDescriptors: 3,
        placed: 1,
        skippedDuplicate: 1,
        skippedMissingAnchor: 1,
        dedupeKeyHits: {
          "parent-child:8192:4096": 3,
          "row-id:8192:timer-row-secondary-8192-4096": 2,
          "row-id:8192:timer-row-secondary-8192-2048": 1
        },
        dedupeStrategyHits: {
          "parent-child": 3,
          "row-id": 3,
          "row-reference": 0
        }
      }
    };

    expect(
      runtime.resolveSecondaryTimerPlacementDiagnosticsPayload(manager, {
        failed: true,
        maxDedupeKeys: 2
      })
    ).toEqual({
      totalDescriptors: 4,
      validPlacementDescriptors: 3,
      placed: 1,
      skippedDuplicate: 1,
      skippedMissingAnchor: 1,
      dedupeKeyKinds: 3,
      rowIdStrategyHits: 3,
      parentChildStrategyHits: 3,
      rowReferenceStrategyHits: 0,
      dedupeKeySamples: [
        "parent-child:8192:4096#3",
        "row-id:8192:timer-row-secondary-8192-4096#2"
      ]
    });
  });

  it("can include zero-activity diagnostics payload when explicitly requested", () => {
    const runtime = loadBaseHelpersRuntime([8192]);
    const manager = { elements: {} };

    expect(
      runtime.resolveSecondaryTimerPlacementDiagnosticsPayload(manager, {
        failed: true,
        includeWhenNoActivity: true
      })
    ).toEqual({
      totalDescriptors: 0,
      validPlacementDescriptors: 0,
      placed: 0,
      skippedDuplicate: 0,
      skippedMissingAnchor: 0,
      dedupeKeyKinds: 0,
      rowIdStrategyHits: 0,
      parentChildStrategyHits: 0,
      rowReferenceStrategyHits: 0
    });
  });

  it("returns diagnostics index entry with stable key and schemaVersion", () => {
    const runtime = loadBaseHelpersRuntime([8192]);
    const manager = {
      elements: {},
      secondaryTimerPlacementDebugSnapshot: {
        totalDescriptors: 2,
        validPlacementDescriptors: 2,
        placed: 1,
        skippedDuplicate: 1,
        skippedMissingAnchor: 0,
        dedupeKeyHits: {
          "row-id:8192:timer-row-secondary-8192-4096": 2
        },
        dedupeStrategyHits: {
          "parent-child": 0,
          "row-id": 2,
          "row-reference": 0
        }
      }
    };

    expect(
      runtime.resolveSecondaryTimerPlacementDiagnosticsIndexEntry(manager, {
        failed: true,
        maxDedupeKeys: 1
      })
    ).toEqual({
      key: "secondaryTimerPlacement",
      schemaVersion: 1,
      payload: {
        totalDescriptors: 2,
        validPlacementDescriptors: 2,
        placed: 1,
        skippedDuplicate: 1,
        skippedMissingAnchor: 0,
        dedupeKeyKinds: 1,
        rowIdStrategyHits: 2,
        parentChildStrategyHits: 0,
        rowReferenceStrategyHits: 0,
        dedupeKeySamples: ["row-id:8192:timer-row-secondary-8192-4096#2"]
      }
    });
  });

  it("returns null diagnostics index entry when payload is excluded", () => {
    const runtime = loadBaseHelpersRuntime([8192]);
    const manager = { elements: {} };

    expect(runtime.resolveSecondaryTimerPlacementDiagnosticsIndexEntry(manager)).toBeNull();
  });

  it("skips placement when parent is below 8192 or not power-of-two", () => {
    const runtime = loadBaseHelpersRuntime([8192, 16384]);
    const timerBox = createContainerElement();
    const timer8192 = createBasicElement({ id: "timer8192", tagName: "div" });
    const controls = createBasicElement({ id: "timer-scroll-controls", tagName: "div" });
    const belowMinRow = createBasicElement({ id: "timer-row-secondary-4096-2048" });
    const nonPowerRow = createBasicElement({ id: "timer-row-secondary-12288-4096" });
    const invalidMetaRow = createBasicElement({ id: "timer-row-secondary-4096-2048-meta" });
    const invalidMetaAttrs: Record<string, string> = {
      "data-secondary-parent": "4096",
      "data-secondary-child": "2048"
    };
    invalidMetaRow.getAttribute = (name: string) =>
      Object.prototype.hasOwnProperty.call(invalidMetaAttrs, name) ? invalidMetaAttrs[name] : null;
    timerBox.appendChild?.(timer8192);
    timerBox.appendChild?.(controls);

    const manager = {
      elements: {
        timerbox: timerBox,
        timer8192,
        "timer-scroll-controls": controls
      },
      getTimerRowEl() {
        return null;
      }
    };

    runtime.placeSecondaryTimerRowsNearParents(manager, [
      { parent: 4096, child: 2048, row: belowMinRow },
      { parent: 12288, child: 4096, row: nonPowerRow },
      { parent: "invalid", child: "invalid", row: invalidMetaRow }
    ]);

    expect(belowMinRow.parentNode).not.toBe(timerBox);
    expect(nonPowerRow.parentNode).not.toBe(timerBox);
    expect(invalidMetaRow.parentNode).not.toBe(timerBox);
    const children = timerBox.children || [];
    expect(children).toEqual([timer8192, controls]);
  });

  it("normalizes placement parent/child from row metadata when descriptor values are invalid", () => {
    const runtime = loadBaseHelpersRuntime([8192]);
    const timerBox = createContainerElement();
    const timer8192 = createBasicElement({ id: "timer8192", tagName: "div" });
    const controls = createBasicElement({ id: "timer-scroll-controls", tagName: "div" });
    const row = createBasicElement({ id: "timer-row-secondary-8192-4096" });
    const rowAttrs: Record<string, string> = {
      "data-secondary-parent": "8192",
      "data-secondary-child": "4096"
    };
    row.getAttribute = (name: string) => (Object.prototype.hasOwnProperty.call(rowAttrs, name) ? rowAttrs[name] : null);

    timerBox.appendChild?.(timer8192);
    timerBox.appendChild?.(controls);

    const manager = {
      elements: {
        timerbox: timerBox,
        timer8192,
        "timer-scroll-controls": controls
      },
      getTimerRowEl() {
        return null;
      }
    };

    runtime.placeSecondaryTimerRowsNearParents(manager, [{ parent: "invalid", child: "invalid", row }]);

    expect(row.parentNode).toBe(timerBox);
    const children = timerBox.children || [];
    expect(children).toEqual([timer8192, row, controls]);
  });

  it("falls back to row id when descriptor and row metadata parent/child are invalid", () => {
    const runtime = loadBaseHelpersRuntime([8192]);
    const timerBox = createContainerElement();
    const timer8192 = createBasicElement({ id: "timer8192", tagName: "div" });
    const controls = createBasicElement({ id: "timer-scroll-controls", tagName: "div" });
    const row = createBasicElement({ id: "timer-row-secondary-8192-4096" });
    row.getAttribute = () => "not-a-number";

    timerBox.appendChild?.(timer8192);
    timerBox.appendChild?.(controls);

    const manager = {
      elements: {
        timerbox: timerBox,
        timer8192,
        "timer-scroll-controls": controls
      },
      getTimerRowEl() {
        return null;
      }
    };

    runtime.placeSecondaryTimerRowsNearParents(manager, [{ parent: null, child: -1, row }]);

    expect(row.parentNode).toBe(timerBox);
    const children = timerBox.children || [];
    expect(children).toEqual([timer8192, row, controls]);
  });

  it("does not dedupe invalid child>=parent descriptors by parent+child key", () => {
    const runtime = loadBaseHelpersRuntime([8192]);
    const timerBox = createContainerElement();
    const timer8192 = createBasicElement({ id: "timer8192", tagName: "div" });
    const rowA = createBasicElement();
    const rowB = createBasicElement();
    const controls = createBasicElement({ id: "timer-scroll-controls", tagName: "div" });
    timerBox.appendChild?.(timer8192);
    timerBox.appendChild?.(controls);

    const manager = {
      elements: {
        timerbox: timerBox,
        timer8192,
        "timer-scroll-controls": controls
      },
      getTimerRowEl() {
        return null;
      }
    };

    runtime.placeSecondaryTimerRowsNearParents(manager, [
      { parent: 8192, child: 8192, row: rowA },
      { parent: 8192, child: 8192, row: rowB }
    ]);

    const children = timerBox.children || [];
    expect(children).toEqual([timer8192, rowA, rowB, controls]);
  });

  it("does not dedupe non-power-of-two child descriptors by parent+child key", () => {
    const runtime = loadBaseHelpersRuntime([8192]);
    const timerBox = createContainerElement();
    const timer8192 = createBasicElement({ id: "timer8192", tagName: "div" });
    const rowA = createBasicElement();
    const rowB = createBasicElement();
    const controls = createBasicElement({ id: "timer-scroll-controls", tagName: "div" });
    timerBox.appendChild?.(timer8192);
    timerBox.appendChild?.(controls);

    const manager = {
      elements: {
        timerbox: timerBox,
        timer8192,
        "timer-scroll-controls": controls
      },
      getTimerRowEl() {
        return null;
      }
    };

    runtime.placeSecondaryTimerRowsNearParents(manager, [
      { parent: 8192, child: 3000, row: rowA },
      { parent: 8192, child: 3000, row: rowB }
    ]);

    const children = timerBox.children || [];
    expect(children).toEqual([timer8192, rowA, rowB, controls]);
  });

  it("keeps per-parent insertion order stable in interleaved multi-parent placement", () => {
    const runtime = loadBaseHelpersRuntime([8192, 16384]);
    const timerBox = createContainerElement();
    const timer8192 = createBasicElement({ id: "timer8192", tagName: "div" });
    const timer16384 = createBasicElement({ id: "timer16384", tagName: "div" });
    const controls = createBasicElement({ id: "timer-scroll-controls", tagName: "div" });
    timerBox.appendChild?.(timer8192);
    timerBox.appendChild?.(timer16384);
    timerBox.appendChild?.(controls);

    const rowA = createBasicElement({ id: "timer-row-secondary-8192-4096-a" });
    const rowB = createBasicElement({ id: "timer-row-secondary-16384-8192-b" });
    const rowC = createBasicElement({ id: "timer-row-secondary-8192-4096-c" });
    const rowD = createBasicElement({ id: "timer-row-secondary-16384-8192-d" });
    const manager = {
      elements: {
        timerbox: timerBox,
        timer8192,
        timer16384,
        "timer-scroll-controls": controls
      },
      getTimerRowEl() {
        return null;
      }
    };

    runtime.placeSecondaryTimerRowsNearParents(manager, [
      { parent: 8192, row: rowA },
      { parent: 16384, row: rowB },
      { parent: 8192, row: rowC },
      { parent: 16384, row: rowD }
    ]);

    const children = timerBox.children || [];
    expect(children).toEqual([timer8192, rowA, rowC, timer16384, rowB, rowD, controls]);
  });

  it("does not re-append scroll controls when they are already at tail", () => {
    const runtime = loadBaseHelpersRuntime([8192]);
    const timerBox = createContainerElement();
    const timer8192 = createBasicElement({ id: "timer8192", tagName: "div" });
    const row = createBasicElement({ id: "timer-row-secondary-8192-4096" });
    const controls = createBasicElement({ id: "timer-scroll-controls", tagName: "div" });
    timerBox.appendChild?.(timer8192);
    timerBox.appendChild?.(row);
    timerBox.appendChild?.(controls);

    let appendCalls = 0;
    const baseAppendChild = timerBox.appendChild;
    timerBox.appendChild = (node: MockElement | MockTextNode) => {
      appendCalls += 1;
      baseAppendChild?.(node);
    };

    const manager = {
      elements: {
        timerbox: timerBox,
        timer8192,
        "timer-scroll-controls": controls
      },
      getTimerRowEl() {
        return null;
      }
    };

    runtime.placeSecondaryTimerRowsNearParents(manager, [{ parent: 8192, row }]);

    expect(appendCalls).toBe(0);
    const children = timerBox.children || [];
    expect(children[children.length - 1]).toBe(controls);
  });

  it("moves scroll controls to tail when trailing nodes exist", () => {
    const runtime = loadBaseHelpersRuntime([8192]);
    const timerBox = createContainerElement();
    const timer8192 = createBasicElement({ id: "timer8192", tagName: "div" });
    const controls = createBasicElement({ id: "timer-scroll-controls", tagName: "div" });
    const footer = createBasicElement({ id: "timer-footer", tagName: "div" });
    timerBox.appendChild?.(timer8192);
    timerBox.appendChild?.(controls);
    timerBox.appendChild?.(footer);

    let appendCalls = 0;
    const baseAppendChild = timerBox.appendChild;
    timerBox.appendChild = (node: MockElement | MockTextNode) => {
      appendCalls += 1;
      baseAppendChild?.(node);
    };

    const manager = {
      elements: {
        timerbox: timerBox,
        timer8192,
        "timer-scroll-controls": controls
      },
      getTimerRowEl() {
        return null;
      }
    };

    runtime.placeSecondaryTimerRowsNearParents(manager, []);

    expect(appendCalls).toBe(1);
    const children = timerBox.children || [];
    expect(children).toEqual([timer8192, footer, controls]);
  });

  it("falls back to existing same-parent secondary row when parent anchor is unavailable", () => {
    const runtime = loadBaseHelpersRuntime([8192]);
    const timerBox = createContainerElement();
    const foreignContainer = createContainerElement();
    const parentTimerOutside = createBasicElement({ id: "timer8192", tagName: "div" });
    const existingRow = createBasicElement({ id: "timer-row-secondary-8192-4096" });
    const newRow = createBasicElement({ id: "timer-row-secondary-8192-4096-new" });
    const controls = createBasicElement({ id: "timer-scroll-controls", tagName: "div" });
    foreignContainer.appendChild?.(parentTimerOutside);
    timerBox.appendChild?.(existingRow);
    timerBox.appendChild?.(controls);

    const manager = {
      elements: {
        timerbox: timerBox,
        timer8192: parentTimerOutside,
        "timer-scroll-controls": controls
      },
      getTimerRowEl() {
        return null;
      }
    };

    runtime.placeSecondaryTimerRowsNearParents(manager, [{ parent: 8192, row: newRow }]);

    const children = timerBox.children || [];
    expect(children).toEqual([existingRow, newRow, controls]);
  });

  it("ignores malformed existing-tail rows without managed parent metadata", () => {
    const runtime = loadBaseHelpersRuntime([8192]);
    const timerBox = createContainerElement();
    const foreignContainer = createContainerElement();
    const parentTimerOutside = createBasicElement({ id: "timer8192", tagName: "div" });
    const malformedExistingRow = createBasicElement({ id: "timer-row-secondary-legacy-extra" });
    const newRow = createBasicElement({ id: "timer-row-secondary-8192-4096-new" });
    const controls = createBasicElement({ id: "timer-scroll-controls", tagName: "div" });
    foreignContainer.appendChild?.(parentTimerOutside);
    timerBox.appendChild?.(malformedExistingRow);
    timerBox.appendChild?.(controls);

    const manager = {
      elements: {
        timerbox: timerBox,
        timer8192: parentTimerOutside,
        "timer-scroll-controls": controls
      },
      getTimerRowEl() {
        return null;
      }
    };

    runtime.placeSecondaryTimerRowsNearParents(manager, [{ parent: 8192, row: newRow }]);

    expect(newRow.parentNode).not.toBe(timerBox);
    const children = timerBox.children || [];
    expect(children).toEqual([malformedExistingRow, controls]);
  });

  it("deduplicates descriptors that target the same secondary row id", () => {
    const runtime = loadBaseHelpersRuntime([8192]);
    const timerBox = createContainerElement();
    const timer8192 = createBasicElement({ id: "timer8192", tagName: "div" });
    const rowPrimary = createBasicElement({ id: "timer-row-secondary-8192-4096" });
    const rowDuplicate = createBasicElement({ id: "timer-row-secondary-8192-4096" });
    const controls = createBasicElement({ id: "timer-scroll-controls", tagName: "div" });
    timerBox.appendChild?.(timer8192);
    timerBox.appendChild?.(controls);

    let insertCalls = 0;
    const baseInsertBefore = timerBox.insertBefore;
    timerBox.insertBefore = (node: MockElement | MockTextNode, reference: MockElement | MockTextNode | null) => {
      insertCalls += 1;
      baseInsertBefore?.(node, reference);
    };

    const manager = {
      elements: {
        timerbox: timerBox,
        timer8192,
        "timer-scroll-controls": controls
      },
      getTimerRowEl() {
        return null;
      }
    };

    runtime.placeSecondaryTimerRowsNearParents(manager, [
      { parent: 8192, row: rowPrimary },
      { parent: 8192, row: rowDuplicate }
    ]);

    expect(insertCalls).toBe(1);
    expect(rowPrimary.parentNode).toBe(timerBox);
    expect(rowDuplicate.parentNode).toBe(null);
    const children = timerBox.children || [];
    expect(children).toEqual([timer8192, rowPrimary, controls]);
    expect(runtime.resolveSecondaryTimerPlacementDebugSummary(manager)).toMatchObject({
      totalDescriptors: 2,
      validPlacementDescriptors: 2,
      placed: 1,
      skippedDuplicate: 1,
      rowIdStrategyHits: 2,
      parentChildStrategyHits: 0,
      rowReferenceStrategyHits: 0
    });
  });

  it("deduplicates descriptors without row id by parent+child key", () => {
    const runtime = loadBaseHelpersRuntime([8192]);
    const timerBox = createContainerElement();
    const timer8192 = createBasicElement({ id: "timer8192", tagName: "div" });
    const rowPrimary = createBasicElement();
    const rowDuplicate = createBasicElement();
    const controls = createBasicElement({ id: "timer-scroll-controls", tagName: "div" });
    timerBox.appendChild?.(timer8192);
    timerBox.appendChild?.(controls);

    let insertCalls = 0;
    const baseInsertBefore = timerBox.insertBefore;
    timerBox.insertBefore = (node: MockElement | MockTextNode, reference: MockElement | MockTextNode | null) => {
      insertCalls += 1;
      baseInsertBefore?.(node, reference);
    };

    const manager = {
      elements: {
        timerbox: timerBox,
        timer8192,
        "timer-scroll-controls": controls
      },
      getTimerRowEl() {
        return null;
      }
    };

    runtime.placeSecondaryTimerRowsNearParents(manager, [
      { parent: 8192, child: 4096, row: rowPrimary },
      { parent: 8192, child: 4096, row: rowDuplicate }
    ]);

    expect(insertCalls).toBe(1);
    expect(rowPrimary.parentNode).toBe(timerBox);
    expect(rowDuplicate.parentNode).toBe(null);
    const children = timerBox.children || [];
    expect(children).toEqual([timer8192, rowPrimary, controls]);
    expect((manager as Record<string, unknown>).secondaryTimerPlacementDebugSnapshot).toMatchObject({
      totalDescriptors: 2,
      validPlacementDescriptors: 2,
      placed: 1,
      skippedDuplicate: 1,
      skippedMissingAnchor: 0,
      dedupeKeyHits: {
        "parent-child:8192:4096": 2
      }
    });
    expect(runtime.resolveSecondaryTimerPlacementDebugSummary(manager)).toEqual({
      totalDescriptors: 2,
      validPlacementDescriptors: 2,
      placed: 1,
      skippedDuplicate: 1,
      skippedMissingAnchor: 0,
      dedupeKeyKinds: 1,
      rowIdStrategyHits: 0,
      parentChildStrategyHits: 2,
      rowReferenceStrategyHits: 0
    });
  });

  it("deduplicates descriptors without row id and child by row reference", () => {
    const runtime = loadBaseHelpersRuntime([8192]);
    const timerBox = createContainerElement();
    const timer8192 = createBasicElement({ id: "timer8192", tagName: "div" });
    const row = createBasicElement();
    const controls = createBasicElement({ id: "timer-scroll-controls", tagName: "div" });
    timerBox.appendChild?.(timer8192);
    timerBox.appendChild?.(controls);

    let insertCalls = 0;
    const baseInsertBefore = timerBox.insertBefore;
    timerBox.insertBefore = (node: MockElement | MockTextNode, reference: MockElement | MockTextNode | null) => {
      insertCalls += 1;
      baseInsertBefore?.(node, reference);
    };

    const manager = {
      elements: {
        timerbox: timerBox,
        timer8192,
        "timer-scroll-controls": controls
      },
      getTimerRowEl() {
        return null;
      }
    };

    runtime.placeSecondaryTimerRowsNearParents(manager, [
      { parent: 8192, row },
      { parent: 8192, row }
    ]);

    expect(insertCalls).toBe(1);
    expect(row.parentNode).toBe(timerBox);
    const children = timerBox.children || [];
    expect(children).toEqual([timer8192, row, controls]);
    expect(runtime.resolveSecondaryTimerPlacementDebugSummary(manager)).toMatchObject({
      totalDescriptors: 2,
      validPlacementDescriptors: 2,
      placed: 1,
      skippedDuplicate: 1,
      rowIdStrategyHits: 0,
      parentChildStrategyHits: 0,
      rowReferenceStrategyHits: 2
    });
  });

  it("does not dedupe same row id across different parents", () => {
    const runtime = loadBaseHelpersRuntime([8192, 16384]);
    const timerBox = createContainerElement();
    const timer8192 = createBasicElement({ id: "timer8192", tagName: "div" });
    const timer16384 = createBasicElement({ id: "timer16384", tagName: "div" });
    const rowA = createBasicElement({ id: "timer-row-secondary-collision" });
    const rowB = createBasicElement({ id: "timer-row-secondary-collision" });
    const controls = createBasicElement({ id: "timer-scroll-controls", tagName: "div" });
    timerBox.appendChild?.(timer8192);
    timerBox.appendChild?.(timer16384);
    timerBox.appendChild?.(controls);

    const manager = {
      elements: {
        timerbox: timerBox,
        timer8192,
        timer16384,
        "timer-scroll-controls": controls
      },
      getTimerRowEl() {
        return null;
      }
    };

    runtime.placeSecondaryTimerRowsNearParents(manager, [
      { parent: 8192, row: rowA },
      { parent: 16384, row: rowB }
    ]);

    expect(rowA.parentNode).toBe(timerBox);
    expect(rowB.parentNode).toBe(timerBox);
    const children = timerBox.children || [];
    expect(children).toEqual([timer8192, rowA, timer16384, rowB, controls]);
  });

  it("falls back to parent anchor when per-parent tail anchor becomes invalid", () => {
    const runtime = loadBaseHelpersRuntime([8192]);
    const timerBox = createContainerElement();
    const foreignContainer = createContainerElement();
    const timer8192 = createBasicElement({ id: "timer8192", tagName: "div" });
    const rowA = createBasicElement({ id: "timer-row-secondary-8192-a" });
    const rowB = createBasicElement({ id: "timer-row-secondary-8192-b" });
    const controls = createBasicElement({ id: "timer-scroll-controls", tagName: "div" });
    timerBox.appendChild?.(timer8192);
    timerBox.appendChild?.(controls);

    let insertCalls = 0;
    const baseInsertBefore = timerBox.insertBefore;
    timerBox.insertBefore = (node: MockElement | MockTextNode, reference: MockElement | MockTextNode | null) => {
      insertCalls += 1;
      baseInsertBefore?.(node, reference);
      if (node === rowA) {
        rowA.parentNode = foreignContainer;
      }
    };

    const manager = {
      elements: {
        timerbox: timerBox,
        timer8192,
        "timer-scroll-controls": controls
      },
      getTimerRowEl() {
        return null;
      }
    };

    runtime.placeSecondaryTimerRowsNearParents(manager, [
      { parent: 8192, row: rowA },
      { parent: 8192, row: rowB }
    ]);

    expect(insertCalls).toBe(2);
    expect(rowB.parentNode).toBe(timerBox);
    const children = timerBox.children || [];
    expect(children.indexOf(rowB)).toBeGreaterThan(children.indexOf(timer8192));
    expect(children[children.length - 1]).toBe(controls);
  });
});
