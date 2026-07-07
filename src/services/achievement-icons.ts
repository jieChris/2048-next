type AchievementIconKind = "milestone" | "speedrun" | "community";

type AchievementIconSource = {
  id?: unknown;
  achievement_id?: unknown;
  name?: unknown;
  title?: unknown;
  level?: unknown;
  seriesId?: unknown;
  series_id?: unknown;
  rules?: unknown;
};

interface AchievementIconItem {
  id: string;
  kind: AchievementIconKind;
  name: string;
  tile: number;
  level: number;
  count?: number;
  minutes?: number;
  imageUrl?: string;
}

const TILE_COLORS: Record<number, { bg: string; fg: string; accent: string }> = {
  2048: { bg: "#edc22e", fg: "#fff8df", accent: "#9f6f00" },
  4096: { bg: "#3db3d8", fg: "#eefbff", accent: "#0e7490" },
  8192: { bg: "#7c6cf0", fg: "#f4f2ff", accent: "#4338ca" },
  16384: { bg: "#dc5f84", fg: "#fff0f5", accent: "#9f1239" },
  32768: { bg: "#2f8f5b", fg: "#ecfdf3", accent: "#166534" },
  65536: { bg: "#37343f", fg: "#f8fafc", accent: "#f59e0b" }
};
const SPEEDRUN_RIMS = ["#e5e7eb", "#38bdf8", "#a78bfa", "#facc15", "#f8fafc"] as const;
const MILESTONE_RIMS = ["#e5e7eb", "#38bdf8", "#facc15"] as const;

function svgText(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] || char));
}

function svgId(value: string): string {
  return value.replace(/[^a-z0-9_-]/gi, "_");
}

function tilePalette(tile: number, level: number): { bg: string; fg: string; accent: string; rim: string } {
  const base = TILE_COLORS[tile] || TILE_COLORS[2048];
  return { ...base, rim: MILESTONE_RIMS[Math.min(MILESTONE_RIMS.length - 1, Math.max(0, level - 1))] };
}

function milestoneIcon(item: AchievementIconItem): string {
  const palette = tilePalette(item.tile, item.level);
  const fontSize = item.tile >= 10000 ? 17 : 22;
  const id = svgId(item.id);
  const count = item.count === 1 ? "x1" : `x${item.count}`;
  return `
    <svg viewBox="0 0 96 96" role="img" aria-label="${svgText(item.name)}">
      <defs>
        <radialGradient id="badge-${id}" cx="35%" cy="28%" r="78%">
          <stop offset="0" stop-color="#ffffff"/>
          <stop offset=".16" stop-color="${palette.bg}"/>
          <stop offset=".58" stop-color="${palette.accent}"/>
          <stop offset="1" stop-color="#2f211f"/>
        </radialGradient>
      </defs>
      <circle cx="48" cy="48" r="44" fill="${palette.bg}" opacity=".24"/>
      <circle cx="48" cy="48" r="39" fill="url(#badge-${id})"/>
      <circle cx="48" cy="48" r="34" fill="none" stroke="rgba(255,255,255,.24)" stroke-width="6"/>
      <circle cx="35" cy="28" r="8" fill="#fff" opacity=".86"/>
      <circle cx="48" cy="48" r="${27 + item.level * 2}" fill="none" stroke="${palette.rim}" stroke-width="2.5" opacity=".95"/>
      <text x="48" y="53" text-anchor="middle" font-size="${fontSize}" font-weight="900" fill="${palette.fg}" font-family="Arial,Helvetica,sans-serif">${item.tile}</text>
      <text x="48" y="72" text-anchor="middle" font-size="10" font-weight="900" fill="${palette.fg}" opacity=".95" font-family="Arial,Helvetica,sans-serif">${count}</text>
    </svg>`;
}

