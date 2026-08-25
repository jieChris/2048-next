import type { AccountPaletteProfile } from "../palette/account-palette-repository";

export type ThemePlazaPreviewFamily = "pow2" | "fibonacci";

const POW2_VALUES = [
  2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768,
  65536,
];
const FIBONACCI_VALUES = [
  1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597,
];

function hexToRgba(value: string, alpha: number): string {
  const normalized = value.replace(/^#/u, "");
  if (!/^[0-9A-Fa-f]{6}$/u.test(normalized)) return `rgba(0, 0, 0, ${alpha})`;
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function renderThemePlazaPalettePreview(options: {
  palette: AccountPaletteProfile;
  family?: ThemePlazaPreviewFamily;
  className?: string;
  documentLike?: Document;
}): HTMLElement {
  const documentLike = options.documentLike ?? document;
  const family = options.family ?? "pow2";
  const values = family === "fibonacci" ? FIBONACCI_VALUES : POW2_VALUES;
  const backgrounds =
    family === "fibonacci" ? options.palette.fibonacci : options.palette.pow2;
  const textColors =
    family === "fibonacci"
      ? options.palette.fibonacciText
      : options.palette.pow2Text;
  const borders =
    family === "fibonacci"
      ? options.palette.fibonacciBorder
      : options.palette.pow2Border;
  const glows =
    family === "fibonacci"
      ? options.palette.fibonacciGlow
      : options.palette.pow2Glow;

  const board = documentLike.createElement("div");
  board.className = ["theme-plaza-preview", options.className]
    .filter(Boolean)
    .join(" ");
  board.dataset.previewFamily = family;
  board.setAttribute("role", "img");
  board.setAttribute(
    "aria-label",
    family === "fibonacci" ? "Fibonacci 色板预览" : "2 的幂色板预览",
  );

  values.forEach((value, index) => {
    const tile = documentLike.createElement("span");
    tile.className = "theme-plaza-preview-tile";
    tile.textContent = String(value);
    const background = backgrounds[index] || "#CDC1B4";
    const textColor = textColors[index] || "#776E65";
    const border = borders[index] || "transparent";
    const glow = glows[index] || "transparent";
    const multiplier = options.palette.glowMultipliers[index] ?? 100;
    const intensity = Math.min(
      100,
      Math.max(0, (options.palette.glowIntensity * multiplier) / 100),
    );
    tile.style.backgroundColor = background;
    tile.style.color = textColor;
    tile.style.borderColor = border === "transparent" ? "transparent" : border;
    tile.style.boxShadow =
      glow === "transparent" || intensity <= 0
        ? "none"
        : `0 0 ${Math.max(2, Math.round((18 * intensity) / 100))}px ${hexToRgba(glow, Math.max(0.12, intensity / 100))}`;
    board.append(tile);
  });
  return board;
}
