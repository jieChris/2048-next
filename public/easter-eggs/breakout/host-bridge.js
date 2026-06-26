(function () {
  var MESSAGE_TYPE = "2048-next-breakout-easter-egg";

  function postToParent(action) {
    if (!window.parent || window.parent === window) return;
    try {
      window.parent.postMessage({ type: MESSAGE_TYPE, action: action }, window.location.origin);
    } catch (_err) {}
  }

  function closestElement(target, selector) {
    if (!target || typeof target.closest !== "function") return null;
    try {
      return target.closest(selector);
    } catch (_err) {
      return null;
    }
  }

  document.addEventListener(
    "click",
    function (event) {
      var target = event.target;
      var windowButton = closestElement(target, ".breakout-window-btn");
      if (windowButton) {
        window.setTimeout(function () {
          if (windowButton.classList && windowButton.classList.contains("close")) {
            postToParent("close");
            return;
          }
          postToParent("minimize");
        }, 0);
      }
    },
    true
  );

  window.addEventListener("message", function (event) {
    var data = event && event.data;
    if (!data || data.type !== MESSAGE_TYPE || data.action !== "restore") return;
    var minimizedButton = document.querySelector(".minimized-game");
    if (minimizedButton && typeof minimizedButton.click === "function") {
      minimizedButton.click();
    }
  });
})();
