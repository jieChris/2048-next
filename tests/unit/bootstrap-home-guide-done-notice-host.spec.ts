import { describe, expect, it, vi } from "vitest";

import { applyHomeGuideDoneNotice } from "../../src/bootstrap/home-guide-done-notice-host";

function createHarness() {
  const nodesById: Record<string, Record<string, unknown>> = {};

  const body = {
    appendChild(node: unknown) {
      const record = node as Record<string, unknown>;
      const id = String(record.id || "");
      if (id) {
        nodesById[id] = record;
      }
    }
  };

  const documentLike = {
    body,
    getElementById(id: string) {
      return nodesById[id] || null;
    },
    createElement() {
      return {
        id: "",
        style: {},
        textContent: ""
      };
    }
  };

  return {
    documentLike,
    nodesById
  };
}

describe("bootstrap home guide done notice host", () => {
  it("creates toast once and updates timer on repeated calls", () => {
    const harness = createHarness();
    const clearTimeoutLike = vi.fn();
    const timeoutCalls: Array<() => void> = [];
    let timerId = 0;

    const setTimeoutLike = vi.fn((handler: () => void) => {
      timeoutCalls.push(handler);
      timerId += 1;
      return timerId;
    });

    const input = {
      documentLike: harness.documentLike,
      homeGuideRuntime: {
        resolveHomeGuideDoneNotice() {
          return { message: "完成引导", hideDelayMs: 1500 };
        },
        resolveHomeGuideDoneNoticeStyle() {
          return { zIndex: "9999", opacity: "0" };
        }
      },
      setTimeoutLike,
      clearTimeoutLike
    };

    const first = applyHomeGuideDoneNotice(input);
    expect(first).toEqual({ shown: true, created: true, hideDelayMs: 1500 });

    const toast = harness.nodesById["home-guide-done-toast"];
    expect(toast).toBeTruthy();
    expect(toast.textContent).toBe("完成引导");
    expect((toast.style as Record<string, unknown>).opacity).toBe("1");
    expect(setTimeoutLike).toHaveBeenCalledTimes(1);

    const second = applyHomeGuideDoneNotice(input);
    expect(second).toEqual({ shown: true, created: false, hideDelayMs: 1500 });
    expect(clearTimeoutLike).toHaveBeenCalledWith(1);

    timeoutCalls[1]();
    expect((toast.style as Record<string, unknown>).opacity).toBe("0");
  });

  it("returns noop when dependencies are missing", () => {
    expect(applyHomeGuideDoneNotice({})).toEqual({
      shown: false,
      created: false,
      hideDelayMs: 1200
    });
  });
});
