var clientRecordIdFallbackCounter = 0;

function resolveClientRecordIdCrypto() {
  try {
    if (typeof globalThis !== "undefined" && globalThis && globalThis.crypto) {
      return globalThis.crypto;
    }
  } catch (_err) {}
  return null;
}
function buildClientRecordIdRandomSuffix() {
  if (
    typeof CoreCryptoRandomRuntime !== "undefined" &&
    CoreCryptoRandomRuntime &&
    typeof CoreCryptoRandomRuntime.randomHex === "function"
  ) {
    return CoreCryptoRandomRuntime.randomHex(12);
  }
  var cryptoLike = resolveClientRecordIdCrypto();
  if (cryptoLike && typeof cryptoLike.getRandomValues === "function" && typeof Uint8Array !== "undefined") {
    try {
      var bytes = new Uint8Array(12);
      cryptoLike.getRandomValues(bytes);
      var hex = "";
      for (var byteIndex = 0; byteIndex < bytes.length; byteIndex++) {
        hex += bytes[byteIndex].toString(16).padStart(2, "0");
      }
      if (hex) return hex;
    } catch (_errRandom) {}
  }
  clientRecordIdFallbackCounter = (clientRecordIdFallbackCounter + 1) >>> 0;
  return Date.now().toString(36) + clientRecordIdFallbackCounter.toString(36).padStart(6, "0");
}
function createManagerClientRecordId() {
  var cryptoLike = resolveClientRecordIdCrypto();
  if (cryptoLike && typeof cryptoLike.randomUUID === "function") {
    try {
      return "rec_" + String(cryptoLike.randomUUID()).replace(/-/g, "");
    } catch (_errUuid) {}
  }
  return "rec_" + Date.now().toString(36) + "_" + buildClientRecordIdRandomSuffix();
}
function assignManagerClientRecordId(manager, nextId) {
  if (!manager) return "";
  var normalized = typeof nextId === "string" ? nextId.trim() : "";
  if (!normalized) normalized = createManagerClientRecordId();
  manager.clientRecordId = normalized;
  return normalized;
}
function resolveManagerClientRecordId(manager) {
  if (!manager) return "";
  var current = typeof manager.clientRecordId === "string" ? manager.clientRecordId.trim() : "";
  if (current) return current;
  return assignManagerClientRecordId(manager, "");
}
