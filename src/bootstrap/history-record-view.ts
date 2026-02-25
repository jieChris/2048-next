function normalizeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeFiniteNumber(value: unknown, fallback: number): number {
  return Number.isFinite(value) ? Number(value) : fallback;
}

export function resolveHistoryModeText(input: {
  modeKey?: unknown;
  modeFallback?: unknown;
  catalogLabel?: unknown;
}): string {
  const catalogLabel = normalizeString(input && input.catalogLabel).trim();
  if (catalogLabel) return catalogLabel;

  const modeKey = normalizeString(input && input.modeKey).trim();
  if (modeKey) return modeKey;

  const modeFallback = normalizeString(input && input.modeFallback).trim();
  if (modeFallback) return modeFallback;

  return "未知";
}

export function resolveHistoryDurationText(durationMs: unknown): string {
  let value = Number(durationMs);
  if (!Number.isFinite(value) || value < 0) value = 0;

  const totalSec = Math.floor(value / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  if (h > 0) return h + "h " + m + "m " + s + "s";
  if (m > 0) return m + "m " + s + "s";
  return s + "s";
}

export function resolveHistoryEndedText(endedAt: unknown): string {
  if (!endedAt) return "-";
  return new Date(endedAt as string | number | Date).toLocaleString();
}

export function resolveHistoryRecordHeadState(input: {
  modeKey?: unknown;
  modeFallback?: unknown;
  catalogLabel?: unknown;
  score?: unknown;
  bestTile?: unknown;
  durationMs?: unknown;
  endedAt?: unknown;
}): {
  modeText: string;
  score: number;
  bestTile: number;
  durationText: string;
  endedText: string;
} {
  return {
    modeText: resolveHistoryModeText({
      modeKey: input && input.modeKey,
      modeFallback: input && input.modeFallback,
      catalogLabel: input && input.catalogLabel
    }),
    score: normalizeFiniteNumber(input && input.score, 0),
    bestTile: normalizeFiniteNumber(input && input.bestTile, 0),
    durationText: resolveHistoryDurationText(input && input.durationMs),
    endedText: resolveHistoryEndedText(input && input.endedAt)
  };
}
