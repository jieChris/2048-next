import { randomUnitFloat } from "../utils/crypto-random";

export interface FlyingClickEffectElementLike {
  className?: string;
  classList?: {
    add?: (value: string) => unknown;
  } | null;
  parentNode?: FlyingClickEffectElementLike | null;
  style?: {
    setProperty?: (name: string, value: string) => unknown;
  } | null;
  textContent?: string | null;
  addEventListener?: (type: string, listener: (event?: unknown) => void) => unknown;
  removeEventListener?: (type: string, listener: (event?: unknown) => void) => unknown;
  appendChild?: (node: FlyingClickEffectElementLike) => unknown;
  removeChild?: (node: FlyingClickEffectElementLike) => unknown;
  querySelector?: (selector: string) => FlyingClickEffectElementLike | null;
  setAttribute?: (name: string, value: string) => unknown;
  getAttribute?: (name: string) => string | null;
}

export interface FlyingClickEffectDocumentLike {
  createElement?: (tagName: string) => FlyingClickEffectElementLike;
}

export interface FlyingClickEffectWindowLike {
  CoreFlyingClickEffectRuntime?: FlyingClickEffectRuntime;
  clearTimeout?: (timeoutId: unknown) => unknown;
  matchMedia?: (query: string) => { matches?: boolean } | null;
  setTimeout?: (listener: () => void, timeout?: number) => unknown;
}

export interface FlyingClickEffectOptions {
  cleanupTimeoutMs?: number | null | undefined;
  documentLike?: FlyingClickEffectDocumentLike | null | undefined;
  imageAlt?: string | null | undefined;
  imageBurst?: boolean | null | undefined;
  imageSrc?: string | null | undefined;
  layerClassName?: string | null | undefined;
  onComplete?: ((particle: FlyingClickEffectElementLike) => unknown) | null | undefined;
  particleClassName?: string | null | undefined;
  particleKind?: "tile" | "image" | null | undefined;
  random?: (() => number) | null | undefined;
  root?: FlyingClickEffectElementLike | null | undefined;
  rootClassName?: string | null | undefined;
  windowLike?: FlyingClickEffectWindowLike | null | undefined;
  xRangePx?: number | null | undefined;
}

export interface FlyingClickEffectBinding {
  destroy: () => void;
  trigger: () => FlyingClickEffectElementLike | null;
}

export interface FlyingClickEffectRuntime {
  bindFlyingClickEffect: typeof bindFlyingClickEffect;
  triggerFlyingClickEffect: typeof triggerFlyingClickEffect;
}

export interface FlyingClickEffectRuntimeInstallOptions {
  windowLike?: FlyingClickEffectWindowLike | null | undefined;
}

const DEFAULT_LAYER_CLASS_NAME = "flying-click-effect-layer";
const DEFAULT_PARTICLE_CLASS_NAME = "flying-click-effect-particle";
const DEFAULT_ROOT_CLASS_NAME = "flying-click-effect-root";
const DEFAULT_X_RANGE_PX = 40;
const DEFAULT_CLEANUP_TIMEOUT_MS = 1500;
const DEFAULT_IMAGE_ALT = "2048";
const DEFAULT_TILE_VALUES = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536];
const LAYER_SELECTOR = '[data-flying-click-effect-layer="1"]';
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const LOGO_POWDER_OFFSETS = [
  [-28, -20],
  [-18, -34],
  [-4, -42],
  [13, -35],
  [28, -22],
  [34, -4],
  [24, 15],
  [8, 28],
  [-10, 26],
  [-27, 12],
  [-35, -5],
  [1, -22]
];

function resolveDocumentLike(
  options: FlyingClickEffectOptions
): FlyingClickEffectDocumentLike | null {
  if (options.documentLike) return options.documentLike;
  return typeof document === "undefined" ? null : document;
}

function resolveWindowLike(options: FlyingClickEffectOptions): FlyingClickEffectWindowLike | null {
  if (options.windowLike) return options.windowLike;
  return typeof window === "undefined" ? null : (window as unknown as FlyingClickEffectWindowLike);
}

function resolveText(value: string | null | undefined, fallback: string): string {
  return typeof value === "string" && value ? value : fallback;
}

function resolvePositiveNumber(value: number | null | undefined, fallback: number): number {
  return Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : fallback;
}

function addClass(node: FlyingClickEffectElementLike | null | undefined, className: string): void {
  if (!node || !className) return;
  try {
    if (node.classList && typeof node.classList.add === "function") {
      node.classList.add(className);
      return;
    }
  } catch (_err) {}
  const current = typeof node.className === "string" ? node.className.trim() : "";
  const padded = " " + current + " ";
  if (padded.indexOf(" " + className + " ") >= 0) return;
  node.className = current ? current + " " + className : className;
}

