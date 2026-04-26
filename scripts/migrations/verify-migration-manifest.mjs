#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const USAGE = `Usage:
  node scripts/migrations/verify-migration-manifest.mjs <manifest.json>

Validates a D1/COS migration manifest without contacting production services.
`;

function fail(message) {
  console.error(`[migration-manifest] ERROR: ${message}`);
  process.exitCode = 1;
}

function warn(message) {
  console.warn(`[migration-manifest] WARN: ${message}`);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function sha256File(filePath) {
  const bytes = await readFile(filePath);
  return createHash("sha256").update(bytes).digest("hex");
}

async function main() {
  const manifestArg = process.argv[2];
  if (!manifestArg || manifestArg === "-h" || manifestArg === "--help") {
    console.log(USAGE.trim());
    return;
  }

  const manifestPath = path.resolve(manifestArg);
  const manifestDir = path.dirname(manifestPath);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

  if (!isObject(manifest)) fail("manifest root must be an object");
  if (manifest.schema_version !== 1) fail("schema_version must be 1");
  if (!manifest.migration_id) fail("migration_id is required");
  if (!isObject(manifest.source)) fail("source object is required");
  if (!isObject(manifest.target)) fail("target object is required");
  if (!Array.isArray(manifest.tables)) fail("tables array is required");
  if (!Array.isArray(manifest.replays)) fail("replays array is required");

  const tableNames = new Set();
  for (const table of manifest.tables ?? []) {
    if (!isObject(table)) {
      fail("each table entry must be an object");
      continue;
    }
    if (!table.name) fail("table.name is required");
    if (tableNames.has(table.name)) fail(`duplicate table entry: ${table.name}`);
    tableNames.add(table.name);
    if (!Number.isInteger(table.rows) || table.rows < 0) {
      fail(`table ${table.name} must have a non-negative integer rows value`);
    }
    if (!table.sha256) warn(`table ${table.name} has no sha256 value`);
  }

  const replayHashes = new Map();
  let checkedReplayFiles = 0;
  for (const replay of manifest.replays ?? []) {
    if (!isObject(replay)) {
      fail("each replay entry must be an object");
      continue;
    }
    for (const field of ["record_id", "source_key", "local_path", "sha256", "byte_size"]) {
      if (replay[field] === undefined || replay[field] === null || replay[field] === "") {
        fail(`replay entry is missing ${field}`);
      }
    }
    if (!Number.isInteger(replay.byte_size) || replay.byte_size < 0) {
      fail(`replay ${replay.record_id} must have a non-negative integer byte_size`);
    }
    const existing = replayHashes.get(replay.sha256);
    if (existing && existing !== replay.local_path) {
      warn(`sha256 ${replay.sha256} appears in multiple paths: ${existing}, ${replay.local_path}`);
    }
    replayHashes.set(replay.sha256, replay.local_path);

    const localPath = path.resolve(manifestDir, replay.local_path);
    try {
      const info = await stat(localPath);
      if (!info.isFile()) {
        fail(`replay local_path is not a file: ${replay.local_path}`);
        continue;
      }
      if (info.size !== replay.byte_size) {
        fail(`replay ${replay.record_id} byte_size mismatch: manifest=${replay.byte_size} actual=${info.size}`);
      }
      const actualHash = await sha256File(localPath);
      if (actualHash !== replay.sha256) {
        fail(`replay ${replay.record_id} sha256 mismatch: manifest=${replay.sha256} actual=${actualHash}`);
      }
      checkedReplayFiles += 1;
    } catch (error) {
      warn(`replay file not checked (${replay.local_path}): ${error.message}`);
    }
  }

  if (!process.exitCode) {
    console.log(`[migration-manifest] OK: ${manifest.migration_id}`);
    console.log(`[migration-manifest] tables=${manifest.tables.length} replays=${manifest.replays.length} checked_files=${checkedReplayFiles}`);
  }
}

main().catch((error) => {
  fail(error.stack || error.message);
});

export const __filename = fileURLToPath(import.meta.url);
