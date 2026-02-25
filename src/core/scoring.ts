export interface PostMoveScoreInput {
  scoreBeforeMove: number;
  scoreAfterMerge: number;
  comboStreak: number;
  comboMultiplier: number;
}

export interface PostMoveScoreResult {
  score: number;
  comboStreak: number;
  mergeGain: number;
  comboBonus: number;
}

export function computePostMoveScore(input: PostMoveScoreInput): PostMoveScoreResult {
  const before = Number(input.scoreBeforeMove);
  const afterMerge = Number(input.scoreAfterMerge);
  const safeBefore = Number.isFinite(before) ? before : 0;
  let score = Number.isFinite(afterMerge) ? afterMerge : safeBefore;
  let comboStreak =
    Number.isInteger(input.comboStreak) && Number(input.comboStreak) >= 0
      ? Number(input.comboStreak)
      : 0;
  const comboMultiplier = Number.isFinite(input.comboMultiplier)
    ? Number(input.comboMultiplier)
    : 1;

  const mergeGainRaw = score - safeBefore;
  const mergeGain = Number.isFinite(mergeGainRaw) ? mergeGainRaw : 0;
  let comboBonus = 0;

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
    score,
    comboStreak,
    mergeGain,
    comboBonus
  };
}
