import { Capacitor } from "@capacitor/core";

export interface JsonFileShareNativePort {
  write(path: string, data: string): Promise<void>;
  uri(path: string): Promise<string>;
  share(uri: string, title: string): Promise<void>;
  remove(path: string): Promise<void>;
}

export interface JsonFileShareOptions {
  native?: JsonFileShareNativePort | null;
  browser?: {
    document: Document;
    createObjectUrl(blob: Blob): string;
    revokeObjectUrl(url: string): void;
  };
}

async function defaultNativePort(): Promise<JsonFileShareNativePort | null> {
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

export async function shareJsonFile(
  input: {
    directory: "diagnostic-share" | "replay-share";
    filename: string;
    title: string;
    serialized: string;
  },
  options: JsonFileShareOptions = {},
): Promise<void> {
  const native = options.native === undefined
    ? await defaultNativePort()
    : options.native;
  if (native) {
    const path = `${input.directory}/${input.filename}`;
    await native.write(path, input.serialized);
    try {
      await native.share(await native.uri(path), input.title);
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
    new Blob([input.serialized], { type: "application/json" }),
  );
  try {
    const anchor = browser.document.createElement("a");
    anchor.href = url;
    anchor.download = input.filename;
    anchor.click();
  } finally {
    browser.revokeObjectUrl(url);
  }
}