function setAttribute(
  node: FlyingClickEffectElementLike | null | undefined,
  name: string,
  value: string
): void {
  if (!node || typeof node.setAttribute !== "function") return;
  try {
    node.setAttribute(name, value);
  } catch (_err) {}
}

function appendChild(
  parent: FlyingClickEffectElementLike | null | undefined,
  child: FlyingClickEffectElementLike
): boolean {
  if (!parent || typeof parent.appendChild !== "function") return false;
  try {
    parent.appendChild(child);
    return true;
  } catch (_err) {
    return false;
  }
}

function removeNode(node: FlyingClickEffectElementLike | null | undefined): void {
  const parent = node && node.parentNode;
  if (!parent || typeof parent.removeChild !== "function" || !node) return;
  try {
    parent.removeChild(node);
  } catch (_err) {}
}

function queryExistingLayer(root: FlyingClickEffectElementLike): FlyingClickEffectElementLike | null {
  if (typeof root.querySelector !== "function") return null;
  try {
    return root.querySelector(LAYER_SELECTOR);
  } catch (_err) {
    return null;
  }
}

function createLayer(
  root: FlyingClickEffectElementLike,
  documentLike: FlyingClickEffectDocumentLike,
  options: FlyingClickEffectOptions
): FlyingClickEffectElementLike | null {
  const existing = queryExistingLayer(root);
  if (existing) return existing;
  const layer = documentLike.createElement?.("span") || null;
  if (!layer) return null;
  addClass(layer, resolveText(options.layerClassName, DEFAULT_LAYER_CLASS_NAME));
  setAttribute(layer, "data-flying-click-effect-layer", "1");
  setAttribute(layer, "aria-hidden", "true");
  return appendChild(root, layer) ? layer : null;
}

function shouldSkipForReducedMotion(options: FlyingClickEffectOptions): boolean {
  const windowLike = resolveWindowLike(options);
  if (!windowLike || typeof windowLike.matchMedia !== "function") return false;
  try {
    return !!windowLike.matchMedia(REDUCED_MOTION_QUERY)?.matches;
  } catch (_err) {
    return false;
  }
}

function resolveRandomUnit(options: FlyingClickEffectOptions): number {
  const random = typeof options.random === "function" ? options.random : randomUnitFloat;
  const raw = Number(random());
  return Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 0.5;
}

function resolveRandomOffset(options: FlyingClickEffectOptions): number {
  const normalized = resolveRandomUnit(options);
  return (normalized - 0.5) * resolvePositiveNumber(options.xRangePx, DEFAULT_X_RANGE_PX);
}

function resolveTileValue(options: FlyingClickEffectOptions): number {
  const index = Math.min(
    DEFAULT_TILE_VALUES.length - 1,
    Math.floor(resolveRandomUnit(options) * DEFAULT_TILE_VALUES.length)
  );
  return DEFAULT_TILE_VALUES[Math.max(0, index)] || 2;
}

function createTileParticle(
  documentLike: FlyingClickEffectDocumentLike,
  options: FlyingClickEffectOptions
): FlyingClickEffectElementLike | null {
  const tileValue = resolveTileValue(options);
  const particle = documentLike.createElement?.("div") || null;
  const inner = documentLike.createElement?.("div") || null;
  if (!particle || !inner) return null;

  addClass(particle, resolveText(options.particleClassName, DEFAULT_PARTICLE_CLASS_NAME));
  addClass(particle, "tile");
  addClass(particle, "tile-" + tileValue);
  if (tileValue > 2048) addClass(particle, "tile-super");
  setAttribute(particle, "aria-hidden", "true");
  setAttribute(particle, "data-flying-click-effect-value", String(tileValue));

  addClass(inner, "tile-inner");
  inner.textContent = String(tileValue);
  return appendChild(particle, inner) ? particle : null;
}

