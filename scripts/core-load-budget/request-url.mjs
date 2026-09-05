import path from "node:path";

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/u;
const WINDOWS_DRIVE_PATTERN = /^[A-Za-z]:[\\/]/u;
const SCHEME_PATTERN = /^[A-Za-z][A-Za-z0-9+.-]*:/u;
const GLOB_PATTERN = /[*?[\]{}]/u;

function isSafeExactRelativePath(value) {
  if (typeof value !== "string" || value.trim() === "") return false;
  if (
    path.isAbsolute(value) ||
    value.includes("\\") ||
    CONTROL_CHARACTER_PATTERN.test(value) ||
    GLOB_PATTERN.test(value)
  ) {
    return false;
  }
  const normalized = path.posix.normalize(value);
  return (
    normalized !== "." &&
    normalized !== ".." &&
    !normalized.startsWith("../") &&
    !normalized.includes("/../") &&
    !normalized.split("/").some((part) => part.startsWith("dist.backup-"))
  );
}

function splitFragment(value) {
  const index = value.indexOf("#");
  return index === -1 ? value : value.slice(0, index);
}

function splitQuery(value) {
  const index = value.indexOf("?");
  return index === -1
    ? { diskPart: value, query: "" }
    : { diskPart: value.slice(0, index), query: value.slice(index) };
}

function classifyNonRequestUrl(value) {
  const trimmed = String(value || "").trim();
  if (trimmed === "" || trimmed.startsWith("#")) return "fragment";
  if (/^data:/iu.test(trimmed)) return "data";
  return null;
}

function normalizeRequestUrl(rawValue, baseRequestUrl = "") {
  if (typeof rawValue !== "string" || rawValue.trim() === "") {
    throw new Error("resource URL must be non-empty");
  }
  const trimmed = rawValue.trim();
  const nonRequest = classifyNonRequestUrl(trimmed);
  if (nonRequest) return { kind: nonRequest, raw: trimmed };
  if (
    trimmed.startsWith("//") ||
    WINDOWS_DRIVE_PATTERN.test(trimmed) ||
    SCHEME_PATTERN.test(trimmed)
  ) {
    throw new Error(
      `external or absolute resource URL is forbidden: ${trimmed}`,
    );
  }
  let decoded;
  try {
    decoded = decodeURIComponent(splitFragment(trimmed));
  } catch {
    throw new Error(`resource URL cannot be decoded: ${trimmed}`);
  }
  if (decoded === "") return { kind: "fragment", raw: trimmed };
  if (decoded.includes("\\") || CONTROL_CHARACTER_PATTERN.test(decoded)) {
    throw new Error(`resource URL contains an unsafe character: ${trimmed}`);
  }
  const { diskPart, query } = splitQuery(decoded);
  if (!diskPart) throw new Error(`resource URL has no disk path: ${trimmed}`);
  const baseDiskPath = baseRequestUrl
    ? splitQuery(baseRequestUrl).diskPart
    : "";
  const fromRoot = diskPart.startsWith("/");
  const relativeDiskPart = fromRoot
    ? diskPart.slice(1)
    : diskPart.replace(/^\.\//u, "");
  const diskPath = path.posix.normalize(
    fromRoot
      ? relativeDiskPart
      : baseDiskPath
        ? path.posix.join(path.posix.dirname(baseDiskPath), relativeDiskPart)
        : relativeDiskPart,
  );
  if (!isSafeExactRelativePath(diskPath)) {
    throw new Error(`resource URL is not a safe dist path: ${trimmed}`);
  }
  return {
    kind: "request",
    raw: trimmed,
    requestUrl: `${diskPath}${query}`,
    diskPath,
    query,
  };
}

function logicalAssetUrl(requestUrl) {
  const { diskPart, query } = splitQuery(requestUrl);
  return `${diskPart.replace(/-[A-Za-z0-9_-]{8}(?=\.[^.]+$)/u, "-<hash>")}${query}`;
}

function hasBackupSegment(filePath) {
  return path
    .resolve(filePath)
    .split(path.sep)
    .some((part) => part.startsWith("dist.backup-"));
}

export {
  classifyNonRequestUrl,
  hasBackupSegment,
  isSafeExactRelativePath,
  logicalAssetUrl,
  normalizeRequestUrl,
  splitQuery,
};
