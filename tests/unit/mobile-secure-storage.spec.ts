import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createMemorySecureStorage,
  createPlatformSecureStorage,
  normalizeSecureStorageError,
  SecureStorageError,
} from "../../mobile/src/platform/secure-storage";

function read(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("mobile secure storage seam", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps the browser adapter memory-only with get/set/delete semantics", async () => {
    const storage = createMemorySecureStorage();
    await expect(storage.get("auth.token")).resolves.toBeNull();
    await storage.set("auth.token", "first");
    await storage.set("auth.token", "second");
    await expect(storage.get("auth.token")).resolves.toBe("second");
    await storage.delete("auth.token");
    await expect(storage.get("auth.token")).resolves.toBeNull();
    await expect(storage.get("../unsafe")).rejects.toThrow("invalid_key");
  });

  it("enforces key and UTF-8 value limits before crossing the bridge", async () => {
    const storage = createMemorySecureStorage();
    const maxKey = "k".repeat(128);
    const maxValue = "v".repeat(64 * 1024);
    await expect(storage.set(maxKey, maxValue)).resolves.toBeUndefined();
    await expect(storage.get(maxKey)).resolves.toBe(maxValue);
    await expect(storage.get("k".repeat(129))).rejects.toMatchObject({
      code: "invalid_key",
    });
    await expect(storage.get(42 as unknown as string)).rejects.toMatchObject({
      code: "invalid_key",
    });
    await expect(
      storage.set("auth.token", 42 as unknown as string),
    ).rejects.toMatchObject({ code: "invalid_value" });
    await expect(
      storage.set("auth.token", `${maxValue}v`),
    ).rejects.toMatchObject({ code: "value_too_large" });
    await expect(
      storage.set("auth.token", "密".repeat(22 * 1024)),
    ).rejects.toMatchObject({ code: "value_too_large" });
  });

  it("normalizes native failures to the finite public error contract", () => {
    expect(
      normalizeSecureStorageError({ code: "key_invalidated" }),
    ).toMatchObject({
      name: "SecureStorageError",
      code: "key_invalidated",
    });
    expect(
      normalizeSecureStorageError({ code: "future_native_error" }),
    ).toMatchObject({
      code: "secure_storage_unavailable",
    });
    expect(normalizeSecureStorageError("failure")).toBeInstanceOf(
      SecureStorageError,
    );
  });

  it("refuses a production browser fallback instead of pretending credentials persisted", () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("MODE", "production");
    expect(() => createPlatformSecureStorage()).toThrow(
      expect.objectContaining({ code: "secure_storage_unavailable" }),
    );
  });

  it("registers a private AES-GCM Android Keystore bridge before Capacitor starts", () => {
    const activity = read(
      "android/app/src/main/java/cn/next2048/app/MainActivity.java",
    );
    const nativeStore = read(
      "android/app/src/main/java/cn/next2048/app/SecureStorage.java",
    );
    const webSeam = read("mobile/src/platform/secure-storage.ts");

    expect(activity).toContain(
      "registerPlugin(Next2048SecureStoragePlugin.class)",
    );
    expect(
      activity.indexOf("registerPlugin(Next2048SecureStoragePlugin.class)"),
    ).toBeLessThan(activity.indexOf("super.onCreate(savedInstanceState)"));
    expect(nativeStore).toContain('"AndroidKeyStore"');
    expect(nativeStore).toContain('"AES/GCM/NoPadding"');
    expect(nativeStore).toContain("Context.MODE_PRIVATE");
    expect(nativeStore).toContain("setRandomizedEncryptionRequired(true)");
    expect(
      nativeStore.match(/cipher\.updateAAD\(aadFor\(key\)\)/gu),
    ).toHaveLength(2);
    expect(webSeam).not.toMatch(/localStorage|sessionStorage/u);
  });
});
