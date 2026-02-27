function normalizeGridSize(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 4;
  return Math.floor(numeric);
}

export function resolveTimerUpdateIntervalMs(width: unknown, height: unknown): number {
  const w = normalizeGridSize(width);
  const h = normalizeGridSize(height);
  const area = w * h;
  if (area >= 100) return 50;
  if (area >= 64) return 33;
  return 10;
}
