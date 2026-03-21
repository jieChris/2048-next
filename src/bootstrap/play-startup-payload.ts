import type { SessionInitPayload } from "../contracts";

export interface PlayStartupPayloadModeConfigLike {
  key?: unknown;
}

export interface ResolvePlayStartupPayloadOptions {
  modeConfig?: PlayStartupPayloadModeConfigLike | null | undefined;
  inputManagerCtor?: unknown;
  defaultBoardWidth?: number | null | undefined;
}

export type PlayStartupPayload = SessionInitPayload;

export function resolvePlayStartupPayload(
  options: ResolvePlayStartupPayloadOptions
): PlayStartupPayload | null {
  const opts = options || {};
  const modeConfig = opts.modeConfig || null;
  if (!modeConfig) return null;

  const rawWidth = opts.defaultBoardWidth;
  const boardWidth =
    typeof rawWidth === "number" && Number.isFinite(rawWidth) ? rawWidth : 4;

  return {
    modeKey: modeConfig.key,
    modeConfig,
    inputManagerCtor: opts.inputManagerCtor,
    defaultBoardWidth: boardWidth
  };
}
