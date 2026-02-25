import { describe, expect, it, vi } from "vitest";

import {
  PLAY_CUSTOM_FOUR_RATE_STORAGE_KEY,
  resolvePlayCustomSpawnModeConfigFromContext
} from "../../src/bootstrap/play-custom-spawn-host";

describe("bootstrap play custom spawn host", () => {
  it("delegates to play custom spawn runtime with storage and window bridges", () => {
    const resolveStorageByName = vi.fn(() => ({ name: "local" }));
    const safeReadStorageItem = vi.fn(() => "25");
    const safeSetStorageItem = vi.fn();
    const resolvePlayCustomSpawnModeConfig = vi.fn((input) => {
      const current = input.readStoredRate();
      input.writeStoredRate(current);
      input.promptRate("25");
      input.alertInvalidInput();
      input.replaceUrl("/next");
      return { modeConfig: { key: "spawn_custom_4x4_pow2_no_undo", seen: current } };
    });
    const prompt = vi.fn(() => "25");
    const alert = vi.fn();
    const replaceState = vi.fn();

    const result = resolvePlayCustomSpawnModeConfigFromContext({
      modeKey: "spawn_custom_4x4_pow2_no_undo",
      modeConfig: { key: "spawn_custom_4x4_pow2_no_undo" },
      searchLike: "?mode_key=spawn_custom_4x4_pow2_no_undo&four_rate=25",
      pathname: "/play.html",
      hash: "",
      windowLike: {
        prompt,
        alert,
        history: { replaceState }
      },
      storageRuntimeLike: {
        resolveStorageByName,
        safeReadStorageItem,
        safeSetStorageItem
      },
      playCustomSpawnRuntimeLike: {
        resolvePlayCustomSpawnModeConfig
      }
    });

    expect(resolveStorageByName).toHaveBeenCalledWith({
      windowLike: {
        prompt,
        alert,
        history: { replaceState }
      },
      storageName: "localStorage"
    });
    expect(safeReadStorageItem).toHaveBeenCalledWith({
      storageLike: { name: "local" },
      key: PLAY_CUSTOM_FOUR_RATE_STORAGE_KEY
    });
    expect(safeSetStorageItem).toHaveBeenCalledWith({
      storageLike: { name: "local" },
      key: PLAY_CUSTOM_FOUR_RATE_STORAGE_KEY,
      value: "25"
    });
    expect(prompt).toHaveBeenCalledWith("请输入 4 率（0-100，可输入小数）", "25");
    expect(alert).toHaveBeenCalledWith("输入无效，请输入 0 到 100 的数字。");
    expect(replaceState).toHaveBeenCalledWith(null, "", "/next");
    expect(result).toEqual({ key: "spawn_custom_4x4_pow2_no_undo", seen: "25" });
  });

  it("returns null when runtime returns null", () => {
    const result = resolvePlayCustomSpawnModeConfigFromContext({
      modeKey: "spawn_custom_4x4_pow2_no_undo",
      modeConfig: { key: "spawn_custom_4x4_pow2_no_undo" },
      searchLike: "",
      pathname: "/play.html",
      storageRuntimeLike: {
        resolveStorageByName: () => null,
        safeReadStorageItem: () => null,
        safeSetStorageItem: () => {}
      },
      playCustomSpawnRuntimeLike: {
        resolvePlayCustomSpawnModeConfig: () => null
      }
    });
    expect(result).toBeNull();
  });
});
