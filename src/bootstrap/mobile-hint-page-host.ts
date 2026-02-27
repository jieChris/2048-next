type AnyRecord = Record<string, unknown>;

type EnsureModalResolver = (input: unknown) => unknown;
type ApplyOpenResolver = (input: unknown) => unknown;
type ApplyUiSyncResolver = (input: unknown) => unknown;
type ApplyInitResolver = (input: unknown) => unknown;

export interface MobileHintPageResolverOptions {
  mobileHintModalRuntime?: unknown;
  mobileHintOpenHostRuntime?: unknown;
  mobileHintUiHostRuntime?: unknown;
  mobileHintHostRuntime?: unknown;
  mobileHintRuntime?: unknown;
  mobileHintUiRuntime?: unknown;
  documentLike?: unknown;
  ensureMobileHintToggleButton?: unknown;
  isGamePageScope?: (() => boolean) | null;
  isCompactGameViewport?: (() => boolean) | null;
  overlayId?: unknown;
  defaultText?: unknown;
  collapsedClassName?: unknown;
  introHiddenClassName?: unknown;
  introSelector?: unknown;
  containerSelector?: unknown;
}

export interface MobileHintPageResolvers {
  ensureMobileHintModalDom: () => unknown;
  openMobileHintModal: () => unknown;
  closeMobileHintModal: () => void;
  syncMobileHintUI: (options?: unknown) => unknown;
  initMobileHintToggle: () => unknown;
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

function resolveString(value: unknown, fallback: string): string {
  return typeof value === "string" && value ? value : fallback;
}

export function createMobileHintPageResolvers(
  input: MobileHintPageResolverOptions
): MobileHintPageResolvers {
  const source = toRecord(input);
  const documentLike = source.documentLike || null;
  const overlayId = resolveString(source.overlayId, "mobile-hint-overlay");
  const defaultText = resolveString(source.defaultText, "合并数字，合成 2048 方块。");
  const collapsedClassName = resolveString(
    source.collapsedClassName,
    "mobile-hint-collapsed-content"
  );
  const introHiddenClassName = resolveString(source.introHiddenClassName, "mobile-hint-hidden");
  const introSelector = resolveString(source.introSelector, ".above-game .game-intro");
  const containerSelector = resolveString(source.containerSelector, ".container");

  function ensureMobileHintModalDom(): unknown {
    const modalRuntime = toRecord(source.mobileHintModalRuntime);
    const ensureModal = asFunction<EnsureModalResolver>(modalRuntime.ensureMobileHintModalDom);
    if (!ensureModal) return null;
    const isGamePageScope = asFunction<() => boolean>(source.isGamePageScope);
    return ensureModal({
      isGamePageScope: isGamePageScope ? !!isGamePageScope() : false,
      documentLike
    });
  }

  function openMobileHintModal(): unknown {
    const openHostRuntime = toRecord(source.mobileHintOpenHostRuntime);
    const applyOpen = asFunction<ApplyOpenResolver>(openHostRuntime.applyMobileHintModalOpen);
    if (!applyOpen) return null;
    return applyOpen({
      isGamePageScope: source.isGamePageScope,
      isCompactGameViewport: source.isCompactGameViewport,
      ensureMobileHintModalDom,
      mobileHintRuntime: source.mobileHintRuntime,
      documentLike,
      defaultText
    });
  }

  function closeMobileHintModal(): void {
    const getElementById = asFunction<(id: string) => unknown>(toRecord(documentLike).getElementById);
    if (!getElementById) return;
    let overlay: unknown = null;
    try {
      overlay = getElementById.call(documentLike, overlayId);
    } catch (_err) {
      overlay = null;
    }
    const style = toRecord(toRecord(overlay).style);
    if (!style) return;
    style.display = "none";
  }

  function syncMobileHintUI(options?: unknown): unknown {
    const uiHostRuntime = toRecord(source.mobileHintUiHostRuntime);
    const applyUiSync = asFunction<ApplyUiSyncResolver>(uiHostRuntime.applyMobileHintUiSync);
    if (!applyUiSync) return null;
    return applyUiSync({
      options: options || {},
      isGamePageScope: source.isGamePageScope,
      isCompactGameViewport: source.isCompactGameViewport,
      ensureMobileHintToggleButton: source.ensureMobileHintToggleButton,
      closeMobileHintModal,
      mobileHintUiRuntime: source.mobileHintUiRuntime,
      documentLike,
      collapsedClassName,
      introHiddenClassName,
      introSelector,
      containerSelector
    });
  }

  function initMobileHintToggle(): unknown {
    const hintHostRuntime = toRecord(source.mobileHintHostRuntime);
    const applyInit = asFunction<ApplyInitResolver>(hintHostRuntime.applyMobileHintToggleInit);
    if (!applyInit) return null;
    return applyInit({
      isGamePageScope: source.isGamePageScope,
      ensureMobileHintToggleButton: source.ensureMobileHintToggleButton,
      openMobileHintModal,
      syncMobileHintUI
    });
  }

  return {
    ensureMobileHintModalDom,
    openMobileHintModal,
    closeMobileHintModal,
    syncMobileHintUI,
    initMobileHintToggle
  };
}
