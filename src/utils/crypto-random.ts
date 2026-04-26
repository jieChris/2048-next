let fallbackCounter = 0;

function resolveCryptoLike(): Crypto | null {
  if (typeof globalThis !== "undefined" && globalThis.crypto) return globalThis.crypto;
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

export function fillRandomValues<T extends ArrayBufferView>(values: T): T {
  const cryptoLike = resolveCryptoLike();
  if (cryptoLike && typeof cryptoLike.getRandomValues === "function") {
    try {
      return cryptoLike.getRandomValues(values);
    } catch (_err) {}
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

export function randomUint32(): number {
  const values = new Uint32Array(1);
  fillRandomValues(values);
  return values[0] >>> 0;
}

export function randomUnitFloat(): number {
  return randomUint32() / 4294967296;
}

export function randomInt(maxExclusive: number): number {
  const max = Math.floor(Number(maxExclusive) || 0);
  if (max <= 0) return 0;
  if (max >= 4294967296) return Math.floor(randomUnitFloat() * max);
  const range = 4294967296;
  const limit = range - (range % max);
  let value = randomUint32();
  while (value >= limit) value = randomUint32();
  return value % max;
}

export function randomBase36(length: number): string {
  const count = Math.max(0, Math.floor(Number(length) || 0));
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
  let out = "";
  for (let index = 0; index < count; index += 1) {
    out += alphabet.charAt(randomInt(alphabet.length));
  }
  return out;
}

export function randomId(prefix: string, length = 10): string {
  const safePrefix = prefix || "id";
  return `${safePrefix}_${Date.now().toString(36)}_${randomBase36(length)}`;
}
