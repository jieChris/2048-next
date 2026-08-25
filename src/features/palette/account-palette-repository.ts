import { buildApiBaseCandidates } from "../../services/api-base";
import { fetchWithAuth } from "../../services/auth-session";

export const APP_PALETTE_FORMAT = 3 as const;
export const APP_PALETTE_MAX_PROFILES = 8;
export const APP_PALETTE_FORMAT_HEADER = "X-2048-Palette-Format";

const TILE_VALUES = [
  2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768,
  65536,
] as const;
const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/u;
const STYLE_LENGTHS = {
  pow2: 26,
  fibonacci: 16,
  pow2Text: 26,
  fibonacciText: 16,
  pow2Border: 26,
  fibonacciBorder: 16,
  pow2Glow: 26,
  fibonacciGlow: 16,
} as const;
const STYLE_FIELDS = Object.keys(STYLE_LENGTHS) as Array<
  keyof typeof STYLE_LENGTHS
>;
const KNOWN_DOCUMENT_FIELDS = new Set([
  "schema",
  "format",
  "activePaletteId",
  "palettes",
]);
const KNOWN_PALETTE_FIELDS = new Set([
  "id",
  "name",
  "baseSkin",
  "colors",
  ...STYLE_FIELDS,
  "glowIntensity",
  "glowMultipliers",
  "createdAt",
  "updatedAt",
]);

type JsonRecord = Record<string, unknown>;
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type AccountPaletteOwnerKey = "guest" | `user:${number}`;

export interface AccountPaletteProfile extends JsonRecord {
  id: string;
  name: string;
  baseSkin: string;
  colors: Record<string, string>;
  pow2: string[];
  fibonacci: string[];
  pow2Text: string[];
  fibonacciText: string[];
  pow2Border: string[];
  fibonacciBorder: string[];
  pow2Glow: string[];
  fibonacciGlow: string[];
  glowIntensity: number;
  glowMultipliers: number[];
  createdAt?: number;
  updatedAt?: number;
}

export interface AccountPaletteDocument extends JsonRecord {
  schema: 1;
  format: 3;
  activePaletteId: string | null;
  palettes: AccountPaletteProfile[];
}

export interface AccountPaletteRemoteState {
  document: AccountPaletteDocument;
  revision: number;
  updatedAt: string | null;
  supportedFormats: number[];
  sourceFormat: 2 | 3;
}

export interface AccountPaletteRepositorySnapshot {
  ownerKey: AccountPaletteOwnerKey;
  document: AccountPaletteDocument;
  revision: number;
  dirty: boolean;
  conflict: AccountPaletteRemoteState | null;
  format3Supported: boolean | null;
}

export type AccountPaletteSyncResult =
  | "guest"
  | "synced"
  | "conflict"
  | "unsupported"
  | "failed";

export interface AccountPaletteTransport {
  read(): Promise<AccountPaletteRemoteState>;
  write(
    baseRevision: number,
    document: AccountPaletteDocument,
  ): Promise<
    | { status: "saved"; data: AccountPaletteRemoteState }
    | { status: "conflict"; data: AccountPaletteRemoteState }
  >;
}

export interface AccountPaletteRepositoryOptions {
  storage: StorageLike;
  ownerKey: AccountPaletteOwnerKey;
  transport: AccountPaletteTransport;
  applyDocument?: (
    document: AccountPaletteDocument,
    source: "local" | "cloud",
  ) => void;
}

interface StoredAccountPaletteState {
  schema: 1;
  revision: number;
  dirty: boolean;
  document: AccountPaletteDocument;
}

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function clone<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch (error) {
    throw new Error("account_palette_clone_failed", { cause: error });
  }
}

function text(value: unknown): string {
  return value == null ? "" : String(value);
}

function integer(value: unknown, min: number, max: number): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max
    ? parsed
    : null;
}

function normalizeColor(
  value: unknown,
  allowTransparent: boolean,
): string | null {
  const normalized = text(value).trim();
  if (allowTransparent && normalized.toLowerCase() === "transparent")
    return "transparent";
  return COLOR_PATTERN.test(normalized) ? normalized.toUpperCase() : null;
}

