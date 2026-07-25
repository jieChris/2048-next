export const SOUND_EFFECTS_STORAGE_KEY =
  "2048-next.app.sound-effects-v1";
export const HAPTICS_STORAGE_KEY = "2048-next.app.haptics-v1";
export const BGM_STORAGE_KEY = "2048-next.app.bgm-v1";

export function resolveTogglePreference(
  value: string | null,
  fallback: boolean,
): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}
