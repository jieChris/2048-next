/**
 * api_shared_utils.js
 *
 * Shared utility functions used by account_page.js,
 * online_leaderboard_runtime.js, and user_profile_page.js.
 *
 * Exposes: window.ApiSharedUtils
 */
(function (global) {
  "use strict";

  if (!global) return;

  /* ---------- tiny helpers ---------- */

  function toText(value) {
    return value == null ? "" : String(value);
  }

  /* ---------- safe localStorage wrappers ---------- */

  function safeGetStorage(key) {
    try {
      return global.localStorage ? global.localStorage.getItem(key) : null;
    } catch (_err) {
      return null;
    }
  }

  function safeSetStorage(key, value) {
    try {
      if (!global.localStorage) return;
      global.localStorage.setItem(key, value);
    } catch (_err) {}
  }

  function safeRemoveStorage(key) {
    try {
      if (!global.localStorage) return;
      global.localStorage.removeItem(key);
    } catch (_err) {}
  }

  /* ---------- API base URL resolution ---------- */

  function buildApiBaseCandidates() {
    var bases = [];

    function push(base) {
      var normalized = toText(base).trim().replace(/\/+$/, "");
      if (!normalized) return;
      if (bases.indexOf(normalized) >= 0) return;
      bases.push(normalized);
    }

    var explicit = toText(global.GAME_API_BASE_URL).trim();
    if (explicit) push(explicit);

    var locationObj = global.location || {};
    var hostname = toText(locationObj.hostname).toLowerCase();
    var origin = toText(locationObj.origin);
    var allowCrossOriginFallback = toText(global.GAME_API_ALLOW_CROSS_ORIGIN_FALLBACK).toLowerCase() === "true";

    if (origin) push(origin + "/api");

    if (hostname === "taihe.fun" || hostname === "www.taihe.fun" || allowCrossOriginFallback) {
      push("https://taihe.fun/api");
    }

    if (bases.length === 0) push("https://taihe.fun/api");
    return bases;
  }

  /* ---------- API timeout ---------- */

  /**
   * Resolve the API request timeout in milliseconds.
   * Falls back to the provided defaultMs (or 12000) when not configured.
   */
  function resolveApiTimeoutMs(defaultMs) {
    var raw = Number(global.GAME_API_REQUEST_TIMEOUT_MS);
    if (Number.isFinite(raw) && raw > 0) return Math.floor(raw);
    var fallback = Number(defaultMs);
    return (Number.isFinite(fallback) && fallback > 0) ? Math.floor(fallback) : 12000;
  }

  /* ---------- public namespace ---------- */

  global.ApiSharedUtils = {
    toText: toText,
    safeGetStorage: safeGetStorage,
    safeSetStorage: safeSetStorage,
    safeRemoveStorage: safeRemoveStorage,
    buildApiBaseCandidates: buildApiBaseCandidates,
    resolveApiTimeoutMs: resolveApiTimeoutMs
  };

})(typeof window !== "undefined" ? window : undefined);