function normalizeColorArray(
  value: unknown,
  length: number,
  allowTransparent: boolean,
): string[] | null {
  if (!Array.isArray(value) || value.length !== length) return null;
  const result: string[] = [];
  for (const raw of value) {
    const color = normalizeColor(raw, allowTransparent);
    if (!color) return null;
    result.push(color);
  }
  return result;
}

function copyUnknown(
  source: JsonRecord,
  known: ReadonlySet<string>,
): JsonRecord {
  const output: JsonRecord = {};
  for (const [key, value] of Object.entries(source)) {
    if (!known.has(key)) output[key] = clone(value);
  }
  return output;
}

export function emptyAccountPaletteDocument(): AccountPaletteDocument {
  return { schema: 1, format: 3, activePaletteId: null, palettes: [] };
}

export function parseAccountPaletteDocument(
  value: unknown,
): AccountPaletteDocument | null {
  const source = record(value);
  if (
    source?.schema !== 1 ||
    source.format !== 3 ||
    !Array.isArray(source.palettes) ||
    source.palettes.length > APP_PALETTE_MAX_PROFILES
  ) {
    return null;
  }
  const ids = new Set<string>();
  const palettes: AccountPaletteProfile[] = [];
  for (const raw of source.palettes) {
    const palette = record(raw);
    if (!palette) return null;
    const id = text(palette.id).trim();
    const name = text(palette.name).trim();
    const baseSkin = text(palette.baseSkin).trim() || "web";
    const rawColors = record(palette.colors);
    if (
      !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/u.test(id) ||
      ids.has(id) ||
      !name ||
      Array.from(name).length > 20 ||
      !rawColors
    ) {
      return null;
    }
    const colors: Record<string, string> = {};
    for (const tile of TILE_VALUES) {
      const color = normalizeColor(rawColors[String(tile)], false);
      if (!color) return null;
      colors[String(tile)] = color;
    }
    if (Object.keys(rawColors).length !== TILE_VALUES.length) return null;

    const styles = {} as Record<keyof typeof STYLE_LENGTHS, string[]>;
    for (const field of STYLE_FIELDS) {
      const values = normalizeColorArray(
        palette[field],
        STYLE_LENGTHS[field],
        field.endsWith("Border") || field.endsWith("Glow"),
      );
      if (!values) return null;
      styles[field] = values;
    }
    if (
      TILE_VALUES.some(
        (tile, index) => styles.pow2[index] !== colors[String(tile)],
      )
    )
      return null;
    const glowIntensity = integer(palette.glowIntensity, 0, 100);
    const rawMultipliers = Array.isArray(palette.glowMultipliers)
      ? palette.glowMultipliers
      : [];
    const glowMultipliers = rawMultipliers.map((item) => integer(item, 0, 200));
    if (
      glowIntensity == null ||
      glowMultipliers.length !== 26 ||
      glowMultipliers.some((item) => item == null)
    )
      return null;

    const createdAt =
      palette.createdAt === undefined
        ? undefined
        : integer(palette.createdAt, 0, Number.MAX_SAFE_INTEGER);
    const updatedAt =
      palette.updatedAt === undefined
        ? undefined
        : integer(palette.updatedAt, 0, Number.MAX_SAFE_INTEGER);
    if (
      (palette.createdAt !== undefined && createdAt == null) ||
      (palette.updatedAt !== undefined && updatedAt == null)
    )
      return null;

    palettes.push({
      ...copyUnknown(palette, KNOWN_PALETTE_FIELDS),
      id,
      name,
      baseSkin,
      colors,
      ...styles,
      glowIntensity,
      glowMultipliers: glowMultipliers as number[],
      ...(createdAt == null ? {} : { createdAt }),
      ...(updatedAt == null ? {} : { updatedAt }),
    });
    ids.add(id);
  }
  const activePaletteId =
    source.activePaletteId == null ? null : text(source.activePaletteId).trim();
  if (activePaletteId !== null && !ids.has(activePaletteId)) return null;
  return {
    ...copyUnknown(source, KNOWN_DOCUMENT_FIELDS),
    schema: 1,
    format: 3,
    activePaletteId,
    palettes,
  };
}

