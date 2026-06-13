import { describe, expect, it, vi } from "vitest";

import {
  createHomeStartupHostRuntime,
  installHomeStartupHostRuntime,
  resolveHomeStartupFromContext,
  type HomeStartupHostRuntime
} from "../../src/bootstrap/home-startup-host";

describe("bootstrap home startup host", () => {
  it("creates the legacy CoreHomeStartupHostRuntime shape from TypeScript functions", () => {
    const runtime = createHomeStartupHostRuntime();

    expect(runtime.resolveHomeStartupFromContext).toBe(resolveHomeStartupFromContext);
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreHomeStartupHostRuntime?: HomeStartupHostRuntime } = {};

    const installed = installHomeStartupHostRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreHomeStartupHostRuntime);
    expect(installed?.resolveHomeStartupFromContext).toBeTypeOf("function");
  });

  it("does not overwrite an existing startup host runtime", () => {
    const existing = createHomeStartupHostRuntime();
    const windowLike = { CoreHomeStartupHostRuntime: existing };

    const installed = installHomeStartupHostRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreHomeStartupHostRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installHomeStartupHostRuntime({ windowLike: null })).toBeNull();
  });

  it("resolves selection from page context and returns startup payload", () => {
    const resolveHomeModeSelectionFromContext = vi.fn(() => ({
      modeKey: "practice",
      modeConfig: { key: "practice", ruleset: "fibonacci" }
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
          return name === "data-mode-id" ? "practice" : null;
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
      key: "practice",
      ruleset: "fibonacci"
    });
    expect(payload).toEqual({
      modeKey: "practice",
      modeConfig: { key: "practice", ruleset: "fibonacci" },
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