function speedrunIcon(item: AchievementIconItem): string {
  const palette = tilePalette(item.tile, Math.min(item.level, 3));
  const rim = SPEEDRUN_RIMS[Math.min(SPEEDRUN_RIMS.length - 1, Math.max(0, item.level - 1))];
  const fontSize = item.tile >= 10000 ? 15 : 19;
  const id = svgId(item.id);
  const marker = item.level >= 5 ? "S+" : item.level >= 4 ? "S" : item.level >= 3 ? "A" : item.level >= 2 ? "B" : "C";
  return `
    <svg viewBox="0 0 96 96" role="img" aria-label="${svgText(item.name)}">
      <defs>
        <radialGradient id="speed-${id}" cx="35%" cy="28%" r="78%">
          <stop offset="0" stop-color="#ffffff"/>
          <stop offset=".14" stop-color="#38bdf8"/>
          <stop offset=".58" stop-color="${palette.accent}"/>
          <stop offset="1" stop-color="#111827"/>
        </radialGradient>
      </defs>
      <circle cx="48" cy="48" r="44" fill="#38bdf8" opacity=".22"/>
      <circle cx="48" cy="48" r="39" fill="url(#speed-${id})"/>
      <circle cx="48" cy="48" r="34" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="6"/>
      <circle cx="48" cy="48" r="28" fill="none" stroke="${rim}" stroke-width="2.5" opacity=".92"/>
      <g stroke="${rim}" stroke-width="2.4" stroke-linecap="round" opacity=".95">
        <path d="M48 15v7"/>
        <path d="M48 74v7"/>
        <path d="M15 48h7"/>
        <path d="M74 48h7"/>
      </g>
      <circle cx="35" cy="28" r="8" fill="#fff" opacity=".86"/>
      <text x="48" y="54" text-anchor="middle" font-size="${fontSize}" font-weight="900" fill="${palette.fg}" font-family="Arial,Helvetica,sans-serif">${item.tile}</text>
      <text x="48" y="72" text-anchor="middle" font-size="9" font-weight="900" fill="${palette.fg}" font-family="Arial,Helvetica,sans-serif">${item.minutes}MIN</text>
      <text x="70" y="27" text-anchor="middle" font-size="10" font-weight="900" fill="${rim}" font-family="Arial,Helvetica,sans-serif">${marker}</text>
    </svg>`;
}

function communityIcon(item: AchievementIconItem): string {
  const id = svgId(item.id);
  return `
    <svg viewBox="0 0 96 96" role="img" aria-label="${svgText(item.name)}">
      <defs>
        <linearGradient id="community-${id}" x1="24" y1="30" x2="72" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#f8e58d"/>
          <stop offset=".5" stop-color="#edc22e"/>
          <stop offset="1" stop-color="#f67c5f"/>
        </linearGradient>
        <filter id="community-shadow-${id}" x="0" y="0" width="96" height="96">
          <feDropShadow dx="0" dy="6" stdDeviation="4" flood-color="#5f5248" flood-opacity=".24"/>
        </filter>
      </defs>
      <rect x="10" y="10" width="76" height="76" rx="16" fill="#bbada0" filter="url(#community-shadow-${id})"/>
      <g fill="#cdc1b4">
        <rect x="17" y="17" width="13" height="13" rx="4"/>
        <rect x="34" y="17" width="13" height="13" rx="4"/>
        <rect x="51" y="17" width="13" height="13" rx="4"/>
        <rect x="68" y="17" width="13" height="13" rx="4"/>
        <rect x="17" y="34" width="13" height="13" rx="4"/>
        <rect x="68" y="34" width="13" height="13" rx="4"/>
        <rect x="17" y="51" width="13" height="13" rx="4"/>
        <rect x="68" y="51" width="13" height="13" rx="4"/>
        <rect x="17" y="68" width="13" height="13" rx="4"/>
        <rect x="34" y="68" width="13" height="13" rx="4"/>
        <rect x="51" y="68" width="13" height="13" rx="4"/>
        <rect x="68" y="68" width="13" height="13" rx="4"/>
      </g>
      <rect x="30" y="32" width="36" height="30" rx="8" fill="url(#community-${id})" stroke="#fff8df" stroke-width="2"/>
      <text x="48" y="53" text-anchor="middle" font-size="17" font-weight="900" fill="#fff8df" font-family="Arial,Helvetica,sans-serif">2048</text>
      <circle cx="70" cy="67" r="11" fill="#3db3d8" stroke="#fff8df" stroke-width="3"/>
      <path d="M66 61l5 6-5 6M71 61l5 6-5 6" fill="none" stroke="#fff8df" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
}

function imageIcon(item: AchievementIconItem): string {
  return `<img src="${svgText(item.imageUrl!)}" alt="${svgText(item.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`;
}

