import { writeStorageValue } from "../../storage/browser-storage";
import type { AccountPaletteDocument } from "./account-palette-repository";

export const WEB_TILE_PALETTE_PROFILES_KEY = "tile_palette_profiles_v1";

export function mirrorAccountPalettesToLegacyWebStorage(
  storage: Storage,
  document: AccountPaletteDocument,
): boolean {
  const profiles = document.palettes.map((palette) => ({
    id: palette.id,
    name: palette.name,
    pow2: [...palette.pow2],
    fibonacci: [...palette.fibonacci],
    pow2Text: [...palette.pow2Text],
    fibonacciText: [...palette.fibonacciText],
    pow2Border: [...palette.pow2Border],
    fibonacciBorder: [...palette.fibonacciBorder],
    pow2Glow: [...palette.pow2Glow],
    fibonacciGlow: [...palette.fibonacciGlow],
    glowIntensity: palette.glowIntensity,
    glowMultipliers: [...palette.glowMultipliers],
    createdAt: palette.createdAt ?? Date.now(),
    updatedAt: palette.updatedAt ?? Date.now(),
    source: "custom",
    locked: false,
  }));
  return writeStorageValue(
    storage,
    WEB_TILE_PALETTE_PROFILES_KEY,
    JSON.stringify(profiles),
  );
}
