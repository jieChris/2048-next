import { describe, expect, it } from "vitest";

import {
  createCryptoRandomRuntime,
  fillRandomValues,
  installCryptoRandomRuntime,
  randomBase36,
  randomHex,
  randomId,
  randomInt,
  randomSeed,
  randomUint32,
  randomUnitFloat,
  type CryptoRandomRuntime
} from "../../src/utils/crypto-random";

describe("crypto random runtime installer", () => {
  it("creates the legacy CoreCryptoRandomRuntime shape from TypeScript functions", () => {
    const runtime = createCryptoRandomRuntime();

    expect(runtime.fillRandomValues).toBe(fillRandomValues);
    expect(runtime.randomUint32).toBe(randomUint32);
    expect(runtime.randomUnitFloat).toBe(randomUnitFloat);
    expect(runtime.randomInt).toBe(randomInt);
    expect(runtime.randomSeed).toBe(randomSeed);
    expect(runtime.randomHex).toBe(randomHex);
    expect(runtime.randomBase36).toBe(randomBase36);
    expect(runtime.randomId).toBe(randomId);
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreCryptoRandomRuntime?: CryptoRandomRuntime } = {};

    const installed = installCryptoRandomRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreCryptoRandomRuntime);
    expect(installed?.randomHex).toBeTypeOf("function");
  });

  it("does not overwrite an existing crypto random runtime", () => {
    const existing = createCryptoRandomRuntime();
    const windowLike = { CoreCryptoRandomRuntime: existing };

    const installed = installCryptoRandomRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreCryptoRandomRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installCryptoRandomRuntime({ windowLike: null })).toBeNull();
  });
});

describe("crypto random helpers", () => {
  it("generates legacy seed and hex output shapes", () => {
    expect(randomSeed()).toBeGreaterThanOrEqual(0);
    expect(randomSeed()).toBeLessThan(Number.MAX_SAFE_INTEGER);
    expect(randomHex(4)).toMatch(/^[0-9a-f]{8}$/u);
    expect(randomHex(0)).toBe("");
  });

  it("keeps the numeric randomId overload and supports legacy length options", () => {
    const numericId = randomId("tab", 6);
    const optionsId = randomId("lh", { length: 8 });

    expect(numericId).toMatch(/^tab_[0-9a-z]+_[0-9a-z]{6}$/u);
    expect(optionsId).toMatch(/^lh_[0-9a-z]+_[0-9a-z]{8}$/u);
  });
});
