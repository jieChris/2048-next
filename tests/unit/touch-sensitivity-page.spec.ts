import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  TOUCH_THRESHOLD_STORAGE_KEY,
  moveTestBoard,
  normalizeTouchThreshold,
  resolveMoveDirectionFromDelta,
  writeTouchThreshold
} from "../../src/pages/touch-sensitivity-page";

describe("touch sensitivity page", () => {
  it("normalizes and stores the swipe threshold", () => {
    const storage = { getItem: vi.fn(), setItem: vi.fn() };

    expect(normalizeTouchThreshold(null)).toBe(10);
    expect(normalizeTouchThreshold("bad")).toBe(10);
    expect(normalizeTouchThreshold(2)).toBe(4);
    expect(normalizeTouchThreshold(99)).toBe(28);
    expect(writeTouchThreshold(storage, 12.4)).toBe(12);
    expect(storage.setItem).toHaveBeenCalledWith(TOUCH_THRESHOLD_STORAGE_KEY, "12");
  });

  it("uses the threshold before emitting a move direction", () => {
    expect(resolveMoveDirectionFromDelta(10, 0, 10)).toBeNull();
    expect(resolveMoveDirectionFromDelta(11, 0, 10)).toBe(1);
    expect(resolveMoveDirectionFromDelta(0, -12, 10)).toBe(0);
  });

  it("moves and merges the 3x3 test board without game records", () => {
    expect(moveTestBoard([2, 2, 0, 0, 4, 4, 0, 0, 0], 3)).toEqual({
      board: [4, 0, 0, 8, 0, 0, 0, 0, 0],
      moved: true
    });
  });

  it("uses the shared direct-page bootstrap entry", () => {
    const source = readFileSync(path.resolve(process.cwd(), "src/entries/touch-sensitivity.ts"), "utf8");

    expect(source).toContain('import { bootstrapDirectPage } from "../app/bootstrap-direct-page";');
    expect(source).toContain('import { bootstrapTouchSensitivityPage } from "../pages/touch-sensitivity-page";');
    expect(source).toContain('await bootstrapDirectPage("touch-sensitivity", bootstrapTouchSensitivityPage);');
  });
});
