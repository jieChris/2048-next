export interface AchievementFamilyItem {
  id: string;
  seriesId?: unknown;
  series_id?: unknown;
  level?: unknown;
  sortOrder?: unknown;
  sort_order?: unknown;
}

export interface AchievementFamily<T extends AchievementFamilyItem> {
  key: string;
  seriesId: string;
  isSeries: boolean;
  items: T[];
}

function text(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

function positiveInteger(value: unknown, fallback: number): number {
  const parsed = Math.floor(Number(value));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function nonNegativeInteger(value: unknown): number {
  const parsed = Math.floor(Number(value));
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : Number.MAX_SAFE_INTEGER;
}

function compareItems<T extends AchievementFamilyItem>(left: T, right: T): number {
  const levelDelta = positiveInteger(left.level, 1) - positiveInteger(right.level, 1);
  if (levelDelta) return levelDelta;
  const orderDelta = nonNegativeInteger(left.sortOrder ?? left.sort_order) - nonNegativeInteger(right.sortOrder ?? right.sort_order);
  if (orderDelta) return orderDelta;
  return left.id.localeCompare(right.id);
}

export function achievementSeriesId(item: AchievementFamilyItem): string {
  return text(item.seriesId ?? item.series_id) || item.id;
}

export function groupAchievementFamilies<T extends AchievementFamilyItem>(items: T[]): AchievementFamily<T>[] {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const seriesId = achievementSeriesId(item);
    const entries = grouped.get(seriesId) || [];
    entries.push(item);
    grouped.set(seriesId, entries);
  }
  return Array.from(grouped, ([seriesId, entries]) => {
    const sorted = entries.slice().sort(compareItems);
    return {
      key: "series:" + seriesId,
      seriesId,
      isSeries: sorted.length > 1,
      items: sorted
    };
  }).sort((left, right) => compareItems(left.items[0]!, right.items[0]!));
}

export function highestAchievementPerFamily<T extends AchievementFamilyItem>(items: T[]): T[] {
  return groupAchievementFamilies(items).map((family) => family.items.at(-1)!);
}
