import { describe, expect, it, vi } from "vitest";

import {
  createSetupTimerRowNormalizeRuntime,
  installSetupTimerRowNormalizeRuntime,
  normalizeLegacyTimerRowsForSetup,
  type SetupTimerRowNormalizeRuntime
} from "../../src/core/setup-timer-row-normalize";

describe("core setup timer row normalize", () => {
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

    const windowLike: { CoreSetupTimerRowNormalizeRuntime?: SetupTimerRowNormalizeRuntime } = {};
    expect(installSetupTimerRowNormalizeRuntime({ windowLike })).toBe(
      windowLike.CoreSetupTimerRowNormalizeRuntime
    );
    expect(windowLike.CoreSetupTimerRowNormalizeRuntime?.normalizeLegacyTimerRowsForSetup).toBe(
      normalizeLegacyTimerRowsForSetup
    );

    const existing = { normalizeLegacyTimerRowsForSetup: vi.fn() };
    expect(
      installSetupTimerRowNormalizeRuntime({
        windowLike: { CoreSetupTimerRowNormalizeRuntime: existing }
      })
    ).toBe(existing);
  });
});
