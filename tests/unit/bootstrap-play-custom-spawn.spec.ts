import { describe, expect, it, vi } from "vitest";

import {
  PLAY_CUSTOM_FOUR_RATE_PARAM,
  promptCustomFourRate,
  resolvePlayCustomSpawnModeConfig
} from "../../src/bootstrap/play-custom-spawn";

describe("bootstrap play custom spawn", () => {
  it("keeps non-custom mode unchanged", () => {
    const modeConfig = {
      key: "standard_4x4_pow2_no_undo",
      label: "标准模式",
      spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }]
    };
    const result = resolvePlayCustomSpawnModeConfig({
      modeKey: modeConfig.key,
      modeConfig,
      searchLike: "",
      pathname: "/play.html",
      readStoredRate: () => "30",
      writeStoredRate: vi.fn(),
      promptRate: vi.fn(() => "25")
    });

    expect(result.modeConfig).toBe(modeConfig);
    expect(result.parsedFourRate).toBeNull();
    expect(result.promptedRate).toBe(false);
  });

  it("uses query four-rate when provided", () => {
    const writeStoredRate = vi.fn();
    const result = resolvePlayCustomSpawnModeConfig({
      modeKey: "spawn_custom_4x4_pow2_no_undo",
      modeConfig: {
        label: "4率模式",
        spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
        special_rules: {}
      },
      searchLike: "?mode_key=spawn_custom_4x4_pow2_no_undo&four_rate=35",
      pathname: "/play.html",
      readStoredRate: () => null,
      writeStoredRate,
      promptRate: vi.fn(() => "10")
    });

    expect(result.parsedFourRate).toBe(35);
    expect(result.promptedRate).toBe(false);
    expect(result.modeConfig?.spawn_table).toEqual([
      { value: 2, weight: 65 },
      { value: 4, weight: 35 }
    ]);
    expect(writeStoredRate).toHaveBeenCalledWith("35");
  });

  it("uses stored rate as prompt default when query missing", () => {
    const promptRate = vi.fn(() => "10");
    const result = resolvePlayCustomSpawnModeConfig({
      modeKey: "spawn_custom_4x4_pow2_no_undo",
      modeConfig: {
        label: "4率模式",
        spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
        special_rules: {}
      },
      searchLike: "?mode_key=spawn_custom_4x4_pow2_no_undo",
      pathname: "/play.html",
      readStoredRate: () => "40",
      writeStoredRate: vi.fn(),
      promptRate
    });

    expect(result.parsedFourRate).toBe(10);
    expect(result.promptedRate).toBe(true);
    expect(promptRate).toHaveBeenCalledWith("40");
    expect(promptRate).toHaveBeenCalledTimes(1);
    expect(result.modeConfig?.spawn_table).toEqual([
      { value: 2, weight: 90 },
      { value: 4, weight: 10 }
    ]);
  });

  it("prompts and rewrites url when rate missing", () => {
    const replaceUrl = vi.fn();
    const promptRate = vi.fn()
      .mockReturnValueOnce("abc")
      .mockReturnValueOnce("22.5");
    const alertInvalidInput = vi.fn();
    const result = resolvePlayCustomSpawnModeConfig({
      modeKey: "spawn_custom_4x4_pow2_no_undo",
      modeConfig: {
        label: "4率模式",
        spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
        special_rules: {}
      },
      searchLike: "?foo=1",
      pathname: "/play.html",
      hash: "#frag",
      readStoredRate: () => null,
      writeStoredRate: vi.fn(),
      promptRate,
      alertInvalidInput,
      replaceUrl
    });

    expect(result.parsedFourRate).toBe(22.5);
    expect(result.promptedRate).toBe(true);
    expect(alertInvalidInput).toHaveBeenCalledTimes(1);
    expect(replaceUrl).toHaveBeenCalledTimes(1);
    const nextUrl = String(replaceUrl.mock.calls[0][0]);
    expect(nextUrl).toContain("/play.html?");
    expect(nextUrl).toContain("foo=1");
    expect(nextUrl).toContain("mode_key=spawn_custom_4x4_pow2_no_undo");
    expect(nextUrl).toContain("four_rate=22.5");
    expect(nextUrl).toContain("#frag");
  });

  it("returns null mode when prompt canceled", () => {
    const result = resolvePlayCustomSpawnModeConfig({
      modeKey: "spawn_custom_4x4_pow2_no_undo",
      modeConfig: {
        label: "4率模式",
        spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
        special_rules: {}
      },
      searchLike: "",
      pathname: "/play.html",
      readStoredRate: () => null,
      writeStoredRate: vi.fn(),
      promptRate: vi.fn(() => null)
    });

    expect(result.modeConfig).toBeNull();
    expect(result.parsedFourRate).toBeNull();
    expect(result.promptedRate).toBe(true);
  });
});

describe("bootstrap play custom spawn prompt", () => {
  it("loops until valid value", () => {
    const promptRate = vi.fn()
      .mockReturnValueOnce("x")
      .mockReturnValueOnce("20");
    const alertInvalidInput = vi.fn();

    const parsed = promptCustomFourRate(10, promptRate, alertInvalidInput);

    expect(parsed).toBe(20);
    expect(promptRate).toHaveBeenCalledWith("10");
    expect(promptRate).toHaveBeenCalledTimes(2);
    expect(alertInvalidInput).toHaveBeenCalledTimes(1);
  });

  it("allows custom param name override", () => {
    const result = resolvePlayCustomSpawnModeConfig({
      modeKey: "spawn_custom_4x4_pow2_no_undo",
      modeConfig: {
        label: "4率模式",
        spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
        special_rules: {}
      },
      searchLike: "?mode_key=spawn_custom_4x4_pow2_no_undo&rate=12",
      pathname: "/play.html",
      readStoredRate: () => null,
      writeStoredRate: vi.fn(),
      promptRate: vi.fn(() => "10"),
      rateParamName: "rate"
    });

    expect(result.parsedFourRate).toBe(12);
    expect(result.promptedRate).toBe(false);
    expect(result.modeConfig?.spawn_table).toEqual([
      { value: 2, weight: 88 },
      { value: 4, weight: 12 }
    ]);
  });

  it("exports default query param name", () => {
    expect(PLAY_CUSTOM_FOUR_RATE_PARAM).toBe("four_rate");
  });
});