export function parseAccountPaletteRemote(
  value: unknown,
): AccountPaletteRemoteState | null {
  const source = record(value);
  const document = parseAccountPaletteDocument(source?.document);
  const revision = integer(source?.revision, 0, Number.MAX_SAFE_INTEGER);
  const supportedFormats = Array.isArray(source?.supportedFormats)
    ? source.supportedFormats.map(Number).filter(Number.isSafeInteger)
    : [];
  const sourceFormat = integer(source?.sourceFormat, 2, 3);
  if (!document || revision == null || sourceFormat == null) return null;
  return {
    document,
    revision,
    updatedAt: source?.updatedAt == null ? null : text(source.updatedAt),
    supportedFormats,
    sourceFormat: sourceFormat as 2 | 3,
  };
}

export function mergeUnknownAccountPaletteFields(
  local: AccountPaletteDocument,
  cloud: AccountPaletteDocument,
): AccountPaletteDocument {
  const cloudById = new Map(
    cloud.palettes.map((palette) => [palette.id, palette]),
  );
  return {
    ...copyUnknown(cloud, KNOWN_DOCUMENT_FIELDS),
    ...local,
    palettes: local.palettes.map((palette) => ({
      ...copyUnknown(cloudById.get(palette.id) ?? {}, KNOWN_PALETTE_FIELDS),
      ...palette,
    })),
  };
}

type CanonicalJsonValue =
  | null
  | boolean
  | number
  | string
  | CanonicalJsonValue[]
  | { [key: string]: CanonicalJsonValue };

function canonicalJson(value: unknown): CanonicalJsonValue {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalJson);
  const object = record(value);
  if (!object) throw new Error("invalid_account_palette_json_value");
  return Object.fromEntries(
    Object.keys(object)
      .sort((left, right) => left.localeCompare(right))
      .map((key) => [key, canonicalJson(object[key])]),
  );
}

const NON_AUTHORITATIVE_PALETTE_FIELDS = new Set([
  "source",
  "locked",
  "createdAt",
  "updatedAt",
]);

function syncComparableDocument(
  document: AccountPaletteDocument,
): AccountPaletteDocument {
  return {
    ...document,
    palettes: document.palettes.map((palette) => {
      const comparable = { ...palette } as JsonRecord;
      for (const field of NON_AUTHORITATIVE_PALETTE_FIELDS) {
        delete comparable[field];
      }
      return comparable as AccountPaletteProfile;
    }),
  };
}

function documentsEqual(
  left: AccountPaletteDocument,
  right: AccountPaletteDocument,
): boolean {
  return (
    JSON.stringify(canonicalJson(syncComparableDocument(left))) ===
    JSON.stringify(canonicalJson(syncComparableDocument(right)))
  );
}

function legacyBaseDocument(document: AccountPaletteDocument): CanonicalJsonValue {
  return {
    schema: 1,
    activePaletteId: document.activePaletteId,
    palettes: document.palettes.map((palette) => ({
      id: palette.id,
      name: palette.name,
      baseSkin: palette.baseSkin,
      colors: canonicalJson(palette.colors),
    })),
  };
}

function matchesProjectedLegacyDocument(
  local: AccountPaletteDocument,
  remote: AccountPaletteRemoteState,
): boolean {
  return (
    remote.sourceFormat === 2 &&
    JSON.stringify(legacyBaseDocument(local)) ===
      JSON.stringify(legacyBaseDocument(remote.document))
  );
}

function isEmptyDocument(document: AccountPaletteDocument): boolean {
  return document.activePaletteId === null && document.palettes.length === 0;
}

function localKey(ownerKey: AccountPaletteOwnerKey): string {
  return `account_palette_repository_v1:${ownerKey}`;
}

function readLocalState(
  storage: StorageLike,
  ownerKey: AccountPaletteOwnerKey,
): StoredAccountPaletteState {
  try {
    const raw = storage.getItem(localKey(ownerKey));
    const parsed = raw ? record(JSON.parse(raw)) : null;
    const document = parseAccountPaletteDocument(parsed?.document);
    const revision = integer(parsed?.revision, 0, Number.MAX_SAFE_INTEGER);
    if (parsed?.schema === 1 && document && revision != null) {
      return { schema: 1, revision, dirty: parsed.dirty === true, document };
    }
  } catch (error) {
    console.warn(
      "account palette local state reset",
      error instanceof Error ? error.message : "invalid_local_state",
    );
    storage.removeItem(localKey(ownerKey));
  }
  return {
    schema: 1,
    revision: 0,
    dirty: false,
    document: emptyAccountPaletteDocument(),
  };
}

