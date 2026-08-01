type AchievementIconKind = "milestone" | "speedrun" | "community" | "easter-egg" | "lost-page";

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
}

const TILE_COLORS: Record<number, { bg: string; fg: string; accent: string }> = {
  2048: { bg: "#edc22e", fg: "#fff8df", accent: "#9f6f00" },
  4096: { bg: "#3db3d8", fg: "#eefbff", accent: "#0e7490" },
  8192: { bg: "#7c6cf0", fg: "#f4f2ff", accent: "#4338ca" },
  16384: { bg: "#dc5f84", fg: "#fff0f5", accent: "#9f1239" },
  32768: { bg: "#2f8f5b", fg: "#ecfdf3", accent: "#166534" },
  65536: { bg: "#37343f", fg: "#f8fafc", accent: "#f59e0b" }
};
const MILESTONE_RIMS = ["#c8ced1", "#e0b94d", "#f8e6a0"] as const;
const SPEEDRUN_LEVELS = [
  { shell: "#eef0f1", rim: "#c8ced1", progress: 40 },
  { shell: "#eaf8fb", rim: "#65c9e2", progress: 52 },
  { shell: "#f1edff", rim: "#a78bfa", progress: 64 },
  { shell: "#fff4d5", rim: "#e6bd4e", progress: 76 },
  { shell: "#fff9e8", rim: "#fff0a0", progress: 88 }
] as const;

function svgText(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] || char));
}

function svgId(value: string): string {
  return value.replace(/[^a-z0-9_-]/gi, "_");
}

function tilePalette(tile: number): { bg: string; fg: string; accent: string } {
  const base = TILE_COLORS[tile] || TILE_COLORS[2048];
  return base;
}

function milestoneStars(level: number): string {
  const count = Math.min(3, Math.max(1, level));
  const start = 48 - ((count - 1) * 9) / 2;
  return Array.from({ length: count }, (_, index) => {
    const x = start + index * 9;
    return `<path class="achievement-tier-star" d="M0-3l.7 2.08h2.15L1.1.35l.66 2.08L0 1.16l-1.76 1.27L-1.1.35l-1.75-1.27H-.7z" transform="translate(${x} 65)" fill="${count === 1 ? "#fff8df" : "#fff0a0"}"/>`;
  }).join("");
}

function milestoneIcon(item: AchievementIconItem): string {
  const palette = tilePalette(item.tile);
  const level = Math.min(3, Math.max(1, item.level));
  const rim = MILESTONE_RIMS[level - 1];
  const fontSize = item.tile >= 10000 ? 13 : 16;
  const id = svgId(item.id);
  return `
    <svg width="96" height="96" viewBox="0 0 96 96" role="img" aria-label="${svgText(item.name)}">
      <defs>
        <filter id="milestone-shadow-${id}" x="-12%" y="-10%" width="124%" height="132%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#140f0b" flood-opacity=".2"/>
        </filter>
      </defs>
      <circle cx="48" cy="50" r="41" fill="#2b2522" opacity=".18" filter="url(#milestone-shadow-${id})"/>
      ${level >= 2 ? `<circle cx="48" cy="48" r="46.5" fill="none" stroke="${palette.bg}" stroke-width="1" opacity=".42"/>` : ""}
      <circle cx="48" cy="48" r="42" fill="#3b3632" stroke="${rim}" stroke-width="${level === 3 ? 5 : 4}"/>
      <circle cx="48" cy="48" r="37.25" fill="${palette.bg}" fill-opacity=".92" stroke="#fff8e8" stroke-width="1.5"/>
      <circle cx="48" cy="48" r="32.25" fill="none" stroke="#fff" stroke-width="1.5" opacity=".34"/>
      <rect x="22" y="22" width="52" height="52" rx="13" fill="${palette.bg}" stroke="#fff8e8" stroke-width="1.5"/>
      <ellipse cx="38" cy="32" rx="9" ry="5" fill="#fff" opacity=".34"/>
      <text x="48" y="53" text-anchor="middle" font-size="${fontSize}" font-weight="800" fill="#fffdf6" font-family="Inter,Arial,Helvetica,sans-serif">${item.tile}</text>
      ${milestoneStars(level)}
    </svg>`;
}

