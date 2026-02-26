import { describe, expect, it, vi } from "vitest";

import { applyReplayClipboardCopy, applyReplayExport } from "../../src/bootstrap/replay-export";

describe("bootstrap replay export", () => {
  it("returns non-exported state when game manager is missing", () => {
    const result = applyReplayExport({});
    expect(result).toEqual({ exported: false });
  });

  it("exports replay, opens modal and copies via clipboard", async () => {
    const alertLike = vi.fn();
    const writeText = vi.fn(() => Promise.resolve(undefined));
    let actionCallback: ((text: unknown) => unknown) | null = null;

    const showReplayModal = vi.fn(
      (_title: unknown, _content: unknown, _actionName: unknown, callback: (text: unknown) => unknown) => {
        actionCallback = callback;
      }
    );

    const result = applyReplayExport({
      gameManager: {
        serialize() {
          return "replay-v4";
        }
      },
      showReplayModal,
      navigatorLike: {
        clipboard: {
          writeText
        }
      },
      alertLike
    });

    expect(result).toEqual({ exported: true, replay: "replay-v4" });
    expect(showReplayModal).toHaveBeenCalledTimes(1);
    expect(showReplayModal).toHaveBeenCalledWith(
      "导出回放",
      "replay-v4",
      "再次复制",
      expect.any(Function)
    );
    expect(writeText).toHaveBeenCalledWith("replay-v4");

    await Promise.resolve();
    expect(alertLike).toHaveBeenCalledTimes(1);

    actionCallback?.("replay-v4-copy");
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith("replay-v4-copy");
    expect(alertLike).toHaveBeenCalledTimes(2);
  });

  it("falls back to execCommand copy when clipboard API is unavailable", () => {
    const alertLike = vi.fn();
    const textArea = {
      value: "",
      style: {},
      focus: vi.fn(),
      select: vi.fn()
    };
    const body = {
      appendChild: vi.fn(),
      removeChild: vi.fn()
    };
    const documentLike = {
      body,
      createElement: vi.fn(() => textArea),
      execCommand: vi.fn()
    };

    const result = applyReplayClipboardCopy({
      text: "legacy-replay",
      documentLike,
      alertLike
    });

    expect(result).toEqual({ attempted: true, method: "fallback" });
    expect(documentLike.createElement).toHaveBeenCalledWith("textarea");
    expect(documentLike.execCommand).toHaveBeenCalledWith("copy");
    expect(body.appendChild).toHaveBeenCalledWith(textArea);
    expect(body.removeChild).toHaveBeenCalledWith(textArea);
    expect(alertLike).toHaveBeenCalledWith("回放代码已复制到剪贴板！");
  });

  it("reports fallback error when execCommand copy fails", () => {
    const alertLike = vi.fn();
    const error = vi.fn();

    const result = applyReplayClipboardCopy({
      text: "legacy-replay",
      documentLike: {
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn()
        },
        createElement() {
          throw new Error("boom");
        },
        execCommand: vi.fn()
      },
      alertLike,
      consoleLike: { error }
    });

    expect(result).toEqual({ attempted: true, method: "fallback-error" });
    expect(error).toHaveBeenCalledTimes(1);
    expect(alertLike).toHaveBeenCalledWith("自动复制失败，请手动从文本框复制。");
  });
});
