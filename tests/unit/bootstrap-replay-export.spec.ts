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

  it("adds a download-file action in replay modal export flow", () => {
    const writeText = vi.fn(() => Promise.resolve(undefined));
    const alertLike = vi.fn();

    const removed: unknown[] = [];
    const anchors: Array<Record<string, unknown>> = [];
    const actions = {
      appendChild: vi.fn()
    };

    const modal = {
      querySelector: vi.fn((selector: unknown) => {
        return selector === ".replay-modal-actions" ? actions : null;
      })
    };

    let downloadButton: Record<string, unknown> | null = null;
    const documentLike = {
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn((node: unknown) => {
          removed.push(node);
        })
      },
      getElementById: vi.fn((id: unknown) => {
        if (id === "replay-modal") return modal;
        if (id === "replay-download-btn") return downloadButton;
        return null;
      }),
      createElement: vi.fn((tagName: unknown) => {
        if (tagName === "button") {
          downloadButton = {
            style: {},
            textContent: "",
            className: "",
            type: "",
            onclick: null
          };
          return downloadButton;
        }
        if (tagName === "a") {
          const anchor = {
            style: {},
            href: "",
            download: "",
            click: vi.fn()
          };
          anchors.push(anchor);
          return anchor;
        }
        return {
          style: {}
        };
      }),
      execCommand: vi.fn()
    };

    const createObjectURL = vi.fn(() => "blob://replay-export");
    const revokeObjectURL = vi.fn();

    applyReplayExport({
      gameManager: {
        serialize() {
          return "REPLAY_v1RPL_B64_abcd";
        }
      },
      showReplayModal: vi.fn(),
      navigatorLike: {
        clipboard: {
          writeText
        }
      },
      documentLike,
      windowLike: {
        URL: {
          createObjectURL,
          revokeObjectURL
        }
      },
      alertLike
    });

    expect(downloadButton).toBeTruthy();
    expect(downloadButton?.onclick).toEqual(expect.any(Function));
    expect(downloadButton?.style).toMatchObject({ display: "inline-block" });

    const clickResult = (downloadButton?.onclick as (() => unknown) | null)?.();
    expect(clickResult).toMatchObject({ downloaded: true, filename: "replay-v1.txt" });
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(anchors).toHaveLength(1);
    expect(anchors[0]?.download).toBe("replay-v1.txt");
    expect(removed).toContain(anchors[0]);
  });

  it("supports function-shaped URL runtimes when downloading replay files", () => {
    const alertLike = vi.fn();
    const writeText = vi.fn(() => Promise.resolve(undefined));
    const anchorClick = vi.fn();
    let downloadButton: Record<string, unknown> | null = null;

    const documentLike = {
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn()
      },
      getElementById: vi.fn((id: unknown) => {
        if (id === "replay-modal") return modal;
        if (id === "replay-download-btn") return downloadButton;
        return null;
      }),
      createElement: vi.fn((tagName: unknown) => {
        if (tagName === "button") {
          downloadButton = {
            style: {},
            textContent: "",
            className: "",
            type: "",
            onclick: null
          };
          return downloadButton;
        }
        if (tagName === "a") {
          return {
            style: {},
            href: "",
            download: "",
            click: anchorClick
          };
        }
        return { style: {} };
      }),
      execCommand: vi.fn()
    };

    const actions = { appendChild: vi.fn() };
    const modal = {
      querySelector: vi.fn((selector: unknown) => {
        return selector === ".replay-modal-actions" ? actions : null;
      })
    };
    const createObjectURL = vi.fn(() => "blob://replay-export");
    const revokeObjectURL = vi.fn();
    function URLRuntime() {}
    (URLRuntime as unknown as Record<string, unknown>).createObjectURL = createObjectURL;
    (URLRuntime as unknown as Record<string, unknown>).revokeObjectURL = revokeObjectURL;

    applyReplayExport({
      gameManager: {
        serialize() {
          return "REPLAY_v1RPL_B64_abcd";
        }
      },
      showReplayModal: vi.fn(),
      navigatorLike: {
        clipboard: {
          writeText
        }
      },
      documentLike,
      windowLike: {
        URL: URLRuntime
      },
      alertLike
    });

    const clickResult = (downloadButton?.onclick as (() => unknown) | null)?.();
    expect(clickResult).toMatchObject({ downloaded: true, filename: "replay-v1.txt" });
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(anchorClick).toHaveBeenCalledTimes(1);
    expect(alertLike).not.toHaveBeenCalledWith("瀵煎嚭鏂囦欢澶辫触锛岃绋嶅悗閲嶈瘯銆?");
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
