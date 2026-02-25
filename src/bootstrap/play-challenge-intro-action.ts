export type PlayChallengeIntroActionType = "open" | "close" | "overlay-click";

export interface ResolvePlayChallengeIntroActionStateOptions {
  action?: PlayChallengeIntroActionType | string | null | undefined;
  eventTargetIsModal?: boolean | null | undefined;
}

export interface PlayChallengeIntroActionState {
  shouldPreventDefault: boolean;
  shouldApplyDisplay: boolean;
  nextModalDisplay: "flex" | "none";
}

export function resolvePlayChallengeIntroActionState(
  options: ResolvePlayChallengeIntroActionStateOptions
): PlayChallengeIntroActionState {
  const opts = options || {};
  const action = String(opts.action || "");

  if (action === "open") {
    return {
      shouldPreventDefault: true,
      shouldApplyDisplay: true,
      nextModalDisplay: "flex"
    };
  }

  if (action === "close") {
    return {
      shouldPreventDefault: true,
      shouldApplyDisplay: true,
      nextModalDisplay: "none"
    };
  }

  if (action === "overlay-click") {
    return {
      shouldPreventDefault: false,
      shouldApplyDisplay: !!opts.eventTargetIsModal,
      nextModalDisplay: "none"
    };
  }

  return {
    shouldPreventDefault: false,
    shouldApplyDisplay: false,
    nextModalDisplay: "none"
  };
}