function speedrunTicks(level: number, rim: string): string {
  const tickSets = [
    [[22, 33, 19, 29], [22, 71, 19, 75]],
    [[22, 33, 19, 29], [78, 52, 83, 52], [22, 71, 19, 75]],
    [[22, 33, 19, 29], [68, 28, 72, 24], [68, 76, 72, 80], [22, 71, 19, 75]],
    [[22, 33, 19, 29], [58, 22, 60, 17], [78, 52, 83, 52], [58, 82, 60, 87], [22, 71, 19, 75]]
  ] as const;
  const ticks = tickSets[Math.min(3, Math.max(0, level - 1))];
  return ticks.map(([x1, y1, x2, y2]) =>
    `<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="${rim}" stroke-width="3" stroke-linecap="round"/>`
  ).join("");
}

function speedrunIcon(item: AchievementIconItem): string {
  const palette = tilePalette(item.tile);
  const level = Math.min(5, Math.max(1, item.level));
  const style = SPEEDRUN_LEVELS[level - 1];
  const fontSize = item.tile >= 10000 ? 12 : 16;
  const id = svgId(item.id);
  const arcStart = 180 - (style.progress * 3.6) / 2;
  return `
    <svg width="96" height="96" viewBox="0 0 96 96" role="img" aria-label="${svgText(item.name)}">
      <defs>
        <filter id="speed-shadow-${id}" x="-12%" y="-10%" width="124%" height="132%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#1f1914" flood-opacity=".15"/>
        </filter>
      </defs>
      <rect x="39" y="2" width="18" height="8" rx="3" fill="${style.shell}" stroke="${style.rim}" stroke-width="2"/>
      <rect x="44" y="8" width="8" height="5" rx="2" fill="${style.rim}"/>
      <circle cx="48" cy="53" r="41" fill="#756d66" opacity=".08" filter="url(#speed-shadow-${id})"/>
      <circle cx="48" cy="52" r="40" fill="${style.shell}" stroke="${style.rim}" stroke-width="${level >= 4 ? 4.5 : 4}"/>
      <circle cx="48" cy="52" r="35.35" fill="${palette.bg}" fill-opacity=".9" stroke="#fff8ea" stroke-width="1.3"/>
      <circle cx="48" cy="52" r="31.4" fill="none" stroke="#fff" stroke-width="1.2" opacity=".28"/>
      <circle class="achievement-speedrun-progress" cx="48" cy="52" r="36.5" pathLength="100" fill="none" stroke="${style.rim}" stroke-width="5.5" stroke-dasharray="${style.progress} ${100 - style.progress}" transform="rotate(${arcStart} 48 52)" opacity=".95"/>
      <rect x="23" y="29" width="50" height="44" rx="12" fill="${palette.bg}" stroke="#fff8ea" stroke-width="1.4"/>
      <ellipse cx="37.5" cy="37" rx="8.5" ry="4" fill="#fff" opacity=".3"/>
      <text x="48" y="54" text-anchor="middle" font-size="${fontSize}" font-weight="800" fill="#fffdf7" font-family="Inter,Arial,Helvetica,sans-serif">${item.tile}</text>
      <text x="48" y="68" text-anchor="middle" font-size="8" font-weight="800" fill="#fff5d6" font-family="Inter,Arial,Helvetica,sans-serif">${item.minutes}m</text>
      ${speedrunTicks(level, style.rim)}
      ${level === 5 ? `<path d="M74 18l1.15 3.55h3.73l-3.02 2.19 1.16 3.55L74 25.1l-3.02 2.19 1.16-3.55-3.02-2.19h3.73z" fill="${style.rim}"/>` : ""}
    </svg>`;
}

