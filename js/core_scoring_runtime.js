(function (global) {
  "use strict";

  if (!global) return;

  function computePostMoveScore(input) {
    var opts = input || {};
    var before = Number(opts.scoreBeforeMove);
    var afterMerge = Number(opts.scoreAfterMerge);
    var safeBefore = Number.isFinite(before) ? before : 0;
    var score = Number.isFinite(afterMerge) ? afterMerge : safeBefore;
    var comboStreak = Number.isInteger(opts.comboStreak) && opts.comboStreak >= 0
      ? Number(opts.comboStreak)
      : 0;
    var comboMultiplier = Number.isFinite(opts.comboMultiplier)
      ? Number(opts.comboMultiplier)
      : 1;

    var mergeGainRaw = score - safeBefore;
    var mergeGain = Number.isFinite(mergeGainRaw) ? mergeGainRaw : 0;
    var comboBonus = 0;

    if (mergeGain > 0) {
      comboStreak += 1;
      if (comboMultiplier > 1 && comboStreak > 1) {
        comboBonus = Math.floor(mergeGain * (comboMultiplier - 1) * (comboStreak - 1));
        if (comboBonus > 0) {
          score += comboBonus;
        } else {
          comboBonus = 0;
        }
      }
    } else {
      comboStreak = 0;
    }

    return {
      score: score,
      comboStreak: comboStreak,
      mergeGain: mergeGain,
      comboBonus: comboBonus
    };
  }

  global.CoreScoringRuntime = global.CoreScoringRuntime || {};
  global.CoreScoringRuntime.computePostMoveScore = computePostMoveScore;
})(typeof window !== "undefined" ? window : undefined);
