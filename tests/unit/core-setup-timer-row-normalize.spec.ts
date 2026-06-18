import { describe, expect, it, vi } from "vitest";

import {
  appendSetupTimerTrailingNodes,
  createSetupTimerRowNormalizeRuntime,
  installSetupTimerRowNormalizeRuntime,
  normalizeLegacyTimerRowsForSetup,
  type SetupTimerRowNormalizeRuntime
} from "../../src/core/setup-timer-row-normalize";

type TestNode = {
  nodeType: number;
  nodeValue?: string;
  tagName?: string;
  nextSibling?: TestNode | null;
};

function linkNodes(nodes: TestNode[]): TestNode | null {
  nodes.forEach((node, index) => {
    node.nextSibling = nodes[index + 1] || null;
  });
  return nodes[0] || null;
}

function createAppendRow() {
  const appended: TestNode[] = [];
  return {
    appended,
    appendChild: vi.fn((node: TestNode) => {
      appended.push(node);
      return node;
    })
  };
}

describe("core setup timer row normalize", () => {
  it("moves setup timer whitespace and up to two trailing break nodes in order", () => {
    const whitespaceBefore = { nodeType: 3, nodeValue: "  " };
    const firstBreak = { nodeType: 1, tagName: "BR" };
    const whitespaceBetween = { nodeType: 3, nodeValue: "\n" };
    const secondBreak = { nodeType: 1, tagName: "br" };
    const whitespaceAfterLimit = { nodeType: 3, nodeValue: "\t" };
    const row = createAppendRow();
    const first = linkNodes([
      whitespaceBefore,
      firstBreak,
      whitespaceBetween,
      secondBreak,
      whitespaceAfterLimit
    ]);

    expect(appendSetupTimerTrailingNodes(row, first)).toBe(2);
    expect(row.appended).toEqual([
      whitespaceBefore,
      firstBreak,
      whitespaceBetween,
      secondBreak
    ]);
    expect(row.appendChild).toHaveBeenCalledTimes(4);
  });

  it("stops moving setup timer trailing nodes at the first unsupported sibling", () => {
    const whitespaceBefore = { nodeType: 3, nodeValue: " " };
    const unsupportedText = { nodeType: 3, nodeValue: "label" };
    const breakAfterUnsupported = { nodeType: 1, tagName: "br" };
    const row = createAppendRow();
    const first = linkNodes([whitespaceBefore, unsupportedText, breakAfterUnsupported]);

    expect(appendSetupTimerTrailingNodes(row, first)).toBe(0);
    expect(row.appended).toEqual([whitespaceBefore]);
    expect(row.appendChild).toHaveBeenCalledTimes(1);
  });

  it("normalizes an existing timer row class without recreating the row", () => {
    const manager = { id: "manager" };
    const timerBox = { id: "timerbox" };
    const documentLike = { createElement: vi.fn() };
    const existingRow = { id: "timer-row-2048" };
    const operations = {
      resolveTimerBox: vi.fn(() => timerBox),
      resolveDocumentLike: vi.fn(() => documentLike),
      resolveExistingRow: vi.fn(() => existingRow),
      ensureRowItemClass: vi.fn(),
      createRowForSlot: vi.fn()
    };

    expect(
      normalizeLegacyTimerRowsForSetup({ manager, timerSlotIds: [2048] }, operations)
    ).toBe(true);

    expect(operations.resolveTimerBox).toHaveBeenCalledWith(manager);
    expect(operations.resolveDocumentLike).toHaveBeenCalledWith(manager);
    expect(operations.resolveExistingRow).toHaveBeenCalledWith(manager, "timer-row-2048");
    expect(operations.ensureRowItemClass).toHaveBeenCalledWith(existingRow);
    expect(operations.createRowForSlot).not.toHaveBeenCalled();
  });

  it("creates rows only for positive integer timer slots that do not already exist", () => {
    const manager = { id: "manager" };
    const timerBox = { id: "timerbox" };
    const documentLike = { createElement: vi.fn() };
    const operations = {
      resolveTimerBox: vi.fn(() => timerBox),
      resolveDocumentLike: vi.fn(() => documentLike),
      resolveExistingRow: vi.fn(() => null),
      ensureRowItemClass: vi.fn(),
      createRowForSlot: vi.fn()
    };

    expect(
      normalizeLegacyTimerRowsForSetup({ manager, timerSlotIds: [0, "4096", 8192.5, 16384] }, operations)
    ).toBe(true);

    expect(operations.resolveExistingRow.mock.calls.map((call) => call[1])).toEqual([
      "timer-row-4096",
      "timer-row-16384"
    ]);
    expect(operations.createRowForSlot).toHaveBeenNthCalledWith(1, manager, timerBox, documentLike, 4096);
    expect(operations.createRowForSlot).toHaveBeenNthCalledWith(2, manager, timerBox, documentLike, 16384);
    expect(operations.ensureRowItemClass).not.toHaveBeenCalled();
  });

  it("treats missing setup DOM preconditions as handled no-ops", () => {
    const operations = {
      resolveTimerBox: vi.fn(() => null),
      resolveDocumentLike: vi.fn(),
      resolveExistingRow: vi.fn(),
      ensureRowItemClass: vi.fn(),
      createRowForSlot: vi.fn()
    };

    expect(
      normalizeLegacyTimerRowsForSetup({ manager: { id: "manager" }, timerSlotIds: [2048] }, operations)
    ).toBe(true);

    expect(operations.resolveDocumentLike).not.toHaveBeenCalled();
    expect(operations.resolveExistingRow).not.toHaveBeenCalled();
    expect(operations.createRowForSlot).not.toHaveBeenCalled();
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createSetupTimerRowNormalizeRuntime();
    expect(runtime.normalizeLegacyTimerRowsForSetup).toBe(normalizeLegacyTimerRowsForSetup);
    expect(runtime.appendSetupTimerTrailingNodes).toBe(appendSetupTimerTrailingNodes);

    const windowLike: { CoreSetupTimerRowNormalizeRuntime?: SetupTimerRowNormalizeRuntime } = {};
    expect(installSetupTimerRowNormalizeRuntime({ windowLike })).toBe(
      windowLike.CoreSetupTimerRowNormalizeRuntime
    );
    expect(windowLike.CoreSetupTimerRowNormalizeRuntime?.normalizeLegacyTimerRowsForSetup).toBe(
      normalizeLegacyTimerRowsForSetup
    );
    expect(windowLike.CoreSetupTimerRowNormalizeRuntime?.appendSetupTimerTrailingNodes).toBe(
      appendSetupTimerTrailingNodes
    );

    const existing = { normalizeLegacyTimerRowsForSetup: vi.fn(), appendSetupTimerTrailingNodes: vi.fn() };
    expect(
      installSetupTimerRowNormalizeRuntime({
        windowLike: { CoreSetupTimerRowNormalizeRuntime: existing }
      })
    ).toBe(existing);
  });
});
