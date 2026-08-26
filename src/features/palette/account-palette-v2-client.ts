import { buildApiBaseCandidates } from "../../services/api-base";
import { fetchWithAuth } from "../../services/auth-session";
import type {
  PaletteOutboxOperation,
  PaletteOutboxSendResult,
} from "./account-palette-outbox";

export interface AccountPaletteV2ClientOptions {
  bases?: string[];
  fetchLike?: typeof fetch;
  storageLike?: Storage | null;
}

export interface AccountPaletteV2Client {
  send(operation: PaletteOutboxOperation): Promise<PaletteOutboxSendResult>;
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

function codeFromBody(body: JsonRecord | null, fallback: string): string {
  return text(body?.code || body?.error || fallback).trim() || fallback;
}

function operationPalette(operation: PaletteOutboxOperation): JsonRecord {
  const palette = record(operation.payload.palette);
  return palette || operation.payload;
}

function operationAllowDuplicate(operation: PaletteOutboxOperation): boolean {
  return operation.payload.allowDuplicate === true;
}

function parseWriteResult(
  body: JsonRecord | null,
  operationKind: PaletteOutboxOperation["kind"],
): PaletteOutboxSendResult | null {
  const data = record(body?.data);
  if (!data) return null;
  if (operationKind === "selection" || operationKind === "order") {
    const revision = Number(data.revision);
    const selection = record(data.selection);
    return {
      status: "saved",
      revision: Number.isSafeInteger(revision) ? revision : undefined,
      paletteId: null,
      selection:
        operationKind === "selection" && selection
          ? {
              kind: text(selection.kind),
              paletteId:
                selection.paletteId == null
                  ? null
                  : text(selection.paletteId),
            }
          : undefined,
      paletteIds:
        operationKind === "order" && Array.isArray(data.paletteIds)
          ? data.paletteIds.map(text).filter(Boolean)
          : undefined,
    };
  }
  const status = text(data.status) as PaletteOutboxSendResult["status"];
  const valid = [
    "saved",
    "merged",
    "unchanged",
    "conflict_copy",
    "duplicate_existing",
    "capacity_full",
    "base_revision_expired",
    "deleted",
  ];
  if (!data || !valid.includes(status)) return null;
  const paletteRecord = record(data.palette);
  const palette = record(paletteRecord?.palette);
  return {
    ...data,
    status,
    revision: Number.isSafeInteger(Number(paletteRecord?.revision))
      ? Number(paletteRecord?.revision)
      : undefined,
    palette: palette || undefined,
    paletteId:
      data.paletteId == null
        ? paletteRecord?.paletteId == null
          ? null
          : text(paletteRecord.paletteId)
        : text(data.paletteId),
    existingPaletteId:
      data.existingPaletteId == null ? null : text(data.existingPaletteId),
    conflictCopyId:
      data.conflictCopyId == null ? null : text(data.conflictCopyId),
    reason: data.reason == null ? null : text(data.reason),
    code: undefined,
  };
}

function makeError(
  message: string,
  code: string,
  status?: number,
): Error & { code?: string; status?: number } {
  return Object.assign(new Error(message), { code, status });
}

export function createAccountPaletteV2Client(
  options: AccountPaletteV2ClientOptions = {},
): AccountPaletteV2Client {
  const bases = options.bases?.length
    ? options.bases
        .map((base) => String(base).replace(/\/+$/u, ""))
        .filter(Boolean)
    : buildApiBaseCandidates({
        locationLike: typeof window === "undefined" ? null : window.location,
      });
  const base = bases[0] || "";

  async function request(
    operation: PaletteOutboxOperation,
  ): Promise<PaletteOutboxSendResult> {
    let path: string;
    let method: "POST" | "PUT" | "DELETE";
    let body: Record<string, unknown> | undefined;
    if (operation.kind === "create") {
      path = "/me/palettes";
      method = "POST";
      body = {
        operationId: operation.operationId,
        paletteId: operation.paletteId,
        palette: operationPalette(operation),
        allowDuplicate: operationAllowDuplicate(operation),
      };
    } else if (operation.kind === "save") {
      path = `/me/palettes/${encodeURIComponent(operation.paletteId)}`;
      method = "PUT";
      body = {
        operationId: operation.operationId,
        baseRevision: operation.baseRevision,
        palette: operationPalette(operation),
        allowDuplicate: operationAllowDuplicate(operation),
      };
    } else if (operation.kind === "delete") {
      path = `/me/palettes/${encodeURIComponent(operation.paletteId)}`;
      method = "DELETE";
      body = {
        operationId: operation.operationId,
        baseRevision: operation.baseRevision,
      };
    } else if (operation.kind === "selection") {
      path = "/me/palette-selection";
      method = "PUT";
      body = {
        operationId: operation.operationId,
        ...(operation.payload.request || operation.payload),
      };
    } else {
      path = "/me/palette-order";
      method = "PUT";
      body = {
        operationId: operation.operationId,
        ...(operation.payload.request || operation.payload),
      };
    }

    let response: Response;
    try {
      response = await fetchWithAuth(
        `${base}${path}`,
        {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          credentials: "include",
        },
        {
          bases,
          fetchLike: options.fetchLike,
          storageLike: options.storageLike || undefined,
        },
      );
    } catch (error) {
      throw makeError(
        error instanceof Error ? error.message : "palette_api_network_error",
        "NETWORK_ERROR",
      );
    }

    const bodyJson = record(
      await response
        .clone()
        .json()
        .catch(() => null),
    );
    const result = parseWriteResult(bodyJson, operation.kind);
    if (bodyJson?.success === true && result) return result;

    const code = codeFromBody(bodyJson, `HTTP_${response.status}`);
    const upper = code.toUpperCase();
    if (
      upper === "PALETTE_NOT_FOUND" ||
      upper === "PALETTE_ID_TOMBSTONED" ||
      upper === "PALETTE_NOT_ACTIVE"
    ) {
      return { status: "expired_operation", code, reason: "deleted_identity" };
    }
    if (upper === "PALETTE_OPERATION_EXPIRED") {
      return { status: "expired_operation", code, reason: "operation_expired" };
    }
    if (
      upper === "TOKEN_EXPIRED" ||
      upper === "SESSION_REVOKED" ||
      upper === "ACCOUNT_INACTIVE" ||
      upper === "INVALID_TOKEN" ||
      upper === "UNAUTHORIZED"
    ) {
      return { status: "paused_account", code };
    }
    if (response.status === 409 && upper === "PALETTE_OPERATION_IN_PROGRESS") {
      return { status: "transient", code, reason: "operation_in_progress" };
    }
    if (
      response.status === 409 &&
      upper === "PALETTE_OPERATION_HASH_CONFLICT"
    ) {
      return { status: "expired_operation", code };
    }
    throw makeError(text(bodyJson?.error || code), code, response.status);
  }

  return { send: request };
}
