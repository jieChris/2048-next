import type { GameTransition } from "../../../src/contracts";
import { performSystemHaptic, type SystemHapticKind } from "./system-haptics";

const BGM_URL = new URL(
  "../../../public/audio/windows-bgm.m4a",
  import.meta.url,
).href;

export type GameFeedbackKind = "move" | SystemHapticKind;

export interface GameFeedbackPreferences {
  soundEffects: boolean;
  haptics: boolean;
  bgm: boolean;
}

const TONES: Record<
  GameFeedbackKind,
  readonly [frequency: number, offset: number, duration: number, volume: number][]
> = {
  move: [[220, 0, 0.035, 0.025]],
  merge: [[360, 0, 0.06, 0.045]],
  milestone: [
    [520, 0, 0.09, 0.055],
    [780, 0.08, 0.14, 0.05],
  ],
  finish: [
    [330, 0, 0.12, 0.05],
    [220, 0.1, 0.18, 0.04],
  ],
};

export function resolveGameFeedbackKind(
  transition: GameTransition,
  finalTerminal: boolean,
): GameFeedbackKind | null {
  if (!transition.moved) return null;
  if (finalTerminal && transition.gameOver) return "finish";
  if (transition.milestone2048) return "milestone";
  if (transition.merges.length > 0) return "merge";
  return "move";
}

export class GameFeedback {
  #preferences: GameFeedbackPreferences;
  #context: AudioContext | null = null;
  #music: HTMLAudioElement | null = null;
  readonly #activeOscillators = new Set<OscillatorNode>();
  #lifecyclePaused = false;

  readonly #onUserGesture = (): void => {
    if (this.#preferences.bgm && !this.#lifecyclePaused) {
      void this.#playMusic().catch(() => undefined);
    }
  };

  constructor(preferences: GameFeedbackPreferences) {
    this.#preferences = { ...preferences };
    if (typeof window !== "undefined") {
      window.addEventListener("pointerdown", this.#onUserGesture, {
        capture: true,
      });
      window.addEventListener("keydown", this.#onUserGesture, {
        capture: true,
      });
    }
  }

  update(preferences: GameFeedbackPreferences): void {
    const bgmChanged = preferences.bgm !== this.#preferences.bgm;
    this.#preferences = { ...preferences };
    if (!preferences.soundEffects) this.#stopTones();
    if (!bgmChanged) return;
    if (preferences.bgm && !this.#lifecyclePaused) {
      void this.#playMusic().catch(() => undefined);
    } else {
      this.#pauseMusic(true);
    }
  }

  consume(transition: GameTransition, finalTerminal: boolean): void {
    const kind = resolveGameFeedbackKind(transition, finalTerminal);
    if (!kind) return;
    this.#emit(kind);
  }

  finishPendingTerminal(): void {
    this.#emit("finish");
  }

  pause(): void {
    this.#lifecyclePaused = true;
    this.#pauseMusic(false);
  }

  resume(): void {
    this.#lifecyclePaused = false;
    if (this.#preferences.bgm) {
      void this.#playMusic().catch(() => undefined);
    }
  }

  destroy(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("pointerdown", this.#onUserGesture, true);
      window.removeEventListener("keydown", this.#onUserGesture, true);
    }
    this.#pauseMusic(true);
    this.#stopTones();
    void this.#context?.close().catch(() => undefined);
    this.#context = null;
  }

  #emit(kind: GameFeedbackKind): void {
    if (this.#preferences.soundEffects) {
      void this.#playTone(kind).catch(() => undefined);
    }
    if (kind !== "move" && this.#preferences.haptics) {
      void performSystemHaptic(kind).catch(() => undefined);
    }
  }

  async #playTone(kind: GameFeedbackKind): Promise<void> {
    const Context = globalThis.AudioContext ??
      (globalThis as typeof globalThis & {
        webkitAudioContext?: typeof AudioContext;
      }).webkitAudioContext;
    if (!Context) return;
    const context = this.#context ?? (this.#context = new Context());
    if (context.state === "suspended") await context.resume();
    const now = context.currentTime;
    for (const [frequency, offset, duration, volume] of TONES[kind]) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = now + offset;
      const end = start + duration;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      oscillator.connect(gain).connect(context.destination);
      this.#activeOscillators.add(oscillator);
      oscillator.addEventListener("ended", () => {
        this.#activeOscillators.delete(oscillator);
      }, { once: true });
      oscillator.start(start);
      oscillator.stop(end + 0.01);
    }
  }

  async #playMusic(): Promise<void> {
    const music = this.#music ?? (this.#music = this.#createMusic());
    if (!music || !music.paused) return;
    await music.play();
  }

  #createMusic(): HTMLAudioElement | null {
    if (typeof Audio !== "function") return null;
    const music = new Audio(BGM_URL);
    music.preload = "none";
    music.loop = true;
    music.volume = 0.25;
    return music;
  }

  #pauseMusic(reset: boolean): void {
    const music = this.#music;
    if (!music) return;
    music.pause();
    if (reset) {
      try {
        music.currentTime = 0;
      } catch {
        // Some media implementations do not allow seeking before metadata.
      }
    }
  }

  #stopTones(): void {
    for (const oscillator of this.#activeOscillators) {
      try {
        oscillator.stop();
      } catch {
        // The oscillator may already have reached its scheduled stop.
      }
    }
    this.#activeOscillators.clear();
  }
}
