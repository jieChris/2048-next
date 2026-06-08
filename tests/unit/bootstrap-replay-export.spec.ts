import { describe, expect, it, vi } from "vitest";

import { applyReplayClipboardCopy, applyReplayExport } from "../../src/bootstrap/replay-export";

describe("bootstrap replay export", () => {
  it("returns non-exported state when game manager is missing", () => {
    const result = applyReplayExport({});
    expect(result).toEqual({ exported: false });
  });

  it("shows a visible failure message when replay serialization fails", () => {
    const alertLike = vi.fn();
    const error = vi.fn();
    const showReplayModal = vi.fn();

    const result = applyReplayExport({
      gameManager: {
        serialize() {
          throw new Error("boom");
        }
      },
      showReplayModal,
      alertLike,
      consoleLike: { error }
    });

    expect(result).toEqual({ exported: false, error: true });
    expect(showReplayModal).not.toHaveBeenCalled();
    expect(alertLike).toHaveBeenCalledWith("导出回放失败，请刷新页面后重试。");
    expect(error).toHaveBeenCalledWith("Replay export failed", expect.any(Error));
  });

  it("uses rescue replay string when live serialization fails", () => {
    const alertLike = vi.fn();
    const showReplayModal = vi.fn();

    const result = applyReplayExport({
      gameManager: {
        rescueReplayString: "REPLAY_v1RPL_B64_rescue",
        serialize() {
          throw new Error("boom");
        }
      },
      showReplayModal,
      alertLike
    });

    expect(result).toEqual({
      exported: true,
      replay: "REPLAY_v1RPL_B64_rescue"
    });
    expect(showReplayModal).toHaveBeenCalledWith(
      "导出回放 (v1)",
      "REPLAY_v1RPL_B64_rescue",
      "复制回放",
      expect.any(Function)
    );
    expect(alertLike).not.toHaveBeenCalled();
  });

  it("exports replay, opens modal and only copies via the explicit copy action", async () => {
    const alertLike = vi.fn();
    const writeText = vi.fn(() => Promise.resolve(undefined));
    const toast = {
      style: {},
      textContent: "",
      setAttribute: vi.fn()
    };
    const body = {
      appendChild: vi.fn()
    };
    const documentLike = {
      body,
      getElementById: vi.fn(() => null),
      createElement: vi.fn((tagName: string) => {
        if (tagName === "div") return toast;
        return null;
      })
    };
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
      documentLike,
      alertLike
    });

    expect(result).toEqual({ exported: true, replay: "replay-v4" });
    expect(showReplayModal).toHaveBeenCalledTimes(1);
    expect(showReplayModal).toHaveBeenCalledWith(
      "导出回放",
      "replay-v4",
      "复制回放",
      expect.any(Function)
    );
    expect(writeText).not.toHaveBeenCalled();

    await Promise.resolve();
    expect(alertLike).toHaveBeenCalledTimes(0);

    actionCallback?.("replay-v4-copy");
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith("replay-v4-copy");
    expect(alertLike).toHaveBeenCalledTimes(0);
    expect(documentLike.createElement).toHaveBeenCalledWith("div");
    expect(body.appendChild).toHaveBeenCalledWith(toast);
    expect(String(toast.textContent || "")).not.toHaveLength(0);
    expect(toast.style).toMatchObject({
      opacity: "1",
      pointerEvents: "none",
      position: "fixed",
      top: "48px",
      background: "#ffffff",
      color: "#3c3024"
    });
  });

  it("falls back to execCommand copy when clipboard API is unavailable", () => {
    const alertLike = vi.fn();
    const textArea = {
      value: "",
      style: {},
      focus: vi.fn(),
      select: vi.fn()
    };
    const toast = {
      style: {},
      textContent: "",
      setAttribute: vi.fn()
    };
    const body = {
      appendChild: vi.fn(),
      removeChild: vi.fn()
    };
    const documentLike = {
      body,
      getElementById: vi.fn(() => null),
      createElement: vi.fn((tagName: string) => (tagName === "textarea" ? textArea : toast)),
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
    expect(body.appendChild).toHaveBeenCalledWith(toast);
    expect(String(toast.textContent || "")).not.toHaveLength(0);
    expect(alertLike).not.toHaveBeenCalled();
  });

  it("adds a download-file action in replay modal export flow", () => {
    const writeText = vi.fn(() => Promise.resolve(undefined));
    const alertLike = vi.fn();

    const removed: unknown[] = [];
    const anchors: Array<Record<string, unknown>> = [];
    const downloadButton = {
      style: {},
      textContent: "",
      onclick: null as null | (() => unknown)
    };
    const openPageButton = {
      style: {},
      textContent: "",
      onclick: null as null | (() => unknown)
    };

    const documentLike = {
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn((node: unknown) => {
          removed.push(node);
        })
      },
      getElementById: vi.fn((id: unknown) => {
        if (id === "replay-download-btn") return downloadButton;
        if (id === "replay-open-page-btn") return openPageButton;
        return null;
      }),
      createElement: vi.fn((tagName: unknown) => {
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

    expect(downloadButton.onclick).toEqual(expect.any(Function));
    expect(downloadButton.style).toMatchObject({ display: "inline-block" });

    const clickResult = downloadButton.onclick?.();
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
    const downloadButton = {
      style: {},
      textContent: "",
      onclick: null as null | (() => unknown)
    };
    const openPageButton = {
      style: {},
      textContent: "",
      onclick: null as null | (() => unknown)
    };

    const documentLike = {
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn()
      },
      getElementById: vi.fn((id: unknown) => {
        if (id === "replay-download-btn") return downloadButton;
        if (id === "replay-open-page-btn") return openPageButton;
        return null;
      }),
      createElement: vi.fn((tagName: unknown) => {
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

    const clickResult = downloadButton.onclick?.();
    expect(clickResult).toMatchObject({ downloaded: true, filename: "replay-v1.txt" });
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(anchorClick).toHaveBeenCalledTimes(1);
    expect(alertLike).not.toHaveBeenCalled();
  });

  it("adds an open-replay-page action in replay modal export flow", () => {
    const downloadButton = {
      style: {},
      textContent: "",
      onclick: null as null | (() => unknown)
    };
    const openPageButton = {
      style: {},
      textContent: "",
      onclick: null as null | (() => unknown)
    };
    const localStorageLike = {
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
    const open = vi.fn(() => ({ closed: false }));

    applyReplayExport({
      gameManager: {
        serialize() {
          return "replay-open-page";
        }
      },
      showReplayModal: vi.fn(),
      documentLike: {
        getElementById(id: string) {
          if (id === "replay-download-btn") return downloadButton;
          if (id === "replay-open-page-btn") return openPageButton;
          return null;
        }
      },
      windowLike: {
        localStorage: localStorageLike,
        open
      }
    });

    expect(String(openPageButton.textContent || "")).not.toHaveLength(0);
    expect(openPageButton.style).toMatchObject({ display: "inline-block" });

    const clickResult = openPageButton.onclick?.();
    expect(clickResult).toMatchObject({ opened: true });
    expect(localStorageLike.setItem).toHaveBeenCalledTimes(1);
    expect(localStorageLike.setItem.mock.calls[0][0]).toMatch(/^replay_export_payload_v1:/);
    expect(localStorageLike.setItem.mock.calls[0][1]).toContain("replay-open-page");
    expect(open).toHaveBeenCalledTimes(1);
    expect(open.mock.calls[0][0]).toMatch(/^replay\.html\?local_replay=1&handoff=/);
    expect(open.mock.calls[0][1]).toBe("_blank");
    expect(open.mock.calls[0][2]).toBe("noopener");
  });

  it("treats noopener tab opens as success even when window.open returns null", () => {
    const alertLike = vi.fn();
    const openPageButton = {
      style: {},
      textContent: "",
      onclick: null as null | (() => unknown)
    };
    const localStorageLike = {
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
    const open = vi.fn(() => null);

    applyReplayExport({
      gameManager: {
        serialize() {
          return "replay-open-page";
        }
      },
      showReplayModal: vi.fn(),
      documentLike: {
        getElementById(id: string) {
          if (id === "replay-open-page-btn") return openPageButton;
          return null;
        }
      },
      windowLike: {
        localStorage: localStorageLike,
        open
      },
      alertLike
    });

    const clickResult = openPageButton.onclick?.();
    expect(clickResult).toMatchObject({ opened: true });
    expect(localStorageLike.setItem).toHaveBeenCalledTimes(1);
    expect(localStorageLike.removeItem).not.toHaveBeenCalled();
    expect(alertLike).not.toHaveBeenCalled();
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
    expect(alertLike).toHaveBeenCalledTimes(1);
  });
});
