(function (global) {
  "use strict";

  if (!global) return;

  var TARGET_MODE_KEY = "capped_4x4_pow2_64_no_undo";
  var DEFAULT_TITLE = "64封顶模式简介";
  var DEFAULT_DESCRIPTION =
    "64封顶是短局冲刺模式。\n" +
    "目标是尽快合成 64，合成后本局结束并计入该模式榜单。\n" +
    "建议优先保持大数在角落，减少无效横跳，提升稳定性。";
  var DEFAULT_LEADERBOARD_TEXT = "榜单功能即将上线，这里将展示 64 封顶模式排行榜。";

  function resolvePlayChallengeIntroModel(options) {
    var opts = options || {};
    var modeKey = String(opts.modeKey || "");
    var enabled = !!opts.featureEnabled;
    var isTargetMode = modeKey === TARGET_MODE_KEY;
    if (!enabled || !isTargetMode) {
      return {
        entryDisplay: "none",
        modalDisplay: "none",
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
        leaderboardText: DEFAULT_LEADERBOARD_TEXT,
        bindEvents: false
      };
    }

    return {
      entryDisplay: "inline-flex",
      modalDisplay: "none",
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      leaderboardText: DEFAULT_LEADERBOARD_TEXT,
      bindEvents: true
    };
  }

  global.CorePlayChallengeIntroRuntime = global.CorePlayChallengeIntroRuntime || {};
  global.CorePlayChallengeIntroRuntime.resolvePlayChallengeIntroModel =
    resolvePlayChallengeIntroModel;
})(typeof window !== "undefined" ? window : undefined);
