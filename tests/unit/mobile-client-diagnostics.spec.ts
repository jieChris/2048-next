import { describe, expect, it, vi } from "vitest";

import {
  ClientDiagnostics,
  sanitizeDiagnosticText,
  type ClientDiagnosticsDatabase,
} from "../../mobile/src/diagnostics/client-diagnostics";
import type {
  AppOwnerKey,
  StoredDiagnostic,
} from "../../mobile/src/data/app-database";

function database() {
  const rows = new Map<string, StoredDiagnostic>();
  const port: ClientDiagnosticsDatabase = {
    addDiagnostic: vi.fn(async (diagnostic) => {
      rows.set(diagnostic.eventId, structuredClone(diagnostic));
    }),
    listDiagnostics: vi.fn(async (ownerKey) =>
      [...rows.values()]
        .filter((row) => row.ownerKey === ownerKey)
        .map((row) => structuredClone(row)),
    ),
    markDiagnosticUploaded: vi.fn(async (eventId, uploadedAt) => {
      const row = rows.get(eventId);
      if (!row) return false;
      row.uploadedAt = uploadedAt;
      return true;
    }),
  };
  return { port, rows };
}

function coordinator(options: {
  allowed: boolean;
  enabled?: boolean;
  ownerKey?: AppOwnerKey;
  fetchLike?: typeof fetch;
}) {
  const harness = database();
  const currentOwnerKey = options.ownerKey ?? "guest";
  const client = new ClientDiagnostics({
    database: harness.port,
    apiBase: "https://api.example.test/api",
    currentOwnerKey: () => currentOwnerKey,
    visibleOwnerKeys: () => ["guest", currentOwnerKey],
    networkAllowed: () => options.allowed,
    autoEnabled: () => options.enabled ?? true,
    isOnline: () => true,
    fetchLike: options.fetchLike ?? vi.fn(async () => new Response("{}", { status: 201 })),
    now: () => 1_775_000_000_000,
    eventId: () => "diag-test-event",
    platformInfo: async () => ({
      appVersion: "1.0.0",
      buildNumber: "100",
      androidVersion: "16",
      webViewVersion: "138.0.7204.101",
    }),
  });
  return { ...harness, client };
}

describe("mobile client diagnostics", () => {
  it("redacts emails, credentials, JWT-like values, and URL queries from technical text", () => {
    const sanitized = sanitizeDiagnosticText(
      "player@example.com Bearer abc.def.ghi token=secret https://example.test/a?token=secret#x",
      8192,
    );
    expect(sanitized).not.toContain("player@example.com");
    expect(sanitized).not.toContain("abc.def.ghi");
    expect(sanitized).not.toContain("token=secret");
    expect(sanitized).not.toContain("?token=secret");
    expect(sanitized).toContain("[redacted-email]");
  });

  it("never uploads an event created before online privacy consent", async () => {
    const fetchLike = vi.fn(async () => new Response("{}", { status: 201 }));
    const { client, rows, port } = coordinator({ allowed: false, fetchLike });

    await client.record(new Error("offline failure"), "uncaught_error", "error");
    await client.flush();

    expect([...rows.values()][0]).toMatchObject({ uploadPolicy: "never" });
    expect(fetchLike).not.toHaveBeenCalled();
    expect(port.markDiagnosticUploaded).not.toHaveBeenCalled();
  });

  it("uploads only the anonymous whitelist and marks the local event complete", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const fetchLike = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(url), init });
      return new Response(JSON.stringify({ success: true }), { status: 201 });
    });
    const { client, rows } = coordinator({
      allowed: true,
      ownerKey: "user:42",
      fetchLike: fetchLike as typeof fetch,
    });

    await client.record(
      new Error("player@example.com token=secret"),
      "uncaught_error",
      "critical",
    );
    await client.flush();

    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe("https://api.example.test/api/client-diagnostics");
    const body = JSON.parse(String(requests[0]?.init?.body));
    expect(body).toEqual({
      event_id: "diag-test-event",
      category: "uncaught_error",
      severity: "critical",
      occurred_at_ms: 1_775_000_000_000,
      payload: {
        error_type: "Error",
        stack: expect.any(String),
        app_version: "1.0.0",
        build_number: "100",
        android_version: "16",
        webview_version: "138.0.7204.101",
      },
    });
    expect(JSON.stringify(body)).not.toContain("player@example.com");
    expect(JSON.stringify(body)).not.toContain("token=secret");
    expect(JSON.stringify(body)).not.toContain("user:42");
    expect([...rows.values()][0]?.uploadedAt).toBe(1_775_000_000_000);
  });

  it("exports visible diagnostics without owner identifiers", async () => {
    const { client, rows } = coordinator({ allowed: false, ownerKey: "user:42" });
    await client.record(new Error("export me"), "lifecycle_error", "error");
    rows.set("guest-event", {
      ...structuredClone([...rows.values()][0]!),
      eventId: "guest-event",
      ownerKey: "guest",
    });

    const exported = await client.buildExport();

    expect(exported.diagnostics).toHaveLength(2);
    expect(JSON.stringify(exported)).not.toContain("user:42");
    expect(JSON.stringify(exported)).not.toContain("ownerKey");
  });
});
