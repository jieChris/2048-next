interface BodyLike {
  getAttribute?(name: string): string | null;
}

interface WindowLike {
  GAME_MODE_CONFIG?: {
    key?: string | null | undefined;
  } | null;
}

export interface TimerScrollModeState {
  modeId: string;
  modeConfigKey: string;
  enabled: boolean;
}

export function isTimerScrollModeKey(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const text = value.trim().toLowerCase();
  if (!text) return false;
  return text.indexOf("capped") !== -1 || text.indexOf("practice") !== -1;
}

export function resolveTimerScrollModeFromContext(options: {
  bodyLike?: BodyLike | null | undefined;
  windowLike?: WindowLike | null | undefined;
}): TimerScrollModeState {
  const opts = options || {};
  const body = opts.bodyLike || null;
  const windowLike = opts.windowLike || null;

  let modeId = "";
  if (body && typeof body.getAttribute === "function") {
    try {
      const value = body.getAttribute("data-mode-id");
      modeId = typeof value === "string" ? value.trim() : "";
    } catch (_err) {
      modeId = "";
    }
  }

  let modeConfigKey = "";
  try {
    const value = windowLike?.GAME_MODE_CONFIG?.key;
    modeConfigKey = typeof value === "string" ? value.trim() : "";
  } catch (_err) {
    modeConfigKey = "";
  }

  return {
    modeId,
    modeConfigKey,
    enabled: isTimerScrollModeKey(modeId) || isTimerScrollModeKey(modeConfigKey)
  };
}
