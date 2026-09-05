import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

async function listDistFiles(root, current = root) {
  const files = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const target = path.join(current, entry.name);
    const relativeTarget = path
      .relative(root, target)
      .split(path.sep)
      .join("/");
    if (entry.isSymbolicLink()) {
      throw new Error(
        `dist fingerprint rejects symbolic links: ${relativeTarget}`,
      );
    }
    if (entry.isDirectory()) {
      files.push(...(await listDistFiles(root, target)));
    } else if (entry.isFile()) {
      files.push(target);
    } else {
      throw new Error(
        `dist fingerprint rejects non-regular entries: ${relativeTarget}`,
      );
    }
  }
  return files;
}

async function fingerprintDistManifest(distRoot) {
  if (path.basename(distRoot).startsWith("dist.backup-")) {
    throw new Error("dist.backup-* directories must never be scanned");
  }
  const discoveredFiles = await listDistFiles(distRoot);
  const files = discoveredFiles.sort((left, right) =>
    left.localeCompare(right, "en"),
  );
  const hash = createHash("sha256");
  let totalBytes = 0;
  for (const filePath of files) {
    const relativePath = path
      .relative(distRoot, filePath)
      .replaceAll(path.sep, "/");
    const fileStat = await stat(filePath);
    totalBytes += fileStat.size;
    const fileContent = await readFile(filePath);
    const contentSha256 = createHash("sha256")
      .update(fileContent)
      .digest("hex");
    hash.update(relativePath);
    hash.update("\0");
    hash.update(String(fileStat.size));
    hash.update("\0");
    hash.update(contentSha256);
    hash.update("\n");
  }
  return {
    algorithm: "sha256(path-null-size-null-content-sha256-newline)",
    sha256: hash.digest("hex"),
    fileCount: files.length,
    totalBytes,
  };
}

export { fingerprintDistManifest, listDistFiles };