function writeLocalState(
  storage: StorageLike,
  ownerKey: AccountPaletteOwnerKey,
  state: StoredAccountPaletteState,
): void {
  storage.setItem(localKey(ownerKey), JSON.stringify(state));
}

export class AccountPaletteRepository {
  readonly #options: AccountPaletteRepositoryOptions;
  #ownerKey: AccountPaletteOwnerKey;
  #state: StoredAccountPaletteState;
  #conflict: AccountPaletteRemoteState | null = null;
  #format3Supported: boolean | null = null;

  constructor(options: AccountPaletteRepositoryOptions) {
    this.#options = options;
    this.#ownerKey = options.ownerKey;
    this.#state = readLocalState(options.storage, options.ownerKey);
    this.#apply("local");
  }

  snapshot(): AccountPaletteRepositorySnapshot {
    return {
      ownerKey: this.#ownerKey,
      document: clone(this.#state.document),
      revision: this.#state.revision,
      dirty: this.#state.dirty,
      conflict: this.#conflict ? clone(this.#conflict) : null,
      format3Supported: this.#format3Supported,
    };
  }

  switchOwner(ownerKey: AccountPaletteOwnerKey, promoteGuest = false): void {
    if (ownerKey === this.#ownerKey) return;
    const guestState = this.#ownerKey === "guest" ? this.#state : null;
    this.#ownerKey = ownerKey;
    this.#state = readLocalState(this.#options.storage, ownerKey);
    if (
      promoteGuest &&
      ownerKey.startsWith("user:") &&
      this.#state.revision === 0 &&
      this.#state.document.palettes.length === 0 &&
      guestState &&
      guestState.document.palettes.length > 0
    ) {
      this.#state = {
        schema: 1,
        revision: 0,
        dirty: true,
        document: clone(guestState.document),
      };
      this.#persist();
    }
    this.#conflict = null;
    this.#format3Supported = null;
    this.#apply("local");
  }

  setDocument(value: AccountPaletteDocument): void {
    const document = parseAccountPaletteDocument(value);
    if (!document) throw new Error("invalid_app_palette_document");
    this.#state = { ...this.#state, dirty: true, document };
    this.#conflict = null;
    this.#persist();
    this.#apply("local");
  }

  async sync(): Promise<AccountPaletteSyncResult> {
    if (!this.#ownerKey.startsWith("user:")) return "guest";
    try {
      if (this.#state.dirty) {
        if (this.#format3Supported !== true) {
          const capability = await this.#options.transport.read();
          this.#format3Supported =
            capability.supportedFormats.includes(APP_PALETTE_FORMAT);
          if (!this.#format3Supported) return "unsupported";
          if (this.#state.revision === 0 && capability.revision > 0) {
            const mergedDocument = mergeUnknownAccountPaletteFields(
              this.#state.document,
              capability.document,
            );
            if (
              documentsEqual(mergedDocument, capability.document) ||
              isEmptyDocument(this.#state.document)
            ) {
              this.#acceptRemote(capability);
              return "synced";
            }
            if (
              isEmptyDocument(capability.document) ||
              matchesProjectedLegacyDocument(this.#state.document, capability)
            ) {
              this.#state = {
                ...this.#state,
                revision: capability.revision,
                document: mergedDocument,
              };
            }
          }
          this.#state = {
            ...this.#state,
            document: mergeUnknownAccountPaletteFields(
              this.#state.document,
              capability.document,
            ),
          };
        }
        let result = await this.#options.transport.write(
          this.#state.revision,
          clone(this.#state.document),
        );
        this.#format3Supported =
          result.data.supportedFormats.includes(APP_PALETTE_FORMAT);
        if (result.status === "conflict") {
          const mergedDocument = mergeUnknownAccountPaletteFields(
            this.#state.document,
            result.data.document,
          );
          if (
            documentsEqual(mergedDocument, result.data.document) ||
            (this.#state.revision === 0 &&
              isEmptyDocument(this.#state.document))
          ) {
            this.#acceptRemote(result.data);
            return "synced";
          }
          if (
            this.#state.revision === 0 &&
            result.data.revision > 0 &&
            (isEmptyDocument(result.data.document) ||
              matchesProjectedLegacyDocument(this.#state.document, result.data))
          ) {
            this.#state = {
              ...this.#state,
              revision: result.data.revision,
              document: mergedDocument,
            };
            this.#persist();
            result = await this.#options.transport.write(
              this.#state.revision,
              clone(this.#state.document),
            );
            this.#format3Supported =
              result.data.supportedFormats.includes(APP_PALETTE_FORMAT);
            if (result.status === "saved") {
              this.#acceptRemote(result.data);
              return "synced";
            }
            const retriedDocument = mergeUnknownAccountPaletteFields(
              this.#state.document,
              result.data.document,
            );
            if (documentsEqual(retriedDocument, result.data.document)) {
              this.#acceptRemote(result.data);
              return "synced";
            }
          }
          this.#conflict = result.data;
          return "conflict";
        }
        this.#acceptRemote(result.data);
      } else {
        this.#acceptRemote(await this.#options.transport.read());
      }
      return "synced";
    } catch {
      return "failed";
    }
  }

  acceptRemote(remote: AccountPaletteRemoteState): void {
    this.#acceptRemote(remote);
  }

  async resolveConflict(
    choice: "local" | "cloud",
  ): Promise<AccountPaletteSyncResult> {
    if (!this.#conflict) return "failed";
    if (choice === "cloud") {
      this.#acceptRemote(this.#conflict);
      return "synced";
    }
    this.#state = {
      ...this.#state,
      revision: this.#conflict.revision,
      dirty: true,
      document: mergeUnknownAccountPaletteFields(
        this.#state.document,
        this.#conflict.document,
      ),
    };
    this.#conflict = null;
    this.#persist();
    return this.sync();
  }

  #acceptRemote(remote: AccountPaletteRemoteState): void {
    this.#format3Supported =
      remote.supportedFormats.includes(APP_PALETTE_FORMAT);
    this.#state = {
      schema: 1,
      revision: remote.revision,
      dirty: false,
      document: clone(remote.document),
    };
    this.#conflict = null;
    this.#persist();
    this.#apply("cloud");
  }

  #persist(): void {
    writeLocalState(this.#options.storage, this.#ownerKey, this.#state);
  }

  #apply(source: "local" | "cloud"): void {
    this.#options.applyDocument?.(clone(this.#state.document), source);
  }
}

export function createHttpAccountPaletteTransport(
  options: { bases?: string[]; fetchLike?: typeof fetch } = {},
): AccountPaletteTransport {
  const bases = options.bases?.length
    ? options.bases
    : buildApiBaseCandidates({
        locationLike: typeof window === "undefined" ? null : window.location,
      });

  const request = async (
    method: "GET" | "PUT",
    body?: unknown,
  ): Promise<{ response: Response; data: JsonRecord }> => {
    let lastError: unknown = new Error("api_unavailable");
    for (const base of bases) {
      try {
        const response = await fetchWithAuth(
          `${base}/me/app-palettes`,
          {
            method,
            headers: {
              "Content-Type": "application/json",
              [APP_PALETTE_FORMAT_HEADER]: String(APP_PALETTE_FORMAT),
            },
            body: body === undefined ? undefined : JSON.stringify(body),
            credentials: "include",
          },
          { bases, fetchLike: options.fetchLike },
        );
        const data = (await response
          .clone()
          .json()
          .catch(() => null)) as JsonRecord | null;
        if (data) return { response, data };
        lastError = new Error(`HTTP_${response.status}`);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  };

  return {
    async read() {
      const { response, data } = await request("GET");
      const remote = parseAccountPaletteRemote(data.data);
      if (!response.ok || data.success !== true || !remote)
        throw new Error(
          text(data.code || data.error || "invalid_cloud_response"),
        );
      return remote;
    },
    async write(baseRevision, document) {
      const { response, data } = await request("PUT", {
        baseRevision,
        document,
      });
      const remote = parseAccountPaletteRemote(data.data);
      if (
        response.status === 409 &&
        data.code === "PALETTE_REVISION_CONFLICT" &&
        remote
      ) {
        return { status: "conflict", data: remote };
      }
      if (!response.ok || data.success !== true || !remote)
        throw new Error(
          text(data.code || data.error || "palette_write_failed"),
        );
      return { status: "saved", data: remote };
    },
  };
}
