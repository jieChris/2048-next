import { Capacitor } from "@capacitor/core";

import type { DiagnosticExportV1 } from "../diagnostics/client-diagnostics";

export interface DiagnosticExportNativePort {
  write(path: string, data: string): Promise<void>;
  uri(path: string): Promise<string>;
  share(uri: string, title: string): Promise<void>;
  remove(path: string): Promise<void>;
}

export interface SaveDiagnosticExportOptions {
  native?: DiagnosticExportNativePort | null;
  browser?: {
    document: Document;
    createObjectUrl(blob: Blob): string;
    revokeObjectUrl(url: string): void;
  };
}

export function diagnosticExportFilename(exportedAt: string): string {
  const compact = exportedAt.replace(/[-:]/gu, "").replace(".000", "");
  return `2048-next-diagnostics-${compact}.json`;
}

async function defaultNativePort(): Promise<DiagnosticExportNativePort | null> {
  if (!Capacitor.isNativePlatform()) return null;
  const [{ Directory, Encoding, Filesystem }, { Share }] = await Promise.all([
    import("@capacitor/filesystem"),
    import("@capacitor/share"),
  ]);
  return {
    async write(path, data) {
      await Filesystem.writeFile({
        path,
        data,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
        recursive: true,
      });
    },
    async uri(path) {
      return (
        await Filesystem.getUri({ path, directory: Directory.Cache })
      ).uri;
    },
    async share(uri, title) {
      await Share.share({ title, dialogTitle: title, files: [uri] });
    },
    async remove(path) {
      await Filesystem.deleteFile({ path, directory: Directory.Cache });
    },
  };
}

export async function saveDiagnosticExport(
  exported: DiagnosticExportV1,
  options: SaveDiagnosticExportOptions = {},
): Promise<void> {
  const filename = diagnosticExportFilename(exported.exportedAt);
  const serialized = JSON.stringify(exported, null, 2);
  const native = options.native === undefined
    ? await defaultNativePort()
    : options.native;
  if (native) {
    const path = `diagnostic-share/${filename}`;
    await native.write(path, serialized);
    try {
      await native.share(await native.uri(path), "2048 NEXT diagnostics");
    } finally {
      await native.remove(path).catch(() => undefined);
    }
    return;
  }

  const browser = options.browser ?? {
    document,
    createObjectUrl: (blob: Blob) => URL.createObjectURL(blob),
    revokeObjectUrl: (url: string) => URL.revokeObjectURL(url),
  };
  const url = browser.createObjectUrl(
    new Blob([serialized], { type: "application/json" }),
  );
  try {
    const anchor = browser.document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
  } finally {
    browser.revokeObjectUrl(url);
  }
}
