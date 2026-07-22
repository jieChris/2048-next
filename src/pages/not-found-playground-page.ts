import {
  installAchievementUnlockToastRuntime,
  type AchievementUnlockToastRuntime,
} from "../bootstrap/achievement-unlock-toast";
import { readAuthToken, type JsonRecord } from "../services/api-client";
import {
  createAchievementsService,
  type AchievementsService,
} from "../services/achievements";
import { createBrowserStorageAccess } from "../storage/browser-storage";
import { randomUnitFloat } from "../utils/crypto-random";

export interface TileModel {
  id: number;
  value: number;
  x: number;
  y: number;
  tilt: number;
}

export interface RectLike {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

const DROP_VALUES = [2, 4, 8, 16, 32, 64] as const;
const LOST_PAGE_VISITED_EVENT_ID = "lost_page_visited";
const MAX_TILES = 12;
const SPAWN_AXIS = [10, 36.667, 63.333, 90] as const;
const SPAWN_POINTS = SPAWN_AXIS.flatMap((y) =>
  SPAWN_AXIS.map((x) => ({ x, y })),
);

function randomIndex(length: number, random: () => number): number {
  return Math.floor(Math.min(0.999999999, Math.max(0, random())) * length);
}

function randomDropValue(random: () => number): number {
  return DROP_VALUES[randomIndex(DROP_VALUES.length, random)];
}

export function initialTiles(random: () => number = randomUnitFloat): TileModel[] {
  const values = Array.from({ length: 5 }, () => randomDropValue(random)).flatMap(
    (value) => [value, value],
  );
  for (let layoutAttempt = 0; layoutAttempt < 8; layoutAttempt += 1) {
    const tiles: TileModel[] = [];
    for (const [index, value] of values.entries()) {
      const point = randomSpawnPoint(tiles, random);
      if (!point) break;
      tiles.push({
        id: index + 1,
        value,
        x: point.x,
        y: point.y,
        tilt: randomIndex(11, random) - 5,
      });
    }
    if (tiles.length === values.length) return tiles;
  }
  const points = [...SPAWN_POINTS];
  for (let index = points.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1, random);
    [points[index], points[swapIndex]] = [points[swapIndex], points[index]];
  }
  return values.map((value, index) => ({
    id: index + 1,
    value,
    x: points[index].x,
    y: points[index].y,
    tilt: randomIndex(11, random) - 5,
  }));
}

export function clampPercent(value: number, halfSizePercent: number): number {
  return Math.min(100 - halfSizePercent, Math.max(halfSizePercent, value));
}

export function overlapRatio(first: RectLike, second: RectLike): number {
  const width = Math.max(
    0,
    Math.min(first.right, second.right) - Math.max(first.left, second.left),
  );
  const height = Math.max(
    0,
    Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top),
  );
  const smallestArea = Math.min(
    first.width * first.height,
    second.width * second.height,
  );
  return smallestArea > 0 ? (width * height) / smallestArea : 0;
}

export function mergeTiles(
  tiles: TileModel[],
  sourceId: number,
  targetId: number,
): TileModel[] {
  const source = tiles.find((tile) => tile.id === sourceId);
  const target = tiles.find((tile) => tile.id === targetId);
  if (
    !source ||
    !target ||
    source.id === target.id ||
    source.value !== target.value
  )
    return tiles;
  return tiles
    .filter((tile) => tile.id !== sourceId)
    .map((tile) =>
      tile.id === targetId
        ? {
            ...tile,
            value: tile.value * 2,
            x: (source.x + target.x) / 2,
            y: (source.y + target.y) / 2,
            tilt: 0,
          }
        : tile,
    );
}

export function spawnPositionsOverlap(
  first: Pick<TileModel, "x" | "y">,
  second: Pick<TileModel, "x" | "y">,
): boolean {
  return Math.abs(first.x - second.x) < 22 && Math.abs(first.y - second.y) < 22;
}

export function hasMergePair(tiles: TileModel[]): boolean {
  const values = new Set<number>();
  for (const tile of tiles) {
    if (values.has(tile.value)) return true;
    values.add(tile.value);
  }
  return false;
}

export function randomSpawnPoint(
  tiles: TileModel[],
  random: () => number = randomUnitFloat,
): { x: number; y: number } | undefined {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const point = { x: 10 + random() * 80, y: 10 + random() * 80 };
    if (tiles.every((tile) => !spawnPositionsOverlap(point, tile))) return point;
  }
  const available = SPAWN_POINTS.filter((point) =>
    tiles.every((tile) => !spawnPositionsOverlap(point, tile)),
  );
  if (available.length === 0) return undefined;
  return available[randomIndex(available.length, random)];
}

