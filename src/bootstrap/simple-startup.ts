export interface ResolveSimpleStartupPayloadOptions {
  modeKey: string;
  fallbackModeKey: string;
  inputManagerCtor: unknown;
  defaultBoardWidth?: number | null | undefined;
  disableSessionSync?: boolean | null | undefined;
}

export interface SimpleStartupPayload {
  modeKey: string;
  fallbackModeKey: string;
  inputManagerCtor: unknown;
  defaultBoardWidth: number;
  disableSessionSync?: boolean;
}

const DEFAULT_BOARD_WIDTH = 4;

export function resolveSimpleStartupPayload(
  options: ResolveSimpleStartupPayloadOptions
): SimpleStartupPayload {
  const opts = options;
  const payload: SimpleStartupPayload = {
    modeKey: String(opts.modeKey || ""),
    fallbackModeKey: String(opts.fallbackModeKey || ""),
    inputManagerCtor: opts.inputManagerCtor,
    defaultBoardWidth: Number(opts.defaultBoardWidth || DEFAULT_BOARD_WIDTH)
  };

  if (opts.disableSessionSync) {
    payload.disableSessionSync = true;
  }

  return payload;
}
