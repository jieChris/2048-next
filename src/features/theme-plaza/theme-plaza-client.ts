import { buildApiBaseCandidates } from "../../services/api-base";
import { fetchWithAuth } from "../../services/auth-session";
import {
  parseAccountPaletteDocument,
  parseAccountPaletteRemote,
  type AccountPaletteProfile,
  type AccountPaletteRemoteState,
} from "../palette/account-palette-repository";

export type ThemePlazaSort = "latest" | "most_referenced" | "most_liked";

export interface ThemePlazaCapabilities {
  readEnabled: boolean;
  writeEnabled: boolean;
  reactionEnabled: boolean;
  saveEnabled: boolean;
  shareEnabled: boolean;
  autoPublishEnabled: boolean;
  paletteFormat3Enabled: boolean;
}

export interface ThemePlazaListing {
  id: number;
  version: {
    id: number;
    revision: number;
    title: string;
    palette: AccountPaletteProfile;
    publishedAt: string;
  };
  author: {
    nickname: string;
    publicProfileId: number | null;
  };
  stats: {
    likes: number;
    dislikes: number;
    references: number;
  };
  viewer: {
    vote: -1 | 0 | 1;
    saved: boolean;
    owned: boolean;
  };
}

export interface ThemePlazaListResult {
  items: ThemePlazaListing[];
  nextCursor: string | null;
  capabilities: ThemePlazaCapabilities;
}

export interface ThemePlazaMyShare {
  id?: number;
  published_version_id?: number | null;
  pending_version_id?: number | null;
  published_revision_no?: number | null;
  published_title?: string | null;
  published_status?: string | null;
  published_at?: string | null;
  pending_id?: number | null;
  pending_revision_no?: number | null;
  pending_title?: string | null;
  pending_status?: string | null;
  pending_reason_code?: string | null;
  pending_submitted_at?: string | null;
}

export class ThemePlazaClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly capabilities: ThemePlazaCapabilities | null;

  constructor(
    code: string,
    status: number,
    message: string,
    capabilities: ThemePlazaCapabilities | null = null,
  ) {
    super(message);
    this.name = "ThemePlazaClientError";
    this.code = code;
    this.status = status;
    this.capabilities = capabilities;
  }
}

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function text(value: unknown): string {
  return value == null ? "" : String(value);
}