function dropValuesFor(tiles: TileModel[], random: () => number): number[] {
  if (hasMergePair(tiles)) return [randomDropValue(random)];
  const lowTiles = tiles.filter((tile) => tile.value <= 64);
  if (lowTiles.length > 0)
    return [lowTiles[randomIndex(lowTiles.length, random)].value];
  const value = randomDropValue(random);
  return [value, value];
}

function trimOverflow(
  tiles: TileModel[],
  incomingCount: number,
  protectedId: number,
): TileModel[] {
  const overflow = tiles.length + incomingCount - MAX_TILES;
  if (overflow <= 0) return tiles;
  const counts = new Map<number, number>();
  for (const tile of tiles)
    counts.set(tile.value, (counts.get(tile.value) || 0) + 1);
  const removed = new Set(
    tiles
      .filter(
        (tile) =>
          tile.id !== protectedId &&
          tile.value > 64 &&
          counts.get(tile.value) === 1,
      )
      .sort((first, second) => first.id - second.id)
      .slice(0, overflow)
      .map((tile) => tile.id),
  );
  return tiles.filter((tile) => !removed.has(tile.id));
}

function spreadAcrossSpawnPoints(tiles: TileModel[]): TileModel[] {
  return tiles.map((tile, index) => ({
    ...tile,
    x: SPAWN_POINTS[index].x,
    y: SPAWN_POINTS[index].y,
    tilt: 0,
  }));
}

export function mergeAndSpawnTiles(
  tiles: TileModel[],
  sourceId: number,
  targetId: number,
  spawnedId: number,
  random: () => number = randomUnitFloat,
): TileModel[] {
  const merged = mergeTiles(tiles, sourceId, targetId);
  if (merged === tiles) return tiles;
  const dropValues = dropValuesFor(merged, random);
  let result = trimOverflow(merged, dropValues.length, targetId);
  for (const [index, value] of dropValues.entries()) {
    let point = randomSpawnPoint(result, random);
    if (!point) {
      result = spreadAcrossSpawnPoints(result);
      point = randomSpawnPoint(result, random)!;
    }
    const id = spawnedId + index;
    result.push({ id, value, x: point.x, y: point.y, tilt: (id % 11) - 5 });
  }
  return result;
}

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing 404 playground element: #${id}`);
  return element as T;
}

function toRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

export async function submitLostPageAchievement(options: {
  runtime?: AchievementUnlockToastRuntime | null;
  service?: Pick<AchievementsService, "grantMyAchievementEvent">;
  storageLike?: Storage | null;
  windowLike?: Window | null;
} = {}): Promise<void> {
  const windowLike =
    options.windowLike || (typeof window === "undefined" ? null : window);
  const storageLike =
    options.storageLike ??
    createBrowserStorageAccess({ windowLike }).local();
  if (!readAuthToken({ storageLike })) return;
  const service = options.service || createAchievementsService({ windowLike });
  const payload = await service
    .grantMyAchievementEvent(LOST_PAGE_VISITED_EVENT_ID)
    .catch(() => null);
  if (!payload || payload.success !== true || payload.newly_granted === false)
    return;
  const data = toRecord(payload.data);
  options.runtime?.showAchievementUnlockToast(data);
}

