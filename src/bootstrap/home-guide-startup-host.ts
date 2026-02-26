function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function resolveDelayMs(input: Record<string, unknown>): number {
  const value = Number(input.delayMs);
  if (Number.isFinite(value) && value >= 0) {
    return value;
  }
  return 260;
}

export interface HomeGuideStartupHostResult {
  shouldAutoStart: boolean;
  scheduled: boolean;
  delayMs: number;
}

export function applyHomeGuideAutoStart(input: {
  homeGuideRuntime?: unknown;
  locationLike?: unknown;
  storageLike?: unknown;
  seenKey?: unknown;
  startHomeGuide?: unknown;
  setTimeoutLike?: unknown;
  delayMs?: unknown;
}): HomeGuideStartupHostResult {
  const source = toRecord(input);
  const runtime = toRecord(source.homeGuideRuntime);
  const resolveHomeGuidePathname = asFunction<(payload: unknown) => unknown>(
    runtime.resolveHomeGuidePathname
  );
  const resolveHomeGuideAutoStart = asFunction<(payload: unknown) => unknown>(
    runtime.resolveHomeGuideAutoStart
  );
  const delayMs = resolveDelayMs(source);
  if (!resolveHomeGuidePathname || !resolveHomeGuideAutoStart) {
    return {
      shouldAutoStart: false,
      scheduled: false,
      delayMs
    };
  }

  const pathname = resolveHomeGuidePathname({
    locationLike: source.locationLike || null
  });
  const autoStartState = toRecord(
    resolveHomeGuideAutoStart({
      pathname,
      storageLike: source.storageLike || null,
      seenKey: source.seenKey
    })
  );
  if (!autoStartState.shouldAutoStart) {
    return {
      shouldAutoStart: false,
      scheduled: false,
      delayMs
    };
  }

  const startHomeGuide = asFunction<(payload: unknown) => unknown>(source.startHomeGuide);
  const setTimeoutLike = asFunction<(handler: () => unknown, ms: number) => unknown>(
    source.setTimeoutLike
  );
  if (!startHomeGuide || !setTimeoutLike) {
    return {
      shouldAutoStart: true,
      scheduled: false,
      delayMs
    };
  }

  setTimeoutLike(function () {
    startHomeGuide({ fromSettings: false });
  }, delayMs);
  return {
    shouldAutoStart: true,
    scheduled: true,
    delayMs
  };
}
