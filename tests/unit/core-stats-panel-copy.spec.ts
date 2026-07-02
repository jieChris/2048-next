import { describe, expect, it, vi } from "vitest";

import {
  createStatsPanelCopyRuntime,
  installStatsPanelCopyRuntime,
  resolveStatsPanelCopy,
  resolveStatsPanelLanguage,
  type StatsPanelCopyRuntime
} from "../../src/core/stats-panel-copy";

describe("core stats panel copy", () => {
  it("normalizes language sources and returns matching labels", () => {
    expect(resolveStatsPanelLanguage({ i18nLanguage: "en-US" })).toBe("en");
    expect(resolveStatsPanelLanguage({ storageLanguage: "zh-CN" })).toBe("zh");
    expect(resolveStatsPanelLanguage({ documentLanguage: "fr" })).toBe("zh");
    expect(resolveStatsPanelCopy("en").title).toBe("Stats Summary");
    expect(resolveStatsPanelCopy("en").totalSteps).toBe("Total Actions");
    expect(resolveStatsPanelCopy("en").moveSteps).toBe("Effective Moves");
    expect(resolveStatsPanelCopy("en").undoSteps).toBe("Undo Count");
    expect(resolveStatsPanelCopy("zh").button).toBe("统计");
    expect(resolveStatsPanelCopy("zh").totalSteps).toBe("总操作数");
    expect(resolveStatsPanelCopy("zh").moveSteps).toBe("有效移动数");
    expect(resolveStatsPanelCopy("zh").undoSteps).toBe("撤回次数");
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createStatsPanelCopyRuntime();
    expect(runtime.resolveStatsPanelCopy).toBe(resolveStatsPanelCopy);
    expect(runtime.resolveStatsPanelLanguage).toBe(resolveStatsPanelLanguage);

    const windowLike: { CoreStatsPanelCopyRuntime?: StatsPanelCopyRuntime } = {};
    expect(installStatsPanelCopyRuntime({ windowLike })).toBe(
      windowLike.CoreStatsPanelCopyRuntime
    );
    expect(windowLike.CoreStatsPanelCopyRuntime?.resolveStatsPanelCopy).toBe(
      resolveStatsPanelCopy
    );

    const existing = {
      resolveStatsPanelCopy: vi.fn(),
      resolveStatsPanelLanguage: vi.fn()
    };
    expect(
      installStatsPanelCopyRuntime({
        windowLike: { CoreStatsPanelCopyRuntime: existing }
      })
    ).toBe(existing);
  });
});
