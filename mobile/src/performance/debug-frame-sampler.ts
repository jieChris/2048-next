export interface DebugFrameSample {
  readonly durationMs: number;
  readonly frameCount: number;
  readonly effectiveFps: number;
  readonly medianIntervalMs: number;
  readonly p95IntervalMs: number;
}

declare global {
  interface Window {
    __2048NextLastFrameSample?: DebugFrameSample;
    __2048NextStartFrameSample?: (durationMs?: number) => Promise<DebugFrameSample>;
  }
}

function percentile(sorted: readonly number[], ratio: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
}

export function summarizeDebugFrameSample(
  timestamps: readonly number[],
): DebugFrameSample {
  const durationMs = Math.max(
    0,
    (timestamps[timestamps.length - 1] ?? 0) - (timestamps[0] ?? 0),
  );
  const intervals = timestamps
    .slice(1)
    .map((timestamp, index) => timestamp - (timestamps[index] ?? timestamp))
    .filter((interval) => Number.isFinite(interval) && interval > 0)
    .sort((left, right) => left - right);
  return {
    durationMs,
    frameCount: timestamps.length,
    effectiveFps:
      durationMs > 0 ? Math.round(((timestamps.length - 1) * 100_000) / durationMs) / 100 : 0,
    medianIntervalMs: Math.round(percentile(intervals, 0.5) * 100) / 100,
    p95IntervalMs: Math.round(percentile(intervals, 0.95) * 100) / 100,
  };
}

export function installDebugFrameSampler(): void {
  window.__2048NextStartFrameSample = (requestedDurationMs = 5_000) =>
    new Promise((resolve) => {
      const durationMs = Math.min(60_000, Math.max(1_000, requestedDurationMs));
      const timestamps: number[] = [];
      const sample = (timestamp: number): void => {
        timestamps.push(timestamp);
        if (timestamp - (timestamps[0] ?? timestamp) < durationMs) {
          requestAnimationFrame(sample);
          return;
        }
        const result = summarizeDebugFrameSample(timestamps);
        window.__2048NextLastFrameSample = result;
        resolve(result);
      };
      requestAnimationFrame(sample);
    });
}
