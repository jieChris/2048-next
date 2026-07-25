import { describe, expect, it, vi } from "vitest";

import {
  diagnosticExportFilename,
  saveDiagnosticExport,
  type DiagnosticExportNativePort,
} from "../../mobile/src/platform/diagnostic-export";
import type { DiagnosticExportV1 } from "../../mobile/src/diagnostics/client-diagnostics";

const exported: DiagnosticExportV1 = {
  schemaVersion: 1,
  exportedAt: "2026-07-25T00:00:00.000Z",
  diagnostics: [],
};

describe("mobile diagnostic export", () => {
  it("uses a stable cache filename without account data", () => {
    expect(diagnosticExportFilename(exported.exportedAt)).toBe(
      "2048-next-diagnostics-20260725T000000Z.json",
    );
  });

  it("shares only the dedicated native cache file and removes it afterwards", async () => {
    const native: DiagnosticExportNativePort = {
      write: vi.fn(async () => undefined),
      uri: vi.fn(async () => "content://diagnostic-export"),
      share: vi.fn(async () => undefined),
      remove: vi.fn(async () => undefined),
    };

    await saveDiagnosticExport(exported, { native });

    expect(native.write).toHaveBeenCalledWith(
      "diagnostic-share/2048-next-diagnostics-20260725T000000Z.json",
      JSON.stringify(exported, null, 2),
    );
    expect(native.share).toHaveBeenCalledWith(
      "content://diagnostic-export",
      "2048 NEXT diagnostics",
    );
    expect(native.remove).toHaveBeenCalledTimes(1);
  });
});
