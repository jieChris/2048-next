import {
  APP_DATABASE_SCHEMA_VERSION,
  type AppOwnerKey,
  type StoredDiagnostic,
} from "../data/app-database";

export interface ClientDiagnosticsDatabase {
  addDiagnostic(diagnostic: StoredDiagnostic): Promise<void>;
  listDiagnostics(ownerKey: AppOwnerKey): Promise<StoredDiagnostic[]>;
  markDiagnosticUploaded(eventId: string, uploadedAt: number): Promise<boolean>;
}

export interface DiagnosticPlatformInfo {
  appVersion: string;
  buildNumber: string;
  androidVersion: string | null;
  webViewVersion: string | null;
}

export interface ClientDiagnosticsOptions {
  database: ClientDiagnosticsDatabase;
  apiBase: string;
  currentOwnerKey(): AppOwnerKey;
  visibleOwnerKeys(): readonly AppOwnerKey[];
  networkAllowed(): boolean;
  autoEnabled(): boolean;
  isOnline?: () => boolean;
  fetchLike?: typeof fetch;
  now?: () => number;
  eventId?: () => string;
  platformInfo?: () => Promise<DiagnosticPlatformInfo>;
}

export interface DiagnosticExportV1 {
  schemaVersion: 1;
  exportedAt: string;
  diagnostics: Array<{
    eventId: string;
    category: string;
    occurredAt: number;
    uploadPolicy: StoredDiagnostic["uploadPolicy"];
    uploadedAt: number | null;
    payload: StoredDiagnostic["payload"];
  }>;
}

