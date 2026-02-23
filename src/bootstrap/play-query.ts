export const DEFAULT_PLAY_MODE_KEY = "standard_4x4_pow2_no_undo";

const PLAY_MODE_ALIAS: Record<string, string> = {
  challenge: "capped_4x4_pow2_64_no_undo"
};

type SearchLike = string | URLSearchParams | null | undefined;

function toSearchParams(searchLike: SearchLike): URLSearchParams {
  if (searchLike instanceof URLSearchParams) {
    return searchLike;
  }
  try {
    return new URLSearchParams(searchLike || "");
  } catch (_err) {
    return new URLSearchParams();
  }
}

export function parsePlayModeKey(
  searchLike: SearchLike,
  fallbackModeKey = DEFAULT_PLAY_MODE_KEY
): string {
  const params = toSearchParams(searchLike);
  const raw = params.get("mode_key");
  const key = raw && raw.trim() ? raw.trim() : fallbackModeKey;
  const mapped = PLAY_MODE_ALIAS[String(key || "").toLowerCase()];
  return mapped || key;
}

export function parsePlayChallengeId(searchLike: SearchLike): string {
  const params = toSearchParams(searchLike);
  const raw = params.get("challenge_id");
  return raw && raw.trim() ? raw.trim() : "";
}
