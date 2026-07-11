(function () {
  "use strict";

  var LOCAL_FORCE_GATE_KEY = "2048_beta_access_force_gate_local_v1";
  var AUTH_TOKEN_KEY = "2048_auth_token_v1";
  var GATE_PAGE_VERSION = "20260627-02";

  function isLocalDevelopmentHost() {
    var hostname = String(window.location && window.location.hostname || "").toLowerCase();
    return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1" || hostname === "[::1]";
  }

  function shouldBypassForLocalDevelopment() {
    if (!isLocalDevelopmentHost()) return false;
    try {
      return !window.localStorage || window.localStorage.getItem(LOCAL_FORCE_GATE_KEY) !== "1";
    } catch (_err) {
      return true;
    }
  }

  var path = String(window.location && window.location.pathname || "").split("/").pop();
  var exempt = {
    "beta-login.html": true,
    "beta-access.html": true,
    "admin.html": true,
    "cache-reset.html": true
  };
  if (exempt[path] || shouldBypassForLocalDevelopment()) return;

  // Mark the document so the async access gate knows this page is beta-gated.
  // Unlike earlier revisions, the page is NOT hidden while the /access/me check
  // is in flight: the static board paints immediately and the gate only
  // masks/redirects on a definitive denial. This removes the gate from the
  // first-paint critical path (and any chance of a permanent white screen).
  document.documentElement.setAttribute("data-beta-access-pending", "1");

  // Fast path: a visitor without any stored auth token can never pass the beta
  // gate, so bounce to the login page right here (from <head>) instead of
  // letting the browser download the full game runtime first. The URL must
  // match access-gate.ts buildGateHref() exactly (same param order/encoding).
  var token = null;
  try {
    token = window.localStorage && window.localStorage.getItem(AUTH_TOKEN_KEY);
  } catch (_err) {
    token = null; // Storage unavailable: the gate would bounce to login anyway.
  }
  if (token) return;
  if (typeof URLSearchParams !== "function") return; // Very old browser: defer to the async gate.
  try {
    var params = new URLSearchParams();
    params.set("gate_v", GATE_PAGE_VERSION);
    var next = String(window.location.pathname || "") + String(window.location.search || "") + String(window.location.hash || "");
    if (next) params.set("next", next);
    params.set("state", "login");
    window.location.replace("beta-login.html?" + params.toString());
  } catch (_err) {
    // Navigation failed; the async gate remains as the safety net.
  }
})();
