import { Capacitor, registerPlugin } from "@capacitor/core";

export interface SecureStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

interface NativeSecureStoragePlugin {
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
  delete(options: { key: string }): Promise<void>;
}

export const SECURE_STORAGE_ERROR_CODES = [
  "invalid_key",
  "invalid_value",
  "value_too_large",
  "key_invalidated",
  "corrupt_ciphertext",
  "decrypt_failed",
  "secure_storage_unavailable",
  "write_failed",
] as const;

export type SecureStorageErrorCode =
  (typeof SECURE_STORAGE_ERROR_CODES)[number];

export class SecureStorageError extends Error {
  readonly code: SecureStorageErrorCode;

  constructor(code: SecureStorageErrorCode) {
    super(code);
    this.name = "SecureStorageError";
    this.code = code;
  }
}

const nativePlugin = registerPlugin<NativeSecureStoragePlugin>(
  "Next2048SecureStorage",
);
const keyPattern = /^[A-Za-z0-9._:-]{1,128}$/u;
const errorCodes = new Set<string>(SECURE_STORAGE_ERROR_CODES);

function validateKey(key: string): void {
  if (typeof key !== "string" || !keyPattern.test(key)) {
    throw new SecureStorageError("invalid_key");
  }
}

function validateValue(value: string): void {
  if (typeof value !== "string") throw new SecureStorageError("invalid_value");
  if (new TextEncoder().encode(value).byteLength > 64 * 1024) {
    throw new SecureStorageError("value_too_large");
  }
}

export function normalizeSecureStorageError(
  error: unknown,
): SecureStorageError {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? Reflect.get(error, "code")
      : null;
  return new SecureStorageError(
    typeof code === "string" && errorCodes.has(code)
      ? (code as SecureStorageErrorCode)
      : "secure_storage_unavailable",
  );
}

const androidStorage: SecureStorage = {
  async get(key) {
    validateKey(key);
    try {
      const value = (await nativePlugin.get({ key })).value;
      if (value !== null && typeof value !== "string") {
        throw new SecureStorageError("secure_storage_unavailable");
      }
      return value;
    } catch (error) {
      if (error instanceof SecureStorageError) throw error;
      throw normalizeSecureStorageError(error);
    }
  },
  async set(key, value) {
    validateKey(key);
    validateValue(value);
    try {
      await nativePlugin.set({ key, value });
    } catch (error) {
      throw normalizeSecureStorageError(error);
    }
  },
  async delete(key) {
    validateKey(key);
    try {
      await nativePlugin.delete({ key });
    } catch (error) {
      throw normalizeSecureStorageError(error);
    }
  },
};

export function createMemorySecureStorage(): SecureStorage {
  const values = new Map<string, string>();
  return {
    async get(key) {
      validateKey(key);
      return values.get(key) ?? null;
    },
    async set(key, value) {
      validateKey(key);
      validateValue(value);
      values.set(key, value);
    },
    async delete(key) {
      validateKey(key);
      values.delete(key);
    },
  };
}

export function createPlatformSecureStorage(): SecureStorage {
  if (Capacitor.getPlatform() === "android") return androidStorage;
  if (import.meta.env.DEV || import.meta.env.MODE === "test") {
    return createMemorySecureStorage();
  }
  throw new SecureStorageError("secure_storage_unavailable");
}