function iconMarkup(item: AchievementIconItem): string {
  if (item.imageUrl) return imageIcon(item);
  if (item.kind === "milestone") return milestoneIcon(item);
  if (item.kind === "speedrun") return speedrunIcon(item);
  return communityIcon(item);
}

function sourceText(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

function sourceLevel(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function ruleParam(rule: unknown, key: string): unknown {
  if (!rule || typeof rule !== "object") return "";
  const params = (rule as { params?: unknown }).params;
  return params && typeof params === "object" ? (params as Record<string, unknown>)[key] : "";
}

function achievementIconItemFor(source: AchievementIconSource): AchievementIconItem | null {
  const id = sourceText(source.id || source.achievement_id);
  const name = sourceText(source.name || source.title);
  const tileMatch = /^tile_(\d+)_count_(\d+)$/u.exec(id);
  if (tileMatch) {
    const tile = Number(tileMatch[1]);
    const count = Number(tileMatch[2]);
    const level = sourceLevel(source.level, count >= 100 ? 3 : count >= 10 ? 2 : 1);
    return {
      id,
      kind: "milestone",
      name: name || (count === 1 ? `首次 ${tile}` : `第 ${count} 次 ${tile}`),
      tile,
      level,
      count
    };
  }
  const rules = Array.isArray(source.rules) ? source.rules : [];
  const tileRule = rules.find((rule) =>
    ["max_tile_reached", "nth_max_tile_reached"].includes(sourceText((rule as { type?: unknown })?.type))
  );
  const seriesTile = /^tile-(\d+)$/u.exec(sourceText(source.seriesId || source.series_id));
  if (tileRule || seriesTile) {
    const tile = Number(ruleParam(tileRule, "tile") || seriesTile?.[1] || 2048);
    const count = Number(ruleParam(tileRule, "count") || 1);
    const level = sourceLevel(source.level, count >= 100 ? 3 : count >= 10 ? 2 : 1);
    return {
      id,
      kind: "milestone",
      name: name || (count === 1 ? `首次 ${tile}` : `第 ${count} 次 ${tile}`),
      tile,
      level,
      count
    };
  }
  const speedMatch = /^speed_(\d+)_under_(\d+)s$/u.exec(id);
  if (speedMatch) {
    const tile = Number(speedMatch[1]);
    const seconds = Number(speedMatch[2]);
    const minutes = Math.max(1, Math.round(seconds / 60));
    return {
      id,
      kind: "speedrun",
      name: name || `${minutes} 分钟内 ${tile}`,
      tile,
      level: sourceLevel(source.level, 1),
      minutes
    };
  }
  if (id === "beta_pioneer") {
    return {
      id,
      kind: "community",
      name: name || "内测先锋",
      tile: 0,
      level: sourceLevel(source.level, 1),
      imageUrl: "/images/beta_pioneer_badge_transparent.png?v=subject-alpha"
    };
  }
  return null;
}

export function achievementIconMarkupFor(source: AchievementIconSource): string | null {
  const item = achievementIconItemFor(source);
  return item ? iconMarkup(item) : null;
}
