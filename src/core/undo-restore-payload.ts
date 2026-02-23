export interface UndoRestorePayloadInput {
  prev: Record<string, unknown> | null | undefined;
  fallbackScore: number;
}

export interface UndoRestorePayloadResult {
  score: number;
  tiles: Record<string, unknown>[];
}

export function computeUndoRestorePayload(
  input: UndoRestorePayloadInput
): UndoRestorePayloadResult {
  const source = input.prev && typeof input.prev === "object" ? input.prev : {};
  const score =
    Number.isFinite(source.score) && typeof source.score === "number"
      ? Number(source.score)
      : Number.isFinite(input.fallbackScore) && typeof input.fallbackScore === "number"
        ? Number(input.fallbackScore)
        : 0;

  const rawTiles = Array.isArray(source.tiles) ? source.tiles : [];
  const tiles: Record<string, unknown>[] = [];
  for (let i = 0; i < rawTiles.length; i += 1) {
    const item = rawTiles[i];
    if (!item || typeof item !== "object") continue;
    tiles.push(item as Record<string, unknown>);
  }

  return {
    score,
    tiles
  };
}
