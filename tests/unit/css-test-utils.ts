import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const CSS_IMPORT_RE = /^@import\s+url\((?:"([^"]+)"|'([^']+)'|([^'")]+))\);\s*$/gm;

export function readCssEntry(path: string): string {
  const seen = new Set<string>();

  function readResolved(filePath: string): string {
    const absolutePath = resolve(filePath);
    if (seen.has(absolutePath)) {
      return "";
    }
    seen.add(absolutePath);

    const source = readFileSync(absolutePath, "utf8");
    return source.replace(CSS_IMPORT_RE, (_match, doubleQuoted, singleQuoted, bare) => {
      const importedPath = doubleQuoted ?? singleQuoted ?? bare;
      if (/^(?:https?:)?\/\//.test(importedPath)) {
        return "";
      }
      return readResolved(resolve(dirname(absolutePath), importedPath));
    });
  }

  return readResolved(path);
}
