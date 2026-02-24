(function (global) {
  "use strict";

  if (!global) return;

  var DEFAULT_RESTART_ANCHOR_TEXT = "mobile-restart-anchor";
  var DEFAULT_TIMER_ANCHOR_TEXT = "mobile-timer-toggle-anchor";
  var DEFAULT_PRACTICE_RESTART_ANCHOR_TEXT = "practice-restart-anchor";

  function asNode(value) {
    if (!value || typeof value !== "object") return null;
    return value;
  }

  function asParent(value) {
    if (!value || typeof value !== "object") return null;
    return value;
  }

  function hasInsertBefore(parent) {
    var obj = asParent(parent);
    return !!obj && typeof obj.insertBefore === "function";
  }

  function hasAppendChild(parent) {
    var obj = asParent(parent);
    return !!obj && typeof obj.appendChild === "function";
  }

  function insertBefore(parent, node, referenceNode) {
    if (!hasInsertBefore(parent)) return false;
    try {
      parent.insertBefore(node, referenceNode);
      return true;
    } catch (_err) {
      return false;
    }
  }

  function appendChild(parent, node) {
    if (!hasAppendChild(parent)) return false;
    try {
      parent.appendChild(node);
      return true;
    } catch (_err) {
      return false;
    }
  }

  function restoreNodeAfterAnchor(node, anchor) {
    var anchorNode = asNode(anchor);
    if (!asNode(node) || !anchorNode || !anchorNode.parentNode) return false;
    return insertBefore(anchorNode.parentNode, node, anchor.nextSibling || null);
  }

  function resolveAnchorText(value, fallback) {
    return typeof value === "string" && value ? value : fallback;
  }

  function createGameTopActionsPlacementState(options) {
    var opts = options || {};
    if (!opts.enabled) return null;
    if (typeof opts.createComment !== "function") return null;

    var topActionButtons = opts.topActionButtons || null;
    var restartBtn = opts.restartBtn || null;
    var timerToggleBtn = opts.timerToggleBtn || null;
    var restartNode = asNode(restartBtn);
    var timerNode = asNode(timerToggleBtn);
    if (!topActionButtons || !restartNode || !timerNode) return null;
    if (!restartNode.parentNode || !timerNode.parentNode) return null;

    var restartAnchor = opts.createComment(
      resolveAnchorText(opts.restartAnchorText, DEFAULT_RESTART_ANCHOR_TEXT)
    );
    var timerToggleAnchor = opts.createComment(
      resolveAnchorText(opts.timerToggleAnchorText, DEFAULT_TIMER_ANCHOR_TEXT)
    );

    if (!insertBefore(restartNode.parentNode, restartAnchor, restartBtn)) return null;
    if (!insertBefore(timerNode.parentNode, timerToggleAnchor, timerToggleBtn)) return null;

    return {
      topActionButtons: topActionButtons,
      restartBtn: restartBtn,
      timerToggleBtn: timerToggleBtn,
      restartAnchor: restartAnchor,
      timerToggleAnchor: timerToggleAnchor
    };
  }

  function createPracticeTopActionsPlacementState(options) {
    var opts = options || {};
    if (!opts.enabled) return null;
    if (typeof opts.createComment !== "function") return null;

    var topActionButtons = opts.topActionButtons || null;
    var restartBtn = opts.restartBtn || null;
    var restartNode = asNode(restartBtn);
    if (!topActionButtons || !restartNode || !restartNode.parentNode) return null;

    var restartAnchor = opts.createComment(
      resolveAnchorText(opts.restartAnchorText, DEFAULT_PRACTICE_RESTART_ANCHOR_TEXT)
    );
    if (!insertBefore(restartNode.parentNode, restartAnchor, restartBtn)) return null;

    return {
      topActionButtons: topActionButtons,
      restartBtn: restartBtn,
      restartAnchor: restartAnchor
    };
  }

  function syncGameTopActionsPlacement(options) {
    var opts = options || {};
    var state = opts.state || null;
    if (!state) return false;

    var compact = !!opts.compactViewport;
    if (compact) {
      appendChild(state.topActionButtons, state.restartBtn);
      appendChild(state.topActionButtons, state.timerToggleBtn);
      return true;
    }

    restoreNodeAfterAnchor(state.restartBtn, state.restartAnchor);
    restoreNodeAfterAnchor(state.timerToggleBtn, state.timerToggleAnchor);
    return true;
  }

  function syncPracticeTopActionsPlacement(options) {
    var opts = options || {};
    var state = opts.state || null;
    if (!state) return false;

    var compact = !!opts.compactViewport;
    if (compact) {
      appendChild(state.topActionButtons, state.restartBtn);
      return true;
    }

    restoreNodeAfterAnchor(state.restartBtn, state.restartAnchor);
    return true;
  }

  global.CoreTopActionsRuntime = global.CoreTopActionsRuntime || {};
  global.CoreTopActionsRuntime.createGameTopActionsPlacementState =
    createGameTopActionsPlacementState;
  global.CoreTopActionsRuntime.createPracticeTopActionsPlacementState =
    createPracticeTopActionsPlacementState;
  global.CoreTopActionsRuntime.syncGameTopActionsPlacement =
    syncGameTopActionsPlacement;
  global.CoreTopActionsRuntime.syncPracticeTopActionsPlacement =
    syncPracticeTopActionsPlacement;
})(typeof window !== "undefined" ? window : undefined);
