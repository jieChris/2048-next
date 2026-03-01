(function (global) {
  "use strict";

  if (!global) return;

  function isRecord(value) {
    return !!value && typeof value === "object";
  }

  function toRecord(value) {
    return isRecord(value) ? value : {};
  }

  function asFunction(value) {
    return typeof value === "function" ? value : null;
  }

  function resolveSelectorResolver(source) {
    var direct = asFunction(source.querySelector);
    if (direct) return direct;
    var documentLike = source.documentLike || null;
    var querySelector = asFunction(toRecord(documentLike).querySelector);
    if (!querySelector) return null;
    return function (selector) {
      try {
        return querySelector.call(documentLike, selector);
      } catch (_err) {
        return null;
      }
    };
  }

  function resolveIdResolver(source) {
    var direct = asFunction(source.getElementById);
    if (direct) return direct;
    var documentLike = source.documentLike || null;
    var getElementById = asFunction(toRecord(documentLike).getElementById);
    if (!getElementById) return null;
    return function (id) {
      try {
        return getElementById.call(documentLike, id);
      } catch (_err) {
        return null;
      }
    };
  }

  function resolveCommentResolver(source) {
    var direct = asFunction(source.createComment);
    if (direct) return direct;
    var documentLike = source.documentLike || null;
    var createComment = asFunction(toRecord(documentLike).createComment);
    if (!createComment) return null;
    return function (text) {
      try {
        return createComment.call(documentLike, text);
      } catch (_err) {
        return null;
      }
    };
  }

  function createTopActionsPageResolvers(input) {
    var source = toRecord(input);
    var querySelector = resolveSelectorResolver(source);
    var getElementById = resolveIdResolver(source);
    var createComment = resolveCommentResolver(source);
    var isCompactGameViewport = asFunction(source.isCompactGameViewport);
    var mobileTopActionsState = null;
    var practiceTopActionsState = null;

    function syncMobileTopActionsPlacement() {
      var topActionsHostRuntime = toRecord(source.topActionsHostRuntime);
      var applyGameSync = asFunction(topActionsHostRuntime.applyGameTopActionsPlacementSync);
      if (!applyGameSync) return null;
      var result = toRecord(
        applyGameSync({
          topActionsRuntime: source.topActionsRuntime,
          mobileTopActionsState: mobileTopActionsState,
          isGamePageScope: source.isGamePageScope,
          compactViewport: isCompactGameViewport ? !!isCompactGameViewport() : false,
          querySelector: querySelector,
          getElementById: getElementById,
          createComment: createComment
        })
      );
      if (Object.prototype.hasOwnProperty.call(result, "mobileTopActionsState")) {
        mobileTopActionsState = result.mobileTopActionsState;
      }
      return result;
    }

    function syncPracticeTopActionsPlacement() {
      var topActionsHostRuntime = toRecord(source.topActionsHostRuntime);
      var applyPracticeSync = asFunction(topActionsHostRuntime.applyPracticeTopActionsPlacementSync);
      if (!applyPracticeSync) return null;
      var result = toRecord(
        applyPracticeSync({
          topActionsRuntime: source.topActionsRuntime,
          practiceTopActionsState: practiceTopActionsState,
          isPracticePageScope: source.isPracticePageScope,
          compactViewport: isCompactGameViewport ? !!isCompactGameViewport() : false,
          querySelector: querySelector,
          getElementById: getElementById,
          createComment: createComment
        })
      );
      if (Object.prototype.hasOwnProperty.call(result, "practiceTopActionsState")) {
        practiceTopActionsState = result.practiceTopActionsState;
      }
      return result;
    }

    return {
      syncMobileTopActionsPlacement: syncMobileTopActionsPlacement,
      syncPracticeTopActionsPlacement: syncPracticeTopActionsPlacement
    };
  }

  global.CoreTopActionsPageHostRuntime = global.CoreTopActionsPageHostRuntime || {};
  global.CoreTopActionsPageHostRuntime.createTopActionsPageResolvers = createTopActionsPageResolvers;
})(typeof window !== "undefined" ? window : undefined);
