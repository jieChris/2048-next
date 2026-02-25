export interface PostUndoRecordInput {
  replayMode: boolean;
  direction: number;
  hasSessionReplayV3: boolean;
}

export interface PostUndoRecordResult {
  shouldRecordMoveHistory: boolean;
  shouldAppendCompactUndo: boolean;
  shouldPushSessionAction: boolean;
  sessionAction: [string] | null;
}

export function computePostUndoRecord(input: PostUndoRecordInput): PostUndoRecordResult {
  if (input.replayMode) {
    return {
      shouldRecordMoveHistory: false,
      shouldAppendCompactUndo: false,
      shouldPushSessionAction: false,
      sessionAction: null
    };
  }

  const shouldPushSessionAction = !!input.hasSessionReplayV3;
  return {
    shouldRecordMoveHistory: true,
    shouldAppendCompactUndo: true,
    shouldPushSessionAction,
    sessionAction: shouldPushSessionAction ? ["u"] : null
  };
}