function defaultEventId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `diag-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function defaultPlatformInfo(): Promise<DiagnosticPlatformInfo> {
  return Promise.resolve({
    appVersion: "unknown",
    buildNumber: "unknown",
    androidVersion: null,
    webViewVersion: null,
  });
}

export function sanitizeDiagnosticText(
  value: unknown,
  maxLength: number,
): string {
  return String(value ?? "")
    .replace(/\bhttps?:\/\/[^\s)]+/giu, (url) => url.replace(/[?#].*$/u, ""))
    .replace(/\bBearer\s+\S+/giu, "Bearer [redacted]")
    .replace(/\b[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/gu, "[redacted-token]")
    .replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/gu, "[redacted-email]")
    .replace(/\b(token|access_token|refresh_token|authorization|email|nickname)\s*[:=]\s*[^\s,;]+/giu, "$1=[redacted]")
    .replace(/\/Users\/[^/\s]+/gu, "/Users/[redacted]")
    .replace(/\\Users\\[^\\\s]+/giu, "\\Users\\[redacted]")
    .slice(0, maxLength);
}

function errorFields(error: unknown): { errorType: string; stack: string | null } {
  const errorType = sanitizeDiagnosticText(
    error instanceof Error ? error.name : "UnknownError",
    128,
  ).trim() || "UnknownError";
  const rawStack = error instanceof Error ? error.stack ?? error.message : error;
  const stack = sanitizeDiagnosticText(rawStack, 8192).trim();
  return { errorType, stack: stack || null };
}

function diagnosticRequest(row: StoredDiagnostic, severity: "error" | "critical") {
  return {
    event_id: row.eventId,
    category: row.category,
    severity,
    occurred_at_ms: row.occurredAt,
    payload: {
      error_type: row.payload.errorType,
      stack: row.payload.stack,
      app_version: row.payload.appVersion,
      build_number: row.payload.buildNumber,
      android_version: row.payload.androidVersion,
      webview_version: row.payload.webViewVersion,
    },
  };
}

function storedSeverity(row: StoredDiagnostic): "error" | "critical" {
  return row.category === "uncaught_error" ||
    row.category === "unhandled_rejection" ||
    row.category === "lifecycle_error"
    ? "critical"
    : "error";
}

export class ClientDiagnostics {
  readonly #options: ClientDiagnosticsOptions;
  #severity = new Map<string, "error" | "critical">();
  #flushTask: Promise<void> | null = null;

  constructor(options: ClientDiagnosticsOptions) {
    this.#options = options;
  }

  async record(
    error: unknown,
    category: string,
    severity: "error" | "critical",
  ): Promise<void> {
    const occurredAt = Math.max(0, Math.floor((this.#options.now ?? Date.now)()));
    const eventId = (this.#options.eventId ?? defaultEventId)();
    const platform = await (this.#options.platformInfo ?? defaultPlatformInfo)();
    const fields = errorFields(error);
    const allowed = this.#options.networkAllowed() && this.#options.autoEnabled();
    const diagnostic: StoredDiagnostic = {
      schemaVersion: APP_DATABASE_SCHEMA_VERSION,
      eventId,
      ownerKey: this.#options.currentOwnerKey(),
      category: sanitizeDiagnosticText(category, 64).toLowerCase() || "serious_error",
      occurredAt,
      uploadPolicy: allowed ? "allowed" : "never",
      uploadedAt: null,
      payload: {
        errorType: fields.errorType,
        stack: fields.stack,
        appVersion: sanitizeDiagnosticText(platform.appVersion, 64) || "unknown",
        buildNumber: sanitizeDiagnosticText(platform.buildNumber, 64) || "unknown",
        androidVersion: platform.androidVersion
          ? sanitizeDiagnosticText(platform.androidVersion, 128)
          : null,
        webViewVersion: platform.webViewVersion
          ? sanitizeDiagnosticText(platform.webViewVersion, 128)
          : null,
      },
    };
    await this.#options.database.addDiagnostic(diagnostic);
    this.#severity.set(eventId, severity);
    if (allowed) void this.flush();
  }

  flush(): Promise<void> {
    if (this.#flushTask) return this.#flushTask;
    this.#flushTask = this.#flush().finally(() => {
      this.#flushTask = null;
    });
    return this.#flushTask;
  }

  async #flush(): Promise<void> {
    if (
      !this.#options.networkAllowed() ||
      !this.#options.autoEnabled() ||
      !(this.#options.isOnline ?? (() => navigator.onLine))()
    ) {
      return;
    }
    const owners = [...new Set(this.#options.visibleOwnerKeys())];
    const rows = (
      await Promise.all(
        owners.map((ownerKey) => this.#options.database.listDiagnostics(ownerKey)),
      )
    )
      .flat()
      .filter((row) => row.uploadPolicy === "allowed" && row.uploadedAt === null)
      .sort((left, right) => left.occurredAt - right.occurredAt)
      .slice(0, 20);
    const fetchLike = this.#options.fetchLike ?? fetch;
    for (const row of rows) {
      try {
        const response = await fetchLike(`${this.#options.apiBase}/client-diagnostics`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Request-Id": row.eventId,
          },
          body: JSON.stringify(
            diagnosticRequest(
              row,
              this.#severity.get(row.eventId) ?? storedSeverity(row),
            ),
          ),
        });
        if (!response.ok) break;
        await this.#options.database.markDiagnosticUploaded(
          row.eventId,
          Math.max(0, Math.floor((this.#options.now ?? Date.now)())),
        );
        this.#severity.delete(row.eventId);
      } catch {
        break;
      }
    }
  }

  async buildExport(): Promise<DiagnosticExportV1> {
    const owners = [...new Set(this.#options.visibleOwnerKeys())];
    const rows = (
      await Promise.all(
        owners.map((ownerKey) => this.#options.database.listDiagnostics(ownerKey)),
      )
    )
      .flat()
      .sort((left, right) => left.occurredAt - right.occurredAt);
    return {
      schemaVersion: 1,
      exportedAt: new Date((this.#options.now ?? Date.now)()).toISOString(),
      diagnostics: rows.map((row) => ({
        eventId: row.eventId,
        category: row.category,
        occurredAt: row.occurredAt,
        uploadPolicy: row.uploadPolicy,
        uploadedAt: row.uploadedAt,
        payload: { ...row.payload },
      })),
    };
  }
}
