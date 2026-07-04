import { readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { brotliCompress, constants, gzip } from "node:zlib";
import { promisify } from "node:util";

const brotli = promisify(brotliCompress);
const gzipAsync = promisify(gzip);
const distDir = "dist";
// ponytail: build .br/.gz with Node stdlib; the static server must serve them.
const compressibleExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".mjs",
  ".svg",
  ".wasm",
  ".webmanifest"
]);

function shouldPrecompress(filePath) {
  const lowerPath = filePath.toLowerCase();
  if (lowerPath.endsWith(".br") || lowerPath.endsWith(".gz")) return false;
  return compressibleExtensions.has(extname(lowerPath));
}

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(path));
      continue;
    }
    if (entry.isFile() && shouldPrecompress(path)) {
      files.push(path);
    }
  }
  return files;
}

const files = await collectFiles(distDir);
await Promise.all(files.map(async (filePath) => {
  const source = await readFile(filePath);
  const [br, gz] = await Promise.all([
    brotli(source, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: 11
      }
    }),
    gzipAsync(source, { level: 9 })
  ]);
  await Promise.all([
    writeFile(`${filePath}.br`, br),
    writeFile(`${filePath}.gz`, gz)
  ]);
}));

console.log(`[precompress-dist] wrote ${files.length * 2} compressed files for ${files.length} assets`);
