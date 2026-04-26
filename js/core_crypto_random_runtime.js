(function (global) {
  "use strict";

  if (!global) return;

  var fallbackCounter = 0;

  function isRecord(value) {
    return !!(value && typeof value === "object");
  }

  function resolveCryptoLike() {
    try {
      if (global && global.crypto) return global.crypto;
      if (global && global.msCrypto) return global.msCrypto;
    } catch (_errWindowCrypto) {}
    try {
      if (typeof globalThis !== "undefined" && globalThis.crypto) return globalThis.crypto;
    } catch (_errGlobalCrypto) {}
    return null;
  }

  function resolvePerformanceNow() {
    try {
      var performanceLike = global && global.performance ? global.performance : null;
      if (performanceLike && typeof performanceLike.now === "function") {
        return Math.max(0, Math.floor(performanceLike.now() * 1000));
      }
    } catch (_errPerformance) {}
    return 0;
  }

  function nextFallbackUint32() {
    fallbackCounter = (fallbackCounter + 1) >>> 0;
    var now = Date.now() >>> 0;
    var perf = resolvePerformanceNow() >>> 0;
    var mixed = (now ^ Math.imul(perf || 1, 2654435761) ^ Math.imul(fallbackCounter, 2246822519)) >>> 0;
    mixed ^= mixed >>> 16;
    mixed = Math.imul(mixed, 0x7feb352d) >>> 0;
    mixed ^= mixed >>> 15;
    mixed = Math.imul(mixed, 0x846ca68b) >>> 0;
    mixed ^= mixed >>> 16;
    return mixed >>> 0;
  }

  function fillFallbackValues(values) {
    for (var i = 0; i < values.length; i++) {
      values[i] = nextFallbackUint32();
    }
    return values;
  }

  function fillRandomValues(values, options) {
    if (!values || typeof values.length !== "number") {
      throw new Error("crypto_random_invalid_buffer");
    }
    var cryptoLike = resolveCryptoLike();
    if (cryptoLike && typeof cryptoLike.getRandomValues === "function") {
      try {
        return cryptoLike.getRandomValues(values);
      } catch (_errRandomValues) {}
    }
    var opts = isRecord(options) ? options : {};
    if (opts.requireCrypto === true) {
      throw new Error("crypto_random_unavailable");
    }
    return fillFallbackValues(values);
  }

  function randomUint32(options) {
    var values = new Uint32Array(1);
    fillRandomValues(values, options);
    return values[0] >>> 0;
  }

  function randomUnitFloat(options) {
    return randomUint32(options) / 4294967296;
  }

  function randomInt(maxExclusive, options) {
    var max = Math.floor(Number(maxExclusive) || 0);
    if (max <= 0) return 0;
    if (max >= 4294967296) {
      return Math.floor(randomUnitFloat(options) * max);
    }
    var range = 4294967296;
    var limit = range - (range % max);
    var value = randomUint32(options);
    while (value >= limit) {
      value = randomUint32(options);
    }
    return value % max;
  }

  function randomSeed(options) {
    var values = new Uint32Array(2);
    fillRandomValues(values, options);
    return ((values[0] & 0x1fffff) * 4294967296) + (values[1] >>> 0);
  }

  function randomHex(byteCount, options) {
    var count = Math.max(0, Math.floor(Number(byteCount) || 0));
    if (!count) return "";
    var bytes = new Uint8Array(count);
    fillRandomValues(bytes, options);
    var out = "";
    for (var i = 0; i < bytes.length; i++) {
      out += bytes[i].toString(16).padStart(2, "0");
    }
    return out;
  }

  function randomBase36(length, options) {
    var count = Math.max(0, Math.floor(Number(length) || 0));
    var alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
    var out = "";
    for (var i = 0; i < count; i++) {
      out += alphabet.charAt(randomInt(alphabet.length, options));
    }
    return out;
  }

  function randomId(prefix, options) {
    var opts = isRecord(options) ? options : {};
    var safePrefix = typeof prefix === "string" && prefix ? prefix : "id";
    var length = Math.max(4, Math.floor(Number(opts.length) || 10));
    return safePrefix + "_" + Date.now().toString(36) + "_" + randomBase36(length, opts);
  }

  global.CoreCryptoRandomRuntime = global.CoreCryptoRandomRuntime || {};
  global.CoreCryptoRandomRuntime.fillRandomValues = fillRandomValues;
  global.CoreCryptoRandomRuntime.randomUint32 = randomUint32;
  global.CoreCryptoRandomRuntime.randomUnitFloat = randomUnitFloat;
  global.CoreCryptoRandomRuntime.randomInt = randomInt;
  global.CoreCryptoRandomRuntime.randomSeed = randomSeed;
  global.CoreCryptoRandomRuntime.randomHex = randomHex;
  global.CoreCryptoRandomRuntime.randomBase36 = randomBase36;
  global.CoreCryptoRandomRuntime.randomId = randomId;
})(typeof window !== "undefined" ? window : globalThis);
