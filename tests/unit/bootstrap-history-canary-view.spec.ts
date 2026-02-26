import { describe, expect, it } from "vitest";

import { resolveHistoryCanaryViewState } from "../../src/bootstrap/history-canary-view";

describe("bootstrap history canary view", () => {
  it("builds core-adapter gate and display labels", () => {
    const state = resolveHistoryCanaryViewState(
      {
        effectiveMode: "core-adapter",
        modeSource: "default",
        forceLegacyEnabled: false,
        forceLegacySource: null
      },
      {
        defaultMode: "core-adapter",
        forceLegacy: null
      }
    );

    expect(state).toEqual({
      gateClass: "history-burnin-gate-pass",
      gateText: "core-adapter 生效",
      effectiveModeText: "core-adapter",
      modeSourceText: "默认策略",
      forceLegacyText: "关闭",
      forceSourceText: "-",
      storedDefaultText: "core-adapter",
      storedForceLegacyText: "-"
    });
  });

  it("builds legacy/fallback labels and storage text", () => {
    const state = resolveHistoryCanaryViewState(
      {
        effectiveMode: "legacy-bridge",
        modeSource: "force-legacy",
        forceLegacyEnabled: true,
        forceLegacySource: "storage"
      },
      {
        defaultMode: "",
        forceLegacy: "1"
      }
    );

    expect(state).toEqual({
      gateClass: "history-burnin-gate-warn",
      gateText: "legacy-bridge 生效",
      effectiveModeText: "legacy-bridge",
      modeSourceText: "强制回滚",
      forceLegacyText: "开启",
      forceSourceText: "本地存储",
      storedDefaultText: "-",
      storedForceLegacyText: "1"
    });
  });

  it("falls back safely for invalid inputs", () => {
    const state = resolveHistoryCanaryViewState(null, undefined);
    expect(state).toEqual({
      gateClass: "history-burnin-gate-warn",
      gateText: "legacy-bridge 生效",
      effectiveModeText: "-",
      modeSourceText: "默认回退",
      forceLegacyText: "关闭",
      forceSourceText: "-",
      storedDefaultText: "-",
      storedForceLegacyText: "-"
    });
  });
});
