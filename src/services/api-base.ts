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

function isLocalDevelopmentOrigin(origin: string): boolean {
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "::1" || hostname === "[::1]" || hostname.startsWith("127.");
  } catch (_error) {
    return false;
  }
}

export function buildApiBaseCandidates(options: BuildApiBaseCandidatesOptions = {}): string[] {
  const remoteApiBase = normalizeApiBase(options.remoteApiBase || DEFAULT_REMOTE_API_BASE);
  const origin = String(
    options.locationLike?.origin || (typeof window !== "undefined" ? window.location.origin : "")
  ).replace(/\/+$/u, "");
  const bases = origin ? [`${origin}/api`] : [];
  if (!origin || !isLocalDevelopmentOrigin(origin)) bases.push(remoteApiBase);
  return Array.from(new Set(bases.map(normalizeApiBase).filter(Boolean)));
}