function bootstrap(): void {
  const achievementRuntime = installAchievementUnlockToastRuntime();
  const playground = requiredElement<HTMLDivElement>("tile-playground");
  const scatterButton = requiredElement<HTMLButtonElement>("scatter-button");
  let tiles = initialTiles();
  let nextTileId = 11;
  let dragging:
    | { id: number; pointerId: number; offsetX: number; offsetY: number }
    | undefined;

  function tileById(id: number): TileModel | undefined {
    return tiles.find((tile) => tile.id === id);
  }

  function updateTilePosition(tile: TileModel, element: HTMLElement): void {
    element.style.left = `${tile.x}%`;
    element.style.top = `${tile.y}%`;
  }

  function render(mergedId?: number, spawnedIds: number[] = []): void {
    playground.replaceChildren();
    for (const tile of tiles) {
      const element = document.createElement("button");
      element.type = "button";
      element.className = `play-tile${tile.id === mergedId ? " is-merged" : ""}${spawnedIds.includes(tile.id) ? " is-spawned" : ""}`;
      element.dataset.tileId = String(tile.id);
      element.dataset.value = String(tile.value);
      element.dataset.digits = String(String(tile.value).length);
      if (tile.value > 2048) element.dataset.large = "true";
      element.textContent = String(tile.value);
      element.setAttribute(
        "aria-label",
        `方块 ${tile.value}，可拖动或用方向键移动`,
      );
      element.style.setProperty("--tilt", `${tile.tilt}deg`);
      updateTilePosition(tile, element);
      playground.append(element);
    }
  }

  function findMergeTarget(sourceId: number): number | undefined {
    const source = tileById(sourceId);
    const sourceElement = playground.querySelector<HTMLElement>(
      `[data-tile-id="${sourceId}"]`,
    );
    if (!source || !sourceElement) return undefined;
    const sourceRect = sourceElement.getBoundingClientRect();
    let best: { id: number; ratio: number } | undefined;
    for (const candidate of tiles) {
      if (candidate.id === sourceId || candidate.value !== source.value)
        continue;
      const candidateElement = playground.querySelector<HTMLElement>(
        `[data-tile-id="${candidate.id}"]`,
      );
      if (!candidateElement) continue;
      const ratio = overlapRatio(
        sourceRect,
        candidateElement.getBoundingClientRect(),
      );
      if (ratio >= 0.35 && (!best || ratio > best.ratio))
        best = { id: candidate.id, ratio };
    }
    return best?.id;
  }

  function finishMove(sourceId: number): void {
    const targetId = findMergeTarget(sourceId);
    if (targetId === undefined) return;
    const spawnedId = nextTileId;
    tiles = mergeAndSpawnTiles(tiles, sourceId, targetId, spawnedId);
    const spawnedIds = tiles
      .filter((tile) => tile.id >= spawnedId)
      .map((tile) => tile.id);
    nextTileId += spawnedIds.length;
    render(targetId, spawnedIds);
    playground
      .querySelector<HTMLButtonElement>(`[data-tile-id="${targetId}"]`)
      ?.focus();
  }

  function moveFromClientPosition(clientX: number, clientY: number): void {
    if (!dragging) return;
    const tile = tileById(dragging.id);
    const element = playground.querySelector<HTMLElement>(
      `[data-tile-id="${dragging.id}"]`,
    );
    if (!tile || !element) return;
    const stageRect = playground.getBoundingClientRect();
    const tileRect = element.getBoundingClientRect();
    const halfX = (tileRect.width / stageRect.width) * 50;
    const halfY = (tileRect.height / stageRect.height) * 50;
    tile.x = clampPercent(
      ((clientX - stageRect.left - dragging.offsetX + tileRect.width / 2) /
        stageRect.width) *
        100,
      halfX,
    );
    tile.y = clampPercent(
      ((clientY - stageRect.top - dragging.offsetY + tileRect.height / 2) /
        stageRect.height) *
        100,
      halfY,
    );
    tile.tilt = 0;
    updateTilePosition(tile, element);
  }

  playground.addEventListener("pointerdown", (event) => {
    const element = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-tile-id]",
    );
    if (!element) return;
    const rect = element.getBoundingClientRect();
    dragging = {
      id: Number(element.dataset.tileId),
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    element.classList.add("is-dragging");
    element.focus();
    playground.setPointerCapture?.(event.pointerId);
  });

  playground.addEventListener("pointermove", (event) => {
    if (!dragging || dragging.pointerId !== event.pointerId) return;
    moveFromClientPosition(event.clientX, event.clientY);
  });

  playground.addEventListener("pointerup", (event) => {
    if (!dragging || dragging.pointerId !== event.pointerId) return;
    const sourceId = dragging.id;
    playground
      .querySelector<HTMLElement>(`[data-tile-id="${sourceId}"]`)
      ?.classList.remove("is-dragging");
    dragging = undefined;
    finishMove(sourceId);
  });

  playground.addEventListener("pointercancel", () => {
    if (dragging)
      playground
        .querySelector<HTMLElement>(`[data-tile-id="${dragging.id}"]`)
        ?.classList.remove("is-dragging");
    dragging = undefined;
  });

  playground.addEventListener("keydown", (event) => {
    const element = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-tile-id]",
    );
    const tile = element ? tileById(Number(element.dataset.tileId)) : undefined;
    const delta =
      event.key === "ArrowUp"
        ? [0, -3]
        : event.key === "ArrowDown"
          ? [0, 3]
          : event.key === "ArrowLeft"
            ? [-3, 0]
            : event.key === "ArrowRight"
              ? [3, 0]
              : undefined;
    if (!element || !tile || !delta) return;
    event.preventDefault();
    const stageRect = playground.getBoundingClientRect();
    const tileRect = element.getBoundingClientRect();
    tile.x = clampPercent(
      tile.x + delta[0],
      (tileRect.width / stageRect.width) * 50,
    );
    tile.y = clampPercent(
      tile.y + delta[1],
      (tileRect.height / stageRect.height) * 50,
    );
    tile.tilt = 0;
    updateTilePosition(tile, element);
    finishMove(tile.id);
  });

  scatterButton.addEventListener("click", () => {
    tiles = initialTiles();
    nextTileId = 11;
    render();
  });

  render();
  void submitLostPageAchievement({ runtime: achievementRuntime });
}

if (typeof document !== "undefined") bootstrap();
