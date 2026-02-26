(function (global) {
  "use strict";

  if (!global) return;

  function formatPrettyTime(value) {
    var raw = Number(value);
    if (!Number.isFinite(raw) || raw < 0) {
      return "DNF";
    }

    var time = Math.floor(raw);
    var bits = time % 1000;
    time = (time - bits) / 1000;
    var secs = time % 60;
    var mins = ((time - secs) / 60) % 60;
    var hours = (time - secs - 60 * mins) / 3600;

    var text = String(bits);
    if (bits < 10) text = "0" + text;
    if (bits < 100) text = "0" + text;
    text = secs + "." + text;
    if (secs < 10 && (mins > 0 || hours > 0)) text = "0" + text;
    if (mins > 0 || hours > 0) text = mins + ":" + text;
    if (mins < 10 && hours > 0) text = "0" + text;
    if (hours > 0) text = hours + ":" + text;
    return text;
  }

  global.CorePrettyTimeRuntime = global.CorePrettyTimeRuntime || {};
  global.CorePrettyTimeRuntime.formatPrettyTime = formatPrettyTime;
})(typeof window !== "undefined" ? window : undefined);