function safeInteger(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function boolean(value: unknown): boolean {
  return value === true;
}

export function parseThemePlazaCapabilities(
  value: unknown,
): ThemePlazaCapabilities | null {
  const source = record(value);
  if (!source) return null;
  return {
    readEnabled: boolean(source.readEnabled),
    writeEnabled: boolean(source.writeEnabled),
    reactionEnabled: boolean(source.reactionEnabled),
    saveEnabled: boolean(source.saveEnabled),
    shareEnabled: boolean(source.shareEnabled),
    autoPublishEnabled: boolean(source.autoPublishEnabled),
    paletteFormat3Enabled: boolean(source.paletteFormat3Enabled),
  };
}

export function parseThemePlazaListing(
  value: unknown,
): ThemePlazaListing | null {
  const source = record(value);
  const version = record(source?.version);
  const author = record(source?.author);
  const stats = record(source?.stats);
  const viewer = record(source?.viewer);
  const id = safeInteger(source?.id);
  const versionId = safeInteger(version?.id);
  const revision = safeInteger(version?.revision);
  const title = text(version?.title).trim();
  const publishedAt = text(version?.publishedAt).trim();
  const publicProfileId =
    author?.publicProfileId == null
      ? null
      : safeInteger(author.publicProfileId);
  const vote = Number(viewer?.vote);
  const wrapped = parseAccountPaletteDocument({
    schema: 1,
    format: 3,
    activePaletteId: "public",
    palettes: [version?.palette],
  });
  const palette = wrapped?.palettes[0] ?? null;
  if (
    id == null ||
    id <= 0 ||
    versionId == null ||
    versionId <= 0 ||
    revision == null ||
    revision <= 0 ||
    !title ||
    !publishedAt ||
    !palette ||
    (vote !== -1 && vote !== 0 && vote !== 1) ||
    (author?.publicProfileId != null && publicProfileId == null)
  ) {
    return null;
  }
  return {
    id,
    version: { id: versionId, revision, title, palette, publishedAt },
    author: {
      nickname: text(author?.nickname).trim() || "玩家",
      publicProfileId,
    },
    stats: {
      likes: Math.max(0, safeInteger(stats?.likes) ?? 0),
      dislikes: Math.max(0, safeInteger(stats?.dislikes) ?? 0),
      references: Math.max(0, safeInteger(stats?.references) ?? 0),
    },
    viewer: {
      vote: vote as -1 | 0 | 1,
      saved: boolean(viewer?.saved),
      owned: boolean(viewer?.owned),
    },
  };
}

function parseMyShare(value: unknown): ThemePlazaMyShare | null {
  if (value == null) return null;
  const source = record(value);
  return source ? ({ ...source } as ThemePlazaMyShare) : null;
}

export interface ThemePlazaSaveResult extends AccountPaletteRemoteState {
  paletteId: string;
  copyCreated: boolean;
  firstReference: boolean;
  currentSaved: boolean;
}

export interface ThemePlazaClient {
  capabilities(): Promise<ThemePlazaCapabilities>;
  list(input?: {
    sort?: ThemePlazaSort;
    query?: string;
    cursor?: string;
    limit?: number;
  }): Promise<ThemePlazaListResult>;
  detail(
    listingId: number,
  ): Promise<{ item: ThemePlazaListing; capabilities: ThemePlazaCapabilities }>;
  myShare(): Promise<{
    state: ThemePlazaMyShare | null;
    capabilities: ThemePlazaCapabilities;
  }>;
  submit(input: {
    paletteId: string;
    title: string;
    revision: number;
  }): Promise<JsonRecord>;
  cancelSubmission(versionId: number): Promise<JsonRecord>;
  withdraw(): Promise<JsonRecord>;
  vote(versionId: number, value: -1 | 0 | 1): Promise<JsonRecord>;
  save(
    versionId: number,
    input: { revision: number; idempotencyKey: string },
  ): Promise<ThemePlazaSaveResult>;
  report(
    versionId: number,
    input: { category: string; note?: string },
  ): Promise<JsonRecord>;
}

export function createThemePlazaClient(
  options: { bases?: string[]; fetchLike?: typeof fetch } = {},
): ThemePlazaClient {
  const bases = options.bases?.length
    ? options.bases
    : buildApiBaseCandidates({
        locationLike: typeof window === "undefined" ? null : window.location,
      });

  const request = async (
    path: string,
    init: RequestInit = {},
  ): Promise<{ status: number; body: JsonRecord }> => {
    let lastError: unknown = new Error("api_unavailable");
    for (const base of bases) {
      try {
        const response = await fetchWithAuth(
          `${base}${path}`,
          {
            ...init,
            method: init.method || "GET",
            headers: init.headers,
            credentials: "include",
          },
          { bases, fetchLike: options.fetchLike },
        );
        const body = (await response
          .clone()
          .json()
          .catch(() => null)) as JsonRecord | null;
        if (body) return { status: response.status, body };
        lastError = new Error(`HTTP_${response.status}`);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  };

  const unwrap = async (
    path: string,
    init?: RequestInit,
  ): Promise<{
    status: number;
    body: JsonRecord;
    capabilities: ThemePlazaCapabilities | null;
  }> => {
    const result = await request(path, init);
    const capabilities = parseThemePlazaCapabilities(
      result.body.capabilities ?? record(result.body.data)?.capabilities,
    );
    if (result.body.success !== true) {
      throw new ThemePlazaClientError(
        text(result.body.code || "THEME_PLAZA_REQUEST_FAILED"),
        result.status,
        text(result.body.error || "theme plaza request failed"),
        capabilities,
      );
    }
    return { ...result, capabilities };
  };

  return {
    async capabilities() {
      const { body } = await unwrap("/theme-plaza/capabilities");
      const capabilities = parseThemePlazaCapabilities(body.data);
      if (!capabilities)
        throw new ThemePlazaClientError(
          "THEME_PLAZA_RESPONSE_INVALID",
          500,
          "invalid capabilities response",
        );
      return capabilities;
    },
    async list(input = {}) {
      const params = new URLSearchParams();
      if (input.sort) params.set("sort", input.sort);
      if (input.query) params.set("query", input.query);
      if (input.cursor) params.set("cursor", input.cursor);
      if (input.limit) params.set("limit", String(input.limit));
      const { body, capabilities } = await unwrap(
        `/theme-plaza${params.size ? `?${params}` : ""}`,
      );
      const items = Array.isArray(body.data)
        ? body.data.map(parseThemePlazaListing).filter((item) => item !== null)
        : [];
      if (!capabilities)
        throw new ThemePlazaClientError(
          "THEME_PLAZA_RESPONSE_INVALID",
          500,
          "invalid list response",
        );
      return {
        items,
        nextCursor: body.nextCursor == null ? null : text(body.nextCursor),
        capabilities,
      };
    },
    async detail(listingId) {
      const { body, capabilities } = await unwrap(
        `/theme-plaza/${encodeURIComponent(String(listingId))}`,
      );
      const item = parseThemePlazaListing(body.data);
      if (!item || !capabilities)
        throw new ThemePlazaClientError(
          "THEME_PLAZA_RESPONSE_INVALID",
          500,
          "invalid detail response",
        );
      return { item, capabilities };
    },
    async myShare() {
      const { body, capabilities } = await unwrap("/theme-plaza/me");
      if (!capabilities)
        throw new ThemePlazaClientError(
          "THEME_PLAZA_RESPONSE_INVALID",
          500,
          "invalid author state response",
        );
      return { state: parseMyShare(body.data), capabilities };
    },
    async submit(input) {
      const { body } = await unwrap("/theme-plaza/me/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          palette_id: input.paletteId,
          title: input.title,
          revision: input.revision,
        }),
      });
      return record(body.data) ?? {};
    },
    async cancelSubmission(versionId) {
      const { body } = await unwrap(
        `/theme-plaza/me/submissions/${encodeURIComponent(String(versionId))}`,
        { method: "DELETE" },
      );
      return record(body.data) ?? {};
    },
    async withdraw() {
      const { body } = await unwrap("/theme-plaza/me/publication", {
        method: "DELETE",
      });
      return record(body.data) ?? {};
    },
    async vote(versionId, value) {
      const { body } = await unwrap(
        `/theme-plaza/versions/${encodeURIComponent(String(versionId))}/vote`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value }),
        },
      );
      return record(body.data) ?? {};
    },
    async save(versionId, input) {
      const { body } = await unwrap(
        `/theme-plaza/versions/${encodeURIComponent(String(versionId))}/save`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": input.idempotencyKey,
          },
          body: JSON.stringify({ revision: input.revision }),
        },
      );
      const data = record(body.data);
      const remote = parseAccountPaletteRemote(data);
      const paletteId = text(data?.palette_id);
      if (!remote || !paletteId)
        throw new ThemePlazaClientError(
          "THEME_PLAZA_RESPONSE_INVALID",
          500,
          "invalid save response",
        );
      return {
        ...remote,
        paletteId,
        copyCreated: boolean(data?.copy_created),
        firstReference: boolean(data?.first_reference),
        currentSaved: boolean(data?.current_saved),
      };
    },
    async report(versionId, input) {
      const { body } = await unwrap(
        `/theme-plaza/versions/${encodeURIComponent(String(versionId))}/reports`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      return record(body.data) ?? {};
    },
  };
}
