(function () {
  "use strict";

  var SMOKE_BYPASS_KEY = "2048_beta_access_smoke_bypass_v1";
  function isLocalSmokeHost() {
    var hostname = String(window.location && window.location.hostname || "").toLowerCase();
    return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1" || hostname === "[::1]";
  }

  function shouldBypassForSmoke() {
    if (!isLocalSmokeHost()) return false;
    try {
      return window.localStorage && window.localStorage.getItem(SMOKE_BYPASS_KEY) === "1";
    } catch (_err) {
      return false;
    }
  }

  var path = String(window.location && window.location.pathname || "").split("/").pop();
  var exempt = {
    "beta-login.html": true,
    "beta-access.html": true,
    "admin.html": true,
    "cache-reset.html": true
  };
  if (exempt[path] || shouldBypassForSmoke()) return;

  document.documentElement.setAttribute("data-beta-access-pending", "1");
  document.documentElement.setAttribute("hidden", "");
})();
