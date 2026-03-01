type AnyRecord = Record<string, unknown>;

type SelectorResolver = (value: string) => unknown;
type CommentResolver = (value: string) => unknown;
type ScopeResolver = () => boolean;
type ApplyResolver = (payload: unknown) => unknown;

export interface TopActionsPageResolverOptions {
  topActionsRuntime?: unknown;
  topActionsHostRuntime?: unknown;
  documentLike?: unknown;
  querySelector?: unknown;
  getElementById?: unknown;
  createComment?: unknown;
  isGamePageScope?: unknown;
  isPracticePageScope?: unknown;
  isCompactGameViewport?: unknown;
}

export interface TopActionsPageResolvers {
  syncMobileTopActionsPlacement: () => unknown;
  syncPracticeTopActionsPlacement: () => unknown;
}

function isRecord(value: unknown): value is AnyRecord {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): AnyRecord {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function resolveSelectorResolver(source: AnyRecord): SelectorResolver | null {
  const direct = asFunction<SelectorResolver>(source.querySelector);
  if (direct) return direct;
  const documentLike = source.documentLike || null;
  const querySelector = asFunction<SelectorResolver>(toRecord(documentLike).querySelector);
  if (!querySelector) return null;
  return function (selector: string): unknown {
    try {
      return querySelector.call(documentLike, selector);
    } catch (_err) {
      return null;
    }
  };
}

function resolveIdResolver(source: AnyRecord): SelectorResolver | null {
  const direct = asFunction<SelectorResolver>(source.getElementById);
  if (direct) return direct;
  const documentLike = source.documentLike || null;
  const getElementById = asFunction<SelectorResolver>(toRecord(documentLike).getElementById);
  if (!getElementById) return null;
  return function (id: string): unknown {
    try {
      return getElementById.call(documentLike, id);
    } catch (_err) {
      return null;
    }
  };
}

function resolveCommentResolver(source: AnyRecord): CommentResolver | null {
  const direct = asFunction<CommentResolver>(source.createComment);
  if (direct) return direct;
  const documentLike = source.documentLike || null;
  const createComment = asFunction<CommentResolver>(toRecord(documentLike).createComment);
  if (!createComment) return null;
  return function (text: string): unknown {
    try {
      return createComment.call(documentLike, text);
    } catch (_err) {
      return null;
    }
  };
}

export function createTopActionsPageResolvers(input: TopActionsPageResolverOptions): TopActionsPageResolvers {
  const source = toRecord(input);
  const querySelector = resolveSelectorResolver(source);
  const getElementById = resolveIdResolver(source);
  const createComment = resolveCommentResolver(source);
  const isCompactGameViewport = asFunction<ScopeResolver>(source.isCompactGameViewport);
  let mobileTopActionsState: unknown = null;
  let practiceTopActionsState: unknown = null;

  function syncMobileTopActionsPlacement(): unknown {
    const topActionsHostRuntime = toRecord(source.topActionsHostRuntime);
    const applyGameSync = asFunction<ApplyResolver>(topActionsHostRuntime.applyGameTopActionsPlacementSync);
    if (!applyGameSync) return null;
    const result = toRecord(
      applyGameSync({
        topActionsRuntime: source.topActionsRuntime,
        mobileTopActionsState,
        isGamePageScope: source.isGamePageScope,
        compactViewport: isCompactGameViewport ? !!isCompactGameViewport() : false,
        querySelector,
        getElementById,
        createComment
      })
    );
    if (Object.prototype.hasOwnProperty.call(result, "mobileTopActionsState")) {
      mobileTopActionsState = result.mobileTopActionsState;
    }
    return result;
  }

  function syncPracticeTopActionsPlacement(): unknown {
    const topActionsHostRuntime = toRecord(source.topActionsHostRuntime);
    const applyPracticeSync = asFunction<ApplyResolver>(
      topActionsHostRuntime.applyPracticeTopActionsPlacementSync
    );
    if (!applyPracticeSync) return null;
    const result = toRecord(
      applyPracticeSync({
        topActionsRuntime: source.topActionsRuntime,
        practiceTopActionsState,
        isPracticePageScope: source.isPracticePageScope,
        compactViewport: isCompactGameViewport ? !!isCompactGameViewport() : false,
        querySelector,
        getElementById,
        createComment
      })
    );
    if (Object.prototype.hasOwnProperty.call(result, "practiceTopActionsState")) {
      practiceTopActionsState = result.practiceTopActionsState;
    }
    return result;
  }

  return {
    syncMobileTopActionsPlacement,
    syncPracticeTopActionsPlacement
  };
}
