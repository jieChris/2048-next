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

  function resolveLocalStorage() {
    try {
      return global && global["localStorage"] ? global["localStorage"] : null;
    } catch (_err) {
      return null;
    }
  }

  function safeGetStorage(key) {
    try {
      var storage = resolveLocalStorage();
      return storage ? storage.getItem(key) : null;
    } catch (_err) {
      return null;
    }
  }

  function safeSetStorage(key, value) {
    try {
      var storage = resolveLocalStorage();
      if (!storage) return false;
      storage.setItem(key, value);
      return true;
    } catch (_err) {
      return false;
    }
  }

  function safeRemoveStorage(key) {
    try {
      var storage = resolveLocalStorage();
      if (!storage) return;
      storage.removeItem(key);
    } catch (_err) {}
  }

  /* ---------- API base URL resolution ---------- */

  var DEFAULT_REMOTE_API_BASE_URL = "https://2048next.cn/api";

  function normalizeApiBase(base) {
    return toText(base).trim().replace(/\/+$/, "");
  }

  function isLocalDevelopmentHostname(hostname) {
    var host = toText(hostname).toLowerCase();
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.indexOf("127.") === 0
    );
  }

  function shouldUseRemoteApiFallback(hostname, allowCrossOriginFallback) {
    var host = toText(hostname).toLowerCase();
    if (allowCrossOriginFallback) return true;
    if (host === "2048next.cn" || host === "www.2048next.cn") return true;
    return !!host && !isLocalDevelopmentHostname(host);
  }

  function shouldUseSameOriginApi(hostname) {
    var host = toText(hostname).toLowerCase();
    return host !== "taihe.fun" && host !== "www.taihe.fun";
  }

  function buildApiBaseCandidates() {
    var bases = [];

    function push(base) {
      var normalized = normalizeApiBase(base);
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
    var remoteFallback = normalizeApiBase(global.GAME_API_FALLBACK_BASE_URL) || DEFAULT_REMOTE_API_BASE_URL;

    if (/^https?:\/\//i.test(origin) && shouldUseSameOriginApi(hostname)) push(origin + "/api");

    if (shouldUseRemoteApiFallback(hostname, allowCrossOriginFallback)) {
      push(remoteFallback);
    }

    if (bases.length === 0) push(remoteFallback);
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

  function callFetch(url, requestInit) {
    try {
      if (!global || typeof global["fetch"] !== "function") {
        return Promise.reject(new Error("fetch_unavailable"));
      }
      return global["fetch"](url, requestInit);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /* ---------- public namespace ---------- */

  global.ApiSharedUtils = {
    toText: toText,
    safeGetStorage: safeGetStorage,
    safeSetStorage: safeSetStorage,
    safeRemoveStorage: safeRemoveStorage,
    buildApiBaseCandidates: buildApiBaseCandidates,
    resolveApiTimeoutMs: resolveApiTimeoutMs,
    callFetch: callFetch
  };

})(typeof window !== "undefined" ? window : undefined);
