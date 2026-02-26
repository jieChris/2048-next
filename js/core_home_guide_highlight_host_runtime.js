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

  function resolveArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function removeClass(node, className) {
    var classList = toRecord(node).classList;
    var remove = asFunction(toRecord(classList).remove);
    if (!remove) return false;
    remove.call(classList, className);
    return true;
  }

  function addClass(node, className) {
    var classList = toRecord(node).classList;
    var add = asFunction(toRecord(classList).add);
    if (!add) return false;
    add.call(classList, className);
    return true;
  }

  function querySelectorAll(node, selector) {
    var query = asFunction(toRecord(node).querySelectorAll);
    if (!query) return [];
    var result = query.call(node, selector);
    if (Array.isArray(result)) return result;
    if (!result || typeof result.length !== "number") return [];
    var list = [];
    for (var i = 0; i < result.length; i++) {
      list.push(result[i]);
    }
    return list;
  }

  function applyHomeGuideHighlightClear(input) {
    var source = toRecord(input);
    var homeGuideState = toRecord(source.homeGuideState);

    var hadTarget = removeClass(homeGuideState.target, "home-guide-highlight");

    var scoped = querySelectorAll(source.documentLike, ".home-guide-scope");
    var clearedScopedCount = 0;
    for (var s = 0; s < scoped.length; s++) {
      if (removeClass(scoped[s], "home-guide-scope")) {
        clearedScopedCount += 1;
      }
    }

    var elevated = resolveArray(homeGuideState.elevated);
    var clearedElevatedCount = 0;
    for (var i = 0; i < elevated.length; i++) {
      if (removeClass(elevated[i], "home-guide-elevated")) {
        clearedElevatedCount += 1;
      }
    }

    homeGuideState.elevated = [];
    homeGuideState.target = null;

    return {
      clearedScopedCount: clearedScopedCount,
      clearedElevatedCount: clearedElevatedCount,
      hadTarget: hadTarget
    };
  }

  function applyHomeGuideTargetElevation(input) {
    var source = toRecord(input);
    var target = source.target;
    var closest = asFunction(toRecord(target).closest);
    var homeGuideRuntime = toRecord(source.homeGuideRuntime);
    var resolveHomeGuideElevationPlan = asFunction(homeGuideRuntime.resolveHomeGuideElevationPlan);
    if (!closest || !resolveHomeGuideElevationPlan) {
      return {
        didElevateHost: false,
        didScopeTopActions: false
      };
    }

    var elevated = [];
    var topActionButtons = closest.call(target, ".top-action-buttons");
    var headingHost = closest.call(target, ".heading");
    var elevationPlan = toRecord(
      resolveHomeGuideElevationPlan({
        hasTopActionButtonsAncestor: !!topActionButtons,
        hasHeadingAncestor: !!headingHost
      })
    );

    var stackHost = null;
    if (elevationPlan.hostSelector === ".top-action-buttons") {
      stackHost = topActionButtons;
    } else if (elevationPlan.hostSelector === ".heading") {
      stackHost = headingHost;
    }

    var didElevateHost = !!(stackHost && addClass(stackHost, "home-guide-elevated"));
    if (didElevateHost) {
      elevated.push(stackHost);
    }

    var didScopeTopActions = !!(
      elevationPlan.shouldScopeTopActions &&
      topActionButtons &&
      addClass(topActionButtons, "home-guide-scope")
    );

    var homeGuideState = toRecord(source.homeGuideState);
    homeGuideState.elevated = elevated;

    return {
      didElevateHost: didElevateHost,
      didScopeTopActions: didScopeTopActions
    };
  }

  global.CoreHomeGuideHighlightHostRuntime = global.CoreHomeGuideHighlightHostRuntime || {};
  global.CoreHomeGuideHighlightHostRuntime.applyHomeGuideHighlightClear = applyHomeGuideHighlightClear;
  global.CoreHomeGuideHighlightHostRuntime.applyHomeGuideTargetElevation = applyHomeGuideTargetElevation;
})(typeof window !== "undefined" ? window : undefined);
