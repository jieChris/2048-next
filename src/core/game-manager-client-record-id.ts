import { randomHex as defaultRandomHex } from "../utils/crypto-random";

export interface ClientRecordIdManagerLike {
  clientRecordId?: unknown;
}

export interface ClientRecordIdOptions {
  now?: () => number;
  randomHex?: (byteCount: number) => string;
  randomUUID?: () => string;
}

function resolveRandomUUID(options?: ClientRecordIdOptions): (() => string) | null {
  if (typeof options?.randomUUID === "function") return options.randomUUID;
  const cryptoLike = typeof globalThis === "undefined" ? null : globalThis.crypto;
  return cryptoLike && typeof cryptoLike.randomUUID === "function"
    ? () => cryptoLike.randomUUID()
    : null;
}

export function buildClientRecordIdRandomSuffix(options?: ClientRecordIdOptions): string {
  const randomHex = options?.randomHex || defaultRandomHex;
  return randomHex(12);
}

export function createManagerClientRecordId(options: ClientRecordIdOptions = {}): string {
  const randomUUID = resolveRandomUUID(options);
  if (randomUUID) {
    try {
      return `rec_${String(randomUUID()).replace(/-/gu, "")}`;
    } catch (_err) {}
  }
  const now = options.now || Date.now;
  return `rec_${now().toString(36)}_${buildClientRecordIdRandomSuffix(options)}`;
}

export function assignManagerClientRecordId(
  manager: ClientRecordIdManagerLike | null | undefined,
  nextId?: unknown,
  options?: ClientRecordIdOptions
): string {
  if (!manager) return "";
  const normalized = typeof nextId === "string" ? nextId.trim() : "";
  const clientRecordId = normalized || createManagerClientRecordId(options);
  manager.clientRecordId = clientRecordId;
  return clientRecordId;
}

export function resolveManagerClientRecordId(
  manager: ClientRecordIdManagerLike | null | undefined,
  options?: ClientRecordIdOptions
): string {
  if (!manager) return "";
  const current = typeof manager.clientRecordId === "string" ? manager.clientRecordId.trim() : "";
  if (current) return current;
  return assignManagerClientRecordId(manager, "", options);
}
