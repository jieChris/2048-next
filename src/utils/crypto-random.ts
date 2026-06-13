let fallbackCounter = 0;

export interface CryptoRandomOptions {
  requireCrypto?: boolean;
  length?: number;
}

export interface CryptoRandomRuntime {
  fillRandomValues: typeof fillRandomValues;
  randomUint32: typeof randomUint32;
  randomUnitFloat: typeof randomUnitFloat;
  randomInt: typeof randomInt;
  randomSeed: typeof randomSeed;
  randomHex: typeof randomHex;
  randomBase36: typeof randomBase36;
  randomId: typeof randomId;
}

export interface CryptoRandomRuntimeWindowLike {
  CoreCryptoRandomRuntime?: CryptoRandomRuntime;
}

export interface CryptoRandomRuntimeInstallOptions {
  windowLike?: CryptoRandomRuntimeWindowLike | null | undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!(value && typeof value === "object");
}

function resolveCryptoLike(): Crypto | null {
  if (typeof globalThis !== "undefined" && globalThis.crypto) return globalThis.crypto;
  const globalRecord =
    typeof globalThis === "undefined" ? null : (globalThis as unknown as Record<string, unknown>);
  const msCrypto = globalRecord?.msCrypto;
  if (msCrypto && typeof (msCrypto as Crypto).getRandomValues === "function") {
    return msCrypto as Crypto;
  }
  return null;
}

function nextFallbackUint32(): number {
  fallbackCounter = (fallbackCounter + 1) >>> 0;
  const now = Date.now() >>> 0;
  const perf =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? Math.max(0, Math.floor(performance.now() * 1000)) >>> 0
      : 0;
  let mixed = (now ^ Math.imul(perf || 1, 2654435761) ^ Math.imul(fallbackCounter, 2246822519)) >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x7feb352d) >>> 0;
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x846ca68b) >>> 0;
  mixed ^= mixed >>> 16;
  return mixed >>> 0;
}

export function fillRandomValues<T extends ArrayBufferView>(values: T, options?: CryptoRandomOptions): T {
  if (!values || typeof values.byteLength !== "number") {
    throw new Error("crypto_random_invalid_buffer");
  }
  const cryptoLike = resolveCryptoLike();
  if (cryptoLike && typeof cryptoLike.getRandomValues === "function") {
    try {
      return cryptoLike.getRandomValues(values);
    } catch (_err) {}
  }
  if (options?.requireCrypto === true) {
    throw new Error("crypto_random_unavailable");
  }
  const view = new DataView(values.buffer, values.byteOffset, values.byteLength);
  for (let offset = 0; offset < values.byteLength; offset += 4) {
    const value = nextFallbackUint32();
    const remaining = values.byteLength - offset;
    if (remaining >= 4) {
      view.setUint32(offset, value, true);
    } else {
      for (let index = 0; index < remaining; index += 1) {
        view.setUint8(offset + index, (value >>> (index * 8)) & 0xff);
      }
    }
  }
  return values;
}

export function randomUint32(options?: CryptoRandomOptions): number {
  const values = new Uint32Array(1);
  fillRandomValues(values, options);
  return values[0] >>> 0;
}

export function randomUnitFloat(options?: CryptoRandomOptions): number {
  return randomUint32(options) / 4294967296;
}

export function randomInt(maxExclusive: number, options?: CryptoRandomOptions): number {
  const max = Math.floor(Number(maxExclusive) || 0);
  if (max <= 0) return 0;
  if (max >= 4294967296) return Math.floor(randomUnitFloat(options) * max);
  const range = 4294967296;
  const limit = range - (range % max);
  let value = randomUint32(options);
  while (value >= limit) value = randomUint32(options);
  return value % max;
}

export function randomSeed(options?: CryptoRandomOptions): number {
  const values = new Uint32Array(2);
  fillRandomValues(values, options);
  return ((values[0] & 0x1fffff) * 4294967296) + (values[1] >>> 0);
}

export function randomHex(byteCount: number, options?: CryptoRandomOptions): string {
  const count = Math.max(0, Math.floor(Number(byteCount) || 0));
  if (!count) return "";
  const bytes = new Uint8Array(count);
  fillRandomValues(bytes, options);
  let out = "";
  for (let index = 0; index < bytes.length; index += 1) {
    out += bytes[index].toString(16).padStart(2, "0");
  }
  return out;
}

export function randomBase36(length: number, options?: CryptoRandomOptions): string {
  const count = Math.max(0, Math.floor(Number(length) || 0));
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
  let out = "";
  for (let index = 0; index < count; index += 1) {
    out += alphabet.charAt(randomInt(alphabet.length, options));
  }
  return out;
}

export function randomId(prefix: string, lengthOrOptions: number | CryptoRandomOptions = 10): string {
  const safePrefix = prefix || "id";
  const options = isRecord(lengthOrOptions) ? lengthOrOptions : undefined;
  const length = options
    ? Math.max(4, Math.floor(Number(options.length) || 10))
    : Math.floor(Number(lengthOrOptions) || 10);
  return `${safePrefix}_${Date.now().toString(36)}_${randomBase36(length, options)}`;
}

export function createCryptoRandomRuntime(): CryptoRandomRuntime {
  return {
    fillRandomValues,
    randomUint32,
    randomUnitFloat,
    randomInt,
    randomSeed,
    randomHex,
    randomBase36,
    randomId
  };
}

export function installCryptoRandomRuntime(
  options: CryptoRandomRuntimeInstallOptions = {}
): CryptoRandomRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as CryptoRandomRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreCryptoRandomRuntime) {
    windowLike.CoreCryptoRandomRuntime = createCryptoRandomRuntime();
  }
  return windowLike.CoreCryptoRandomRuntime || null;
}
