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

  function resolveScopeValue(value) {
    if (typeof value === "function") {
      return !!value();
    }
    return !!value;
  }

  function applyGameTopActionsPlacementSync(input) {
    var source = toRecord(input);
    var inScope = resolveScopeValue(source.isGamePageScope);
    var state = source.mobileTopActionsState || null;

    if (!inScope) {
      return {
        isScope: false,
        hasState: !!state,
        didCreateState: false,
        didSync: false,
        mobileTopActionsState: state
      };
    }

    var runtime = toRecord(source.topActionsRuntime);
    var createState = asFunction(runtime.createGameTopActionsPlacementState);
    var syncState = asFunction(runtime.syncGameTopActionsPlacement);
    var querySelector = asFunction(source.querySelector);
    var getElementById = asFunction(source.getElementById);
    var createComment = asFunction(source.createComment);

    var didCreateState = false;
    if (!state && createState && querySelector && getElementById && createComment) {
      state =
        createState({
          enabled: true,
          topActionButtons: querySelector(".top-action-buttons"),
          restartBtn: querySelector(".above-game .restart-button"),
          timerToggleBtn: getElementById("timerbox-toggle-btn"),
          createComment: createComment
        }) || null;
      didCreateState = !!state;
    }

    var didSync = false;
    if (state && syncState) {
      didSync = !!syncState({
        state: state,
        compactViewport: !!source.compactViewport
      });
    }

    return {
      isScope: true,
      hasState: !!state,
      didCreateState: didCreateState,
      didSync: didSync,
      mobileTopActionsState: state
    };
  }

  function applyPracticeTopActionsPlacementSync(input) {
    var source = toRecord(input);
    var inScope = resolveScopeValue(source.isPracticePageScope);
    var state = source.practiceTopActionsState || null;

    if (!inScope) {
      return {
        isScope: false,
        hasState: !!state,
        didCreateState: false,
        didSync: false,
        practiceTopActionsState: state
      };
    }

    var runtime = toRecord(source.topActionsRuntime);
    var createState = asFunction(runtime.createPracticeTopActionsPlacementState);
    var syncState = asFunction(runtime.syncPracticeTopActionsPlacement);
    var querySelector = asFunction(source.querySelector);
    var getElementById = asFunction(source.getElementById);
    var createComment = asFunction(source.createComment);

    var didCreateState = false;
    if (!state && createState && querySelector && getElementById && createComment) {
      state =
        createState({
          enabled: true,
          topActionButtons: getElementById("practice-stats-actions"),
          restartBtn: querySelector(".above-game .restart-button"),
          createComment: createComment
        }) || null;
      didCreateState = !!state;
    }

    var didSync = false;
    if (state && syncState) {
      didSync = !!syncState({
        state: state,
        compactViewport: !!source.compactViewport
      });
    }

    return {
      isScope: true,
      hasState: !!state,
      didCreateState: didCreateState,
      didSync: didSync,
      practiceTopActionsState: state
    };
  }

  global.CoreTopActionsHostRuntime = global.CoreTopActionsHostRuntime || {};
  global.CoreTopActionsHostRuntime.applyGameTopActionsPlacementSync =
    applyGameTopActionsPlacementSync;
  global.CoreTopActionsHostRuntime.applyPracticeTopActionsPlacementSync =
    applyPracticeTopActionsPlacementSync;
})(typeof window !== "undefined" ? window : undefined);
