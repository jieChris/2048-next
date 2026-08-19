export interface LocationLike {
  origin?: string;
}

export interface BuildApiBaseCandidatesOptions {
  locationLike?: LocationLike | null | undefined;
  remoteApiBase?: string;
}

const DEFAULT_REMOTE_API_BASE = "https://2048next.cn/api";

export function normalizeApiBase(value: string): string {
  return value.replace(/\/+$/u, "");
}

export function buildApiBaseCandidates(options: BuildApiBaseCandidatesOptions = {}): string[] {
  const remoteApiBase = normalizeApiBase(options.remoteApiBase || DEFAULT_REMOTE_API_BASE);
  const origin = String(
    options.locationLike?.origin || (typeof window !== "undefined" ? window.location.origin : "")
  ).replace(/\/+$/u, "");
  const bases = origin ? [`${origin}/api`, remoteApiBase] : [remoteApiBase];
  return Array.from(new Set(bases.map(normalizeApiBase).filter(Boolean)));
}
