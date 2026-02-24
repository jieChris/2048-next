(function (global) {
  "use strict";

  if (!global) return;

  function isHomePagePath(pathname) {
    var path = typeof pathname === "string" ? pathname : "";
    return path === "/" || /\/index\.html?$/.test(path) || path === "";
  }

  function shouldAutoStartHomeGuide(options) {
    var opts = options || {};
    if (!isHomePagePath(opts.pathname)) return false;
    return String(opts.seenValue || "0") !== "1";
  }

  global.CoreHomeGuideRuntime = global.CoreHomeGuideRuntime || {};
  global.CoreHomeGuideRuntime.isHomePagePath = isHomePagePath;
  global.CoreHomeGuideRuntime.shouldAutoStartHomeGuide = shouldAutoStartHomeGuide;
})(typeof window !== "undefined" ? window : undefined);
