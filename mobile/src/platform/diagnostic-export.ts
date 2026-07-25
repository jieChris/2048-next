import type { DiagnosticExportV1 } from "../diagnostics/client-diagnostics";
import {
  shareJsonFile,
  type JsonFileShareNativePort,
  type JsonFileShareOptions,
} from "./json-file-share";

export type DiagnosticExportNativePort = JsonFileShareNativePort;
export interface SaveDiagnosticExportOptions extends JsonFileShareOptions {}

export function diagnosticExportFilename(exportedAt: string): string {
  const compact = exportedAt.replace(/[-:]/gu, "").replace(".000", "");
  return `2048-next-diagnostics-${compact}.json`;
}

export async function saveDiagnosticExport(
  exported: DiagnosticExportV1,
  options: SaveDiagnosticExportOptions = {},
): Promise<void> {
  await shareJsonFile(
    {
      directory: "diagnostic-share",
      filename: diagnosticExportFilename(exported.exportedAt),
      title: "2048 NEXT diagnostics",
      serialized: JSON.stringify(exported, null, 2),
    },
    options,
  );
}