function communityIcon(item: AchievementIconItem): string {
  const id = svgId(item.id);
  return `
    <svg width="96" height="96" viewBox="0 0 96 96" role="img" aria-label="${svgText(item.name)}">
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

function betaPioneerIcon(item: AchievementIconItem): string {
  const id = svgId(item.id);
  return `
    <svg width="96" height="96" viewBox="0 0 96 96" role="img" aria-label="${svgText(item.name)}">
      <defs>
        <linearGradient id="pioneer-sun-${id}" x1="35" y1="24" x2="63" y2="60" gradientUnits="userSpaceOnUse">
          <stop stop-color="#ffb46d"/><stop offset="1" stop-color="#f67c5f"/>
        </linearGradient>
        <linearGradient id="pioneer-tile-${id}" x1="31" y1="40" x2="67" y2="78" gradientUnits="userSpaceOnUse">
          <stop stop-color="#f8e58d"/><stop offset=".55" stop-color="#edc22e"/><stop offset="1" stop-color="#d69d14"/>
        </linearGradient>
      </defs>
      <circle cx="48" cy="50" r="43" fill="#1e1b1a" opacity=".2"/>
      <circle cx="48" cy="48" r="42" fill="#302b29" stroke="#e5be56" stroke-width="4"/>
      <circle cx="48" cy="48" r="36.25" fill="#35312f" stroke="#fff4d6" stroke-width="1.5"/>
      <circle cx="48" cy="42" r="16" fill="url(#pioneer-sun-${id})"/>
      <path d="M48 20v5M31 26l4 4M65 26l-4 4" fill="none" stroke="#f8e58d" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M23 66c8-7 16-8 25-3s17 3 25-4" fill="none" stroke="#3db3d8" stroke-width="3" stroke-linecap="round"/>
      <path d="M62 35l8-8-1 6 6 1-8 8 1-6z" fill="#3db3d8"/>
      <rect x="30" y="45" width="36" height="33" rx="10" fill="url(#pioneer-tile-${id})" stroke="#fff8df" stroke-width="2"/>
      <rect x="35" y="51" width="26" height="21" rx="7" fill="#3b3531"/>
      <text x="48" y="65" text-anchor="middle" font-size="12" font-weight="800" fill="#fff8df" font-family="Inter,Arial,Helvetica,sans-serif">2048</text>
      <path d="M70 19l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#fff0a0"/>
    </svg>`;
}

function easterEggIcon(item: AchievementIconItem): string {
  const id = svgId(item.id);
  return `
    <svg width="96" height="96" viewBox="0 0 96 96" role="img" aria-label="${svgText(item.name)}">
      <defs>
        <linearGradient id="egg-shell-${id}" x1="23" y1="17" x2="75" y2="84" gradientUnits="userSpaceOnUse">
          <stop stop-color="#fffdf2"/><stop offset=".58" stop-color="#fff3ce"/><stop offset="1" stop-color="#f1d27b"/>
        </linearGradient>
        <clipPath id="egg-bottom-clip-${id}"><path d="M19 47l10-5 9 7 10-6 10 7 10-8 9 5c3 21-9 36-29 37-20-1-32-16-29-37z"/></clipPath>
        <clipPath id="egg-top-clip-${id}"><path d="M19 47c4-17 15-31 29-31s25 14 29 31l-9-5-10 8-10-7-10 6-9-7z"/></clipPath>
      </defs>
      <circle cx="48" cy="50" r="43" fill="#1e1b1a" opacity=".2"/>
      <circle cx="48" cy="48" r="42" fill="#302d2b" stroke="#e9c55c" stroke-width="4"/>
      <circle cx="48" cy="48" r="36.25" fill="#294a55" stroke="#fff4d6" stroke-width="1.5"/>
      <g class="achievement-easter-egg-shells" transform="translate(8.64 8.64) scale(.82)">
        <path class="achievement-easter-egg-full" d="M48 16c-14 0-25 14-29 31-3 21 9 36 29 37 20-1 32-16 29-37-4-17-15-31-29-31z" fill="url(#egg-shell-${id})" stroke="#e2b54e" stroke-width="2.2" opacity="0"/>
        <g class="achievement-easter-egg-bottom">
          <path d="M19 47l10-5 9 7 10-6 10 7 10-8 9 5c3 21-9 36-29 37-20-1-32-16-29-37z" fill="url(#egg-shell-${id})" stroke="#e2b54e" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M16 68c11-5 21 4 32-1s20 4 33-2" fill="none" stroke="#3db3d8" stroke-width="2.6" stroke-linecap="round" opacity=".86" clip-path="url(#egg-bottom-clip-${id})"/>
        </g>
        <g class="achievement-easter-egg-top" transform="rotate(-15 19 47)">
          <path d="M19 47c4-17 15-31 29-31s25 14 29 31l-9-5-10 8-10-7-10 6-9-7z" fill="url(#egg-shell-${id})" stroke="#e2b54e" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M22 33c8-6 16 0 23-7 8-7 17-3 26-7" fill="none" stroke="#f28b82" stroke-width="2.6" stroke-linecap="round" opacity=".82" clip-path="url(#egg-top-clip-${id})"/>
          <path class="achievement-easter-egg-crack" d="M19 47l10-5 9 7 10-6 10 7 10-8 9 5" fill="none" stroke="#3db3d8" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
        </g>
        <path d="M79 20l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#fff8df" stroke="#3db3d8" stroke-width="1.3"/>
      </g>
    </svg>`;
}

function lostPageIcon(item: AchievementIconItem): string {
  return `
    <svg width="96" height="96" viewBox="0 0 96 96" role="img" aria-label="${svgText(item.name)}">
      <circle cx="48" cy="50" r="43" fill="#1e1b1a" opacity=".2"/>
      <circle cx="48" cy="48" r="42" fill="#302b29" stroke="#91d8d3" stroke-width="4"/>
      <circle cx="48" cy="48" r="36.25" fill="#3db3d8" fill-opacity=".22" stroke="#fff8ea" stroke-width="1.5"/>
      <path class="achievement-lost-page-path" d="M27 28h22v12H39v12h20v13H37" fill="none" stroke="#fff8df" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="27" cy="28" r="5" fill="#edc22e" stroke="#fff8df" stroke-width="2"/>
      <path class="achievement-lost-page-pin" d="M65 60c10-11 9-22 0-30-9 8-10 19 0 30z" fill="#f67c5f" stroke="#fff8df" stroke-width="2"/>
      <circle cx="65" cy="40" r="3.5" fill="#fff8df"/>
      <path d="M70 66l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" fill="#edc22e"/>
      <path d="M35 69h17" fill="none" stroke="#3db3d8" stroke-width="4" stroke-linecap="round"/>
    </svg>`;
}

function iconMarkup(item: AchievementIconItem): string {
  if (item.kind === "milestone") return milestoneIcon(item);
  if (item.kind === "speedrun") return speedrunIcon(item);
  if (item.id === "beta_pioneer") return betaPioneerIcon(item);
  if (item.kind === "easter-egg") return easterEggIcon(item);
  if (item.kind === "lost-page") return lostPageIcon(item);
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
      level: sourceLevel(source.level, 1)
    };
  }
  if (id === "easter_egg_breakout_discovered") {
    return {
      id,
      kind: "easter-egg",
      name: name || "发现彩蛋",
      tile: 0,
      level: sourceLevel(source.level, 1)
    };
  }
  if (id === "lost_page_visited") {
    return {
      id,
      kind: "lost-page",
      name: name || "你也曾迷路",
      tile: 0,
      level: sourceLevel(source.level, 1)
    };
  }
  if (sourceText(source.seriesId || source.series_id).startsWith("community-")) {
    return {
      id,
      kind: "community",
      name: name || "活动成就",
      tile: 0,
      level: sourceLevel(source.level, 1)
    };
  }
  return null;
}

export function achievementIconMarkupFor(source: AchievementIconSource): string | null {
  const item = achievementIconItemFor(source);
  return item ? iconMarkup(item) : null;
}
