import { describe, expect, it } from "vitest";

import {
  createGameTopActionsPlacementState,
  createPracticeTopActionsPlacementState,
  syncGameTopActionsPlacement,
  syncPracticeTopActionsPlacement
} from "../../src/bootstrap/top-actions";

type FakeNode = {
  id: string;
  parentNode: FakeParent | null;
  nextSibling: FakeNode | null;
};

type FakeParent = {
  children: FakeNode[];
  insertBefore: (node: FakeNode, referenceNode: FakeNode | null) => void;
  appendChild: (node: FakeNode) => void;
};

function detachFromCurrentParent(node: FakeNode, nextParent: FakeParent): void {
  const oldParent = node.parentNode;
  if (!oldParent || oldParent === nextParent) return;
  const idx = oldParent.children.indexOf(node);
  if (idx >= 0) {
    oldParent.children.splice(idx, 1);
    relinkSiblings(oldParent);
  }
}

function createParent(): FakeParent {
  const parent: FakeParent = {
    children: [],
    insertBefore(node: FakeNode, referenceNode: FakeNode | null) {
      detachFromCurrentParent(node, parent);
      const existingIdx = parent.children.indexOf(node);
      if (existingIdx >= 0) {
        parent.children.splice(existingIdx, 1);
      }
      let idx = referenceNode ? parent.children.indexOf(referenceNode) : -1;
      if (idx < 0) idx = parent.children.length;
      parent.children.splice(idx, 0, node);
      node.parentNode = parent;
      relinkSiblings(parent);
    },
    appendChild(node: FakeNode) {
      detachFromCurrentParent(node, parent);
      const existingIdx = parent.children.indexOf(node);
      if (existingIdx >= 0) {
        parent.children.splice(existingIdx, 1);
      }
      parent.children.push(node);
      node.parentNode = parent;
      relinkSiblings(parent);
    }
  };
  return parent;
}

function relinkSiblings(parent: FakeParent): void {
  for (let i = 0; i < parent.children.length; i++) {
    parent.children[i].nextSibling = i + 1 < parent.children.length ? parent.children[i + 1] : null;
  }
}

function createNode(id: string): FakeNode {
  return { id, parentNode: null, nextSibling: null };
}

describe("bootstrap top actions", () => {
  it("creates game placement state and inserts anchors", () => {
    const origin = createParent();
    const top = createParent();
    const restart = createNode("restart");
    const timer = createNode("timer");
    origin.appendChild(restart);
    origin.appendChild(timer);

    const state = createGameTopActionsPlacementState({
      enabled: true,
      topActionButtons: top,
      restartBtn: restart,
      timerToggleBtn: timer,
      createComment(text: string) {
        return createNode(text);
      }
    });

    expect(state).not.toBeNull();
    expect(origin.children.map((item) => item.id)).toEqual([
      "mobile-restart-anchor",
      "restart",
      "mobile-timer-toggle-anchor",
      "timer"
    ]);
  });

  it("syncs game placement between compact and default", () => {
    const origin = createParent();
    const top = createParent();
    const restart = createNode("restart");
    const timer = createNode("timer");
    origin.appendChild(restart);
    origin.appendChild(timer);

    const state = createGameTopActionsPlacementState({
      enabled: true,
      topActionButtons: top,
      restartBtn: restart,
      timerToggleBtn: timer,
      createComment(text: string) {
        return createNode(text);
      }
    });
    expect(state).not.toBeNull();

    syncGameTopActionsPlacement({ state, compactViewport: true });
    expect(top.children.map((item) => item.id)).toEqual(["restart", "timer"]);

    syncGameTopActionsPlacement({ state, compactViewport: false });
    expect(origin.children.map((item) => item.id)).toEqual([
      "mobile-restart-anchor",
      "restart",
      "mobile-timer-toggle-anchor",
      "timer"
    ]);
  });

  it("creates and syncs practice placement state", () => {
    const origin = createParent();
    const top = createParent();
    const restart = createNode("restart");
    origin.appendChild(restart);

    const state = createPracticeTopActionsPlacementState({
      enabled: true,
      topActionButtons: top,
      restartBtn: restart,
      createComment(text: string) {
        return createNode(text);
      }
    });
    expect(state).not.toBeNull();
    expect(origin.children.map((item) => item.id)).toEqual(["practice-restart-anchor", "restart"]);

    syncPracticeTopActionsPlacement({ state, compactViewport: true });
    expect(top.children.map((item) => item.id)).toEqual(["restart"]);

    syncPracticeTopActionsPlacement({ state, compactViewport: false });
    expect(origin.children.map((item) => item.id)).toEqual(["practice-restart-anchor", "restart"]);
  });

  it("returns null for invalid create inputs", () => {
    expect(
      createGameTopActionsPlacementState({
        enabled: false,
        topActionButtons: {},
        restartBtn: {},
        timerToggleBtn: {},
        createComment() {
          return {};
        }
      })
    ).toBeNull();

    expect(
      createPracticeTopActionsPlacementState({
        enabled: true,
        topActionButtons: null,
        restartBtn: null,
        createComment() {
          return {};
        }
      })
    ).toBeNull();
  });

  it("returns false when syncing without state", () => {
    expect(syncGameTopActionsPlacement({ state: null, compactViewport: true })).toBe(false);
    expect(syncPracticeTopActionsPlacement({ state: null, compactViewport: false })).toBe(false);
  });
});