function createImageParticle(
  documentLike: FlyingClickEffectDocumentLike,
  options: FlyingClickEffectOptions
): FlyingClickEffectElementLike | null {
  const imageSrc = resolveText(options.imageSrc, "");
  if (!imageSrc) return null;
  const particle = documentLike.createElement?.("div") || null;
  const image = documentLike.createElement?.("img") || null;
  if (!particle || !image) return null;

  addClass(particle, resolveText(options.particleClassName, DEFAULT_PARTICLE_CLASS_NAME));
  addClass(particle, "flying-click-effect-logo");
  if (options.imageBurst) addClass(particle, "flying-click-effect-logo--burst");
  setAttribute(particle, "aria-hidden", "true");
  setAttribute(particle, "data-flying-click-effect-kind", "logo");

  addClass(image, "flying-click-effect-logo-image");
  setAttribute(image, "src", imageSrc);
  setAttribute(image, "alt", resolveText(options.imageAlt, DEFAULT_IMAGE_ALT));
  if (!appendChild(particle, image)) return null;
  if (options.imageBurst) {
    LOGO_POWDER_OFFSETS.forEach(([x, y], index) => {
      const powder = documentLike.createElement?.("span") || null;
      if (!powder) return;
      addClass(powder, "flying-click-effect-logo-powder");
      addClass(powder, "flying-click-effect-logo-powder-" + ((index % 4) + 1));
      setAttribute(powder, "aria-hidden", "true");
      if (powder.style && typeof powder.style.setProperty === "function") {
        powder.style.setProperty("--flying-click-powder-x", x + "px");
        powder.style.setProperty("--flying-click-powder-y", y + "px");
      }
      appendChild(particle, powder);
    });
  }
  return particle;
}

function createParticle(
  documentLike: FlyingClickEffectDocumentLike,
  options: FlyingClickEffectOptions
): FlyingClickEffectElementLike | null {
  if (options.particleKind === "image") {
    return createImageParticle(documentLike, options);
  }
  return createTileParticle(documentLike, options);
}

function scheduleParticleCleanup(
  particle: FlyingClickEffectElementLike,
  options: FlyingClickEffectOptions
): void {
  let removed = false;
  let completed = false;
  let timeoutId: unknown = null;
  const windowLike = resolveWindowLike(options);
  const complete = (): void => {
    if (completed || typeof options.onComplete !== "function") return;
    completed = true;
    try {
      options.onComplete(particle);
    } catch (_err) {}
  };
  const cleanup = (): void => {
    if (removed) return;
    removed = true;
    complete();
    if (timeoutId !== null && windowLike && typeof windowLike.clearTimeout === "function") {
      try {
        windowLike.clearTimeout(timeoutId);
      } catch (_err) {}
    }
    removeNode(particle);
  };
  if (typeof particle.addEventListener === "function") {
    try {
      particle.addEventListener("animationend", cleanup);
    } catch (_err) {}
  }
  if (windowLike && typeof windowLike.setTimeout === "function") {
    try {
      timeoutId = windowLike.setTimeout(
        cleanup,
        resolvePositiveNumber(options.cleanupTimeoutMs, DEFAULT_CLEANUP_TIMEOUT_MS)
      );
    } catch (_err) {}
  }
}

export function triggerFlyingClickEffect(
  options: FlyingClickEffectOptions = {}
): FlyingClickEffectElementLike | null {
  const root = options.root || null;
  const documentLike = resolveDocumentLike(options);
  if (!root || !documentLike || typeof documentLike.createElement !== "function") return null;
  if (shouldSkipForReducedMotion(options)) return null;

  addClass(root, resolveText(options.rootClassName, DEFAULT_ROOT_CLASS_NAME));
  const layer = createLayer(root, documentLike, options);
  if (!layer) return null;

  const particle = createParticle(documentLike, options);
  if (!particle) return null;
  const offset = resolveRandomOffset(options);
  if (particle.style && typeof particle.style.setProperty === "function") {
    particle.style.setProperty("--flying-click-x", offset + "px");
  }
  if (!appendChild(layer, particle)) return null;
  scheduleParticleCleanup(particle, options);
  return particle;
}

export function bindFlyingClickEffect(
  target: FlyingClickEffectElementLike | null | undefined,
  options: FlyingClickEffectOptions = {}
): FlyingClickEffectBinding {
  const resolveRoot = (): FlyingClickEffectElementLike | null =>
    options.root || target?.parentNode || target || null;
  const trigger = (): FlyingClickEffectElementLike | null =>
    triggerFlyingClickEffect({
      ...options,
      root: resolveRoot()
    });
  const listener = (): void => {
    trigger();
  };
  if (target && typeof target.addEventListener === "function") {
    try {
      target.addEventListener("click", listener);
    } catch (_err) {}
  }
  return {
    destroy() {
      if (!target || typeof target.removeEventListener !== "function") return;
      try {
        target.removeEventListener("click", listener);
      } catch (_err) {}
    },
    trigger
  };
}

export function createFlyingClickEffectRuntime(): FlyingClickEffectRuntime {
  return {
    bindFlyingClickEffect,
    triggerFlyingClickEffect
  };
}

export function installFlyingClickEffectRuntime(
  options: FlyingClickEffectRuntimeInstallOptions = {}
): FlyingClickEffectRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as FlyingClickEffectWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreFlyingClickEffectRuntime) {
    windowLike.CoreFlyingClickEffectRuntime = createFlyingClickEffectRuntime();
  }
  return windowLike.CoreFlyingClickEffectRuntime || null;
}
