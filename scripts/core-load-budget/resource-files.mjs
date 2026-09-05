import { access, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { brotliDecompressSync, gunzipSync } from "node:zlib";

import { createViolation } from "./shared.mjs";
import { hasBackupSegment, splitQuery } from "./request-url.mjs";

const COMPRESSIBLE_PATTERN =
  /\.(?:css|html?|js|json|mjs|svg|wasm|webmanifest)$/iu;

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function isContainedPath(root, candidate) {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}

async function validateExistingPath(distRoot, absolutePath, displayPath) {
  const resolved = await realpath(absolutePath);
  if (!isContainedPath(distRoot, resolved) || hasBackupSegment(resolved)) {
    throw new Error(`resource escapes dist or enters a backup: ${displayPath}`);
  }
  return resolved;
}

function validateSidecarContent(raw, compressed, encoding, displayPath) {
  let decoded;
  try {
    decoded =
      encoding === "br"
        ? brotliDecompressSync(compressed)
        : gunzipSync(compressed);
  } catch {
    throw new Error(
      `${encoding} sidecar cannot be decompressed: ${displayPath}`,
    );
  }
  if (!decoded.equals(raw)) {
    throw new Error(
      `${encoding} sidecar does not match the raw resource: ${displayPath}`,
    );
  }
}

async function readValidatedResource(distRoot, diskPath) {
  const absolutePath = path.join(distRoot, diskPath);
  if (!(await fileExists(absolutePath))) return null;
  const resolvedPath = await validateExistingPath(
    distRoot,
    absolutePath,
    diskPath,
  );
  const raw = await readFile(resolvedPath);
  return { raw, resolvedPath };
}

async function inspectSidecar(distRoot, diskPath, raw, extension, encoding) {
  const sidecarPath = path.join(distRoot, `${diskPath}.${extension}`);
  if (!(await fileExists(sidecarPath))) {
    return { exists: false, bytes: 0, encoding: "missing" };
  }
  const resolvedPath = await validateExistingPath(
    distRoot,
    sidecarPath,
    `${diskPath}.${extension}`,
  );
  const compressed = await readFile(resolvedPath);
  validateSidecarContent(raw, compressed, encoding, `${diskPath}.${extension}`);
  return { exists: true, bytes: compressed.length, encoding };
}

async function inspectDiskResource(distRoot, diskPath, compression) {
  const resource = await readValidatedResource(distRoot, diskPath);
  if (!resource) {
    return {
      missing: true,
      rawBytes: 0,
      selectedBytes: 0,
      selectedEncoding: "missing",
      brotli: { exists: false, bytes: 0, encoding: "missing" },
      gzip: { exists: false, bytes: 0, encoding: "missing" },
      violations: [],
    };
  }
  const rawBytes = resource.raw.length;
  if (!COMPRESSIBLE_PATTERN.test(diskPath)) {
    return {
      missing: false,
      rawBytes,
      selectedBytes: rawBytes,
      selectedEncoding: "raw",
      brotli: { exists: false, bytes: 0, encoding: "not-applicable" },
      gzip: { exists: false, bytes: 0, encoding: "not-applicable" },
      violations: [],
    };
  }
  const violations = [];
  let brotli;
  let gzip;
  try {
    brotli = await inspectSidecar(distRoot, diskPath, resource.raw, "br", "br");
  } catch (error) {
    brotli = { exists: false, bytes: 0, encoding: "invalid" };
    violations.push(
      createViolation("invalid-brotli-sidecar", error.message, {
        path: `${diskPath}.br`,
        encoding: "br",
        suggestedAction:
          "Regenerate the Brotli sidecar from the exact raw resource.",
      }),
    );
  }
  try {
    gzip = await inspectSidecar(distRoot, diskPath, resource.raw, "gz", "gzip");
  } catch (error) {
    gzip = { exists: false, bytes: 0, encoding: "invalid" };
    violations.push(
      createViolation("invalid-gzip-sidecar", error.message, {
        path: `${diskPath}.gz`,
        encoding: "gzip",
        suggestedAction:
          "Regenerate the gzip sidecar from the exact raw resource.",
      }),
    );
  }
  if (!gzip.exists) {
    violations.push(
      createViolation(
        "missing-gzip-sidecar",
        "gzip fallback sidecar is missing",
        {
          path: diskPath,
          encoding: "missing",
          suggestedAction:
            "Run precompress-dist so every compressible discovered resource has gzip fallback.",
        },
      ),
    );
  }
  if (compression.requireBrotli && !brotli.exists) {
    violations.push(
      createViolation(
        "missing-brotli-sidecar",
        "required Brotli sidecar is missing",
        {
          path: diskPath,
          encoding: gzip.exists ? "gzip" : "raw",
          suggestedAction:
            "Run precompress-dist so every compressible discovered resource has Brotli.",
        },
      ),
    );
  }
  const selected =
    compression.preferred === "br" && brotli.exists
      ? brotli
      : compression.fallback === "gzip" && gzip.exists
        ? gzip
        : { exists: true, bytes: rawBytes, encoding: "raw" };
  return {
    missing: false,
    rawBytes,
    selectedBytes: selected.bytes,
    selectedEncoding: selected.encoding,
    brotli,
    gzip,
    violations,
  };
}

async function createResourceInspector(distRoot, compression) {
  const resolvedDistRoot = await realpath(distRoot);
  if (hasBackupSegment(distRoot) || hasBackupSegment(resolvedDistRoot)) {
    throw new Error("dist.backup-* directories must never be scanned");
  }
  const cache = new Map();
  async function inspect(requestUrl) {
    const { diskPart } = splitQuery(requestUrl);
    if (!cache.has(diskPart)) {
      cache.set(
        diskPart,
        inspectDiskResource(resolvedDistRoot, diskPart, compression),
      );
    }
    const disk = await cache.get(diskPart);
    return {
      requestUrl,
      diskPath: diskPart,
      bytes: disk.selectedBytes,
      encoding: disk.selectedEncoding,
      rawBytes: disk.rawBytes,
      brotliBytes: disk.brotli.bytes,
      gzipBytes: disk.gzip.bytes,
      missing: disk.missing,
      missingBrotli: COMPRESSIBLE_PATTERN.test(diskPart) && !disk.brotli.exists,
      missingGzip: COMPRESSIBLE_PATTERN.test(diskPart) && !disk.gzip.exists,
      violations: disk.violations,
    };
  }
  return { distRoot: resolvedDistRoot, inspect };
}

export {
  COMPRESSIBLE_PATTERN,
  createResourceInspector,
  fileExists,
  readValidatedResource,
};
