/**
 * Unified refresh scheduler with visibility-driven + backoff mechanism.
 *
 * Replaces per-page ad-hoc polling with a centralized scheduler that:
 * - Pauses when the tab is not visible (Page Visibility API)
 * - Uses exponential backoff on errors
 * - Supports immediate wake-up when tab becomes visible
 * - Allows multiple named refresh tasks
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RefreshTaskConfig {
  name: string;
  intervalMs: number;
  backgroundIntervalMs?: number;
  maxBackoffMs?: number;
  callback: () => void | Promise<void>;
}

export interface RefreshTaskState {
  name: string;
  intervalMs: number;
  backgroundIntervalMs: number;
  maxBackoffMs: number;
  currentBackoffMs: number;
  consecutiveErrors: number;
  isVisible: boolean;
  timerId: ReturnType<typeof setTimeout> | null;
  callback: () => void | Promise<void>;
}

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

export class RefreshScheduler {
  private tasks: Map<string, RefreshTaskState> = new Map();
  private visibilityHandler: (() => void) | null = null;

  constructor() {
    if (typeof document !== "undefined") {
      this.visibilityHandler = () => this.onVisibilityChange();
      document.addEventListener("visibilitychange", this.visibilityHandler);
    }
  }

  register(config: RefreshTaskConfig): void {
    this.unregister(config.name);

    const state: RefreshTaskState = {
      name: config.name,
      intervalMs: config.intervalMs,
      backgroundIntervalMs: config.backgroundIntervalMs ?? config.intervalMs * 3,
      maxBackoffMs: config.maxBackoffMs ?? 60_000,
      currentBackoffMs: 0,
      consecutiveErrors: 0,
      isVisible: typeof document !== "undefined" ? document.visibilityState === "visible" : true,
      timerId: null,
      callback: config.callback
    };

    this.tasks.set(config.name, state);
    this.scheduleNext(state);
  }

  unregister(name: string): void {
    const state = this.tasks.get(name);
    if (state) {
      if (state.timerId !== null) clearTimeout(state.timerId);
      this.tasks.delete(name);
    }
  }

  destroy(): void {
    for (const state of this.tasks.values()) {
      if (state.timerId !== null) clearTimeout(state.timerId);
    }
    this.tasks.clear();
    if (typeof document !== "undefined" && this.visibilityHandler) {
      document.removeEventListener("visibilitychange", this.visibilityHandler);
    }
  }

  // -- internals ---

  private getEffectiveInterval(state: RefreshTaskState): number {
    const base = state.isVisible ? state.intervalMs : state.backgroundIntervalMs;
    return Math.min(base + state.currentBackoffMs, state.maxBackoffMs);
  }

  private scheduleNext(state: RefreshTaskState): void {
    if (state.timerId !== null) clearTimeout(state.timerId);
    const delay = this.getEffectiveInterval(state);
    state.timerId = setTimeout(() => this.executeTick(state), delay);
  }

  private async executeTick(state: RefreshTaskState): Promise<void> {
    try {
      await state.callback();
      state.consecutiveErrors = 0;
      state.currentBackoffMs = 0;
    } catch {
      state.consecutiveErrors += 1;
      state.currentBackoffMs = Math.min(
        state.intervalMs * Math.pow(2, state.consecutiveErrors),
        state.maxBackoffMs
      );
    }
    if (this.tasks.has(state.name)) {
      this.scheduleNext(state);
    }
  }

  private onVisibilityChange(): void {
    const isVisible = document.visibilityState === "visible";
    for (const state of this.tasks.values()) {
      const wasVisible = state.isVisible;
      state.isVisible = isVisible;
      if (!wasVisible && isVisible) {
        // Tab became visible — immediate refresh
        if (state.timerId !== null) clearTimeout(state.timerId);
        state.timerId = setTimeout(() => this.executeTick(state), 0);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton for application-wide use
// ---------------------------------------------------------------------------

let defaultScheduler: RefreshScheduler | null = null;

export function getDefaultScheduler(): RefreshScheduler {
  if (!defaultScheduler) {
    defaultScheduler = new RefreshScheduler();
  }
  return defaultScheduler;
}
