import { describe, expect, it, vi } from "vitest";

import { resolveHomeStartupFromContext } from "../../src/bootstrap/home-startup-host";

describe("bootstrap home startup host", () => {
  it("resolves selection from page context and returns startup payload", () => {
    const resolveHomeModeSelectionFromContext = vi.fn(() => ({
      modeKey: "practice_legacy",
      modeConfig: { key: "practice_legacy", ruleset: "fibonacci" }
    }));
    const windowLike: {
      location: { search: string };
      ModeCatalog: { mark: string };
      GAME_MODE_CONFIG?: unknown;
    } = {
      location: { search: "?practice_ruleset=fibonacci" },
      ModeCatalog: { mark: "catalog" }
    };
    const documentLike = {
      body: {
        getAttribute(name: string) {
          return name === "data-mode-id" ? "practice_legacy" : null;
        }
      }
    };
    const inputManagerCtor = function FakeInput() {};

    const payload = resolveHomeStartupFromContext({
      windowLike,
      documentLike,
      defaultModeKey: "standard_4x4_pow2_no_undo",
      defaultBoardWidth: 6,
      inputManagerCtor,
      resolveHomeModeSelectionFromContext
    });

    expect(resolveHomeModeSelectionFromContext).toHaveBeenCalledWith({
      bodyLike: documentLike.body,
      locationLike: windowLike.location,
      defaultModeKey: "standard_4x4_pow2_no_undo",
      modeCatalog: windowLike.ModeCatalog
    });
    expect(windowLike.GAME_MODE_CONFIG).toEqual({
      key: "practice_legacy",
      ruleset: "fibonacci"
    });
    expect(payload).toEqual({
      modeKey: "practice_legacy",
      modeConfig: { key: "practice_legacy", ruleset: "fibonacci" },
      inputManagerCtor,
      defaultBoardWidth: 6
    });
  });

  it("falls back to defaults when selection is missing", () => {
    const inputManagerCtor = function FakeInput() {};
    const payload = resolveHomeStartupFromContext({
      windowLike: null,
      documentLike: null,
      inputManagerCtor,
      resolveHomeModeSelectionFromContext: () => null
    });

    expect(payload).toEqual({
      modeKey: "standard_4x4_pow2_no_undo",
      modeConfig: null,
      inputManagerCtor,
      defaultBoardWidth: 4
    });
  });
});
