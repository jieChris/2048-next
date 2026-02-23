export interface MergeEffectsInput {
  mergedValue: number;
  isCappedMode: boolean;
  cappedTargetValue: number | null;
  reached32k: boolean;
}

export interface MergeEffectsResult {
  shouldRecordCappedMilestone: boolean;
  shouldSetWon: boolean;
  shouldSetReached32k: boolean;
  timerIdsToStamp: string[];
  showSubTimerContainer: boolean;
  hideTimerRows: number[];
}

export function computeMergeEffects(input: MergeEffectsInput): MergeEffectsResult {
  const value = Number(input.mergedValue);
  const cappedMode = !!input.isCappedMode;
  const cappedTarget = Number(input.cappedTargetValue);
  const hasCappedTarget = Number.isFinite(cappedTarget) && cappedTarget > 0;
  const reached32k = !!input.reached32k;

  const result: MergeEffectsResult = {
    shouldRecordCappedMilestone: false,
    shouldSetWon: false,
    shouldSetReached32k: false,
    timerIdsToStamp: [],
    showSubTimerContainer: false,
    hideTimerRows: []
  };

  if (!Number.isInteger(value) || value <= 0) return result;

  if (cappedMode && hasCappedTarget && value === cappedTarget) {
    result.shouldRecordCappedMilestone = true;
  } else if (!cappedMode && value === 2048) {
    result.shouldSetWon = true;
  }

  if (value === 8192) {
    result.timerIdsToStamp.push(reached32k ? "timer8192-sub" : "timer8192");
  }
  if (value === 16384) {
    result.timerIdsToStamp.push(reached32k ? "timer16384-sub" : "timer16384");
  }
  if (value === 32768) {
    result.shouldSetReached32k = true;
    result.timerIdsToStamp.push("timer32768");
    result.showSubTimerContainer = true;
    result.hideTimerRows = [16, 32];
  }

  return result;
}
