import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it, vi } from "vitest";

type SetupTimerUiRuntime = {
  normalizeLegacyTimerRowsForSetup: (manager: Record<string, unknown> | null) => void;
};

function loadSetupTimerUiRuntime(extraContext?: Record<string, unknown>): SetupTimerUiRuntime {
  const scriptPath = path.resolve(
    process.cwd(),
    "js/core_game_manager_setup_timer_ui_helpers_runtime.js"
  );
  const script = readFileSync(scriptPath, "utf8");
  const context = {
    console,
    GameManager: {
      TIMER_SLOT_IDS: [2048, 4096]
    },
    ...extraContext
  };
  vm.runInNewContext(script, context);
  return context as SetupTimerUiRuntime;
}

describe("core game manager setup timer ui runtime", () => {
  it("delegates legacy timer row normalization to the TypeScript runtime", () => {
    const normalizeLegacyTimerRowsForSetup = vi.fn(() => true);
    const timerBox = { id: "timerbox" };
    const existingRow = { id: "timer-row-2048", className: "legacy-row" };
    const resolveManagerElementById = vi.fn((_manager, id: string) => {
      if (id === "timerbox") return timerBox;
      if (id === "timer-row-2048") return existingRow;
      return null;
    });
    const documentLike = { createElement: vi.fn() };
    const resolveManagerDocumentLike = vi.fn(() => documentLike);
    const runtime = loadSetupTimerUiRuntime({
      CoreSetupTimerRowNormalizeRuntime: {
        normalizeLegacyTimerRowsForSetup
      },
      resolveManagerElementById,
      resolveManagerDocumentLike
    });
    const manager = { modeKey: "practice" };

    runtime.normalizeLegacyTimerRowsForSetup(manager);

    expect(normalizeLegacyTimerRowsForSetup).toHaveBeenCalledWith(
      { manager, timerSlotIds: [2048, 4096] },
      expect.objectContaining({
        resolveTimerBox: expect.any(Function),
        resolveDocumentLike: expect.any(Function),
        resolveExistingRow: expect.any(Function),
        ensureRowItemClass: expect.any(Function),
        createRowForSlot: expect.any(Function)
      })
    );

    const operations = normalizeLegacyTimerRowsForSetup.mock.calls[0][1] as Record<
      string,
      (...args: unknown[]) => unknown
    >;
    expect(operations.resolveTimerBox(manager)).toBe(timerBox);
    expect(operations.resolveDocumentLike(manager)).toBe(documentLike);
    expect(operations.resolveExistingRow(manager, "timer-row-2048")).toBe(existingRow);
    operations.ensureRowItemClass(existingRow);
    expect(existingRow.className).toBe("legacy-row timer-row-item");
  });
});
