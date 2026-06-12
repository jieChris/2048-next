import {
  buildApiBaseCandidates,
  createJsonApiClient,
  type JsonApiClient,
  type JsonRecord
} from "./api-client";

export interface Stone2kRunsQuery {
  names?: string;
  sortValue?: string;
  startAt?: string;
  endAt?: string;
  limit?: number;
  latestOnly?: boolean;
}

export interface Stone2kMonitorService {
  listRuns: (query: Stone2kRunsQuery) => Promise<JsonRecord>;
}

export interface Stone2kMonitorServiceOptions {
  client?: JsonApiClient;
  request?: JsonApiClient["request"];
  windowLike?: Window | null | undefined;
}

function clampLimit(value: unknown): number {
  const limit = Math.floor(Number(value));
  if (!Number.isFinite(limit)) return 50;
  return Math.max(1, Math.min(200, limit));
}

function toText(value: unknown): string {
  return value == null ? "" : String(value);
}

function toIsoInput(value: string): string {
  return new Date(value).toISOString();
}

export function buildStone2kRunsPath(query: Stone2kRunsQuery): string {
  const params = new URLSearchParams();
  const sortValue = toText(query.sortValue || "score_desc");
  const sortParts = sortValue.split("_");

  params.set("limit", String(clampLimit(query.limit ?? 50)));
  params.set("count", "true");
  if (query.names) params.set("names", query.names);
  params.set("sort_by", sortParts[0] === "time" ? "time" : "score");
  params.set("sort_order", sortParts[1] === "asc" ? "asc" : "desc");
  if (query.startAt) params.set("start_at", toIsoInput(query.startAt));
  if (query.endAt) params.set("end_at", toIsoInput(query.endAt));
  if (query.latestOnly) params.set("latest_only", "true");

  return "/stone-2k/runs?" + params.toString();
}

export function createStone2kMonitorService(
  options: Stone2kMonitorServiceOptions = {}
): Stone2kMonitorService {
  const windowLike = options.windowLike || (typeof window !== "undefined" ? window : null);
  const request =
    options.request ||
    options.client?.request ||
    createJsonApiClient({
      bases: buildApiBaseCandidates({
        locationLike: windowLike?.location
      })
    }).request;

  return {
    listRuns(query) {
      return request(buildStone2kRunsPath(query), { method: "GET" });
    }
  };
}
