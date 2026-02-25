export interface HomeStartupHostBodyLike {
  getAttribute?: ((name: string) => string | null) | null | undefined;
}

export interface HomeStartupHostDocumentLike {
  body?: HomeStartupHostBodyLike | null | undefined;
}

export interface HomeStartupHostWindowLike {
  location?: unknown;
  ModeCatalog?: unknown;
  GAME_MODE_CONFIG?: unknown;
}

export interface HomeStartupSelectionLike {
  modeKey?: string | null | undefined;
  modeConfig?: unknown;
}

export interface ResolveHomeStartupFromContextOptions {
  windowLike?: HomeStartupHostWindowLike | null | undefined;
  documentLike?: HomeStartupHostDocumentLike | null | undefined;
  defaultModeKey?: string | null | undefined;
  defaultBoardWidth?: number | null | undefined;
  inputManagerCtor: unknown;
  resolveHomeModeSelectionFromContext: (options: {
    bodyLike?: HomeStartupHostBodyLike | null | undefined;
    locationLike?: unknown;
    defaultModeKey: string;
    modeCatalog?: unknown;
  }) => HomeStartupSelectionLike | null | undefined;
}

export interface HomeStartupPayload {
  modeKey: string;
  modeConfig: unknown;
  inputManagerCtor: unknown;
  defaultBoardWidth: number;
}

const DEFAULT_HOME_MODE_KEY = "standard_4x4_pow2_no_undo";
const DEFAULT_BOARD_WIDTH = 4;

export function resolveHomeStartupFromContext(
  options: ResolveHomeStartupFromContextOptions
): HomeStartupPayload {
  const opts = options;
  const windowLike = opts.windowLike || null;
  const documentLike = opts.documentLike || null;
  const defaultModeKey = String(opts.defaultModeKey || DEFAULT_HOME_MODE_KEY);
  const defaultBoardWidth = Number(opts.defaultBoardWidth || DEFAULT_BOARD_WIDTH);

  const selection =
    opts.resolveHomeModeSelectionFromContext({
      bodyLike: documentLike ? documentLike.body || null : null,
      locationLike: windowLike ? windowLike.location : null,
      defaultModeKey,
      modeCatalog: windowLike ? windowLike.ModeCatalog : undefined
    }) || {};

  const modeKey = String(selection.modeKey || defaultModeKey);
  const modeConfig = Object.prototype.hasOwnProperty.call(selection, "modeConfig")
    ? selection.modeConfig
    : null;

  if (windowLike) {
    windowLike.GAME_MODE_CONFIG = modeConfig;
  }

  return {
    modeKey,
    modeConfig,
    inputManagerCtor: opts.inputManagerCtor,
    defaultBoardWidth
  };
}
