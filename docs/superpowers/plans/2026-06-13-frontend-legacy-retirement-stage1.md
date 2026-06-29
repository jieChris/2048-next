# Frontend Legacy Retirement Stage 1 Implementation Plan
> **For agentic workers:** Use Trellis/Trellies as the default project workflow. Before implementation, debugging, review, or code modification, check for and follow `.trellis/`, `.trellis/spec/`, Trellis task files, Trellis skills, and Trellis commands when available. Do not use legacy Superpower Skill instructions. If old Superpower instructions conflict with Trellis/Trellies, Trellis/Trellies wins. Steps use checkbox syntax for tracking.

**Goal:** 收敛第一阶段前端退 legacy 边界：让 `src/pages/*` legacy import allowlist 开始下降，并把页面层 direct storage/API 例外迁入明确 owner。

**Architecture:** 保持现有 Vite MPA，不引入新前端框架。先建立 `src/storage` 与 `src/services` owner，再让页面壳改为调用这些 owner，最后删除对应 allowlist/exception 项并运行现有架构门禁。

**Tech Stack:** Vite 7, TypeScript 5.9, Vitest, Playwright, existing audit scripts.

---

## Scope

This plan implements the first execution slice from:

- `docs/superpowers/specs/2026-06-12-frontend-legacy-retirement-design.md`

It intentionally does not touch Engine ownership or `window.game_manager`. Engine takeover remains a later, higher-risk batch after page and service/storage boundaries stabilize.

## File Structure

Create:

- `src/storage/browser-storage.ts`
  - Shared safe wrappers around `localStorage` and `sessionStorage`.
- `src/services/api-client.ts`
  - Shared API base resolution, auth token lookup, and JSON request helper.
- `src/services/admin-rescue.ts`
  - Admin page service wrapper for authenticated admin requests.
- `src/services/stone-2k-monitor.ts`
  - Stone 2K monitor service wrapper for public monitor requests.
- `tests/unit/storage-browser-storage.spec.ts`
  - Unit tests for safe storage wrappers.
- `tests/unit/services-api-client.spec.ts`
  - Unit tests for API base resolution and request behavior.
- `tests/unit/services-stone-2k-monitor.spec.ts`
  - Unit tests for Stone 2K monitor service.

Modify:

- `src/pages/admin-page.ts`
  - Remove `../../js/api_shared_utils.js` import.
  - Replace direct `window.localStorage` and direct `fetch` use with service owner calls.
- `src/pages/stone-2k-monitor-page.ts`
  - Remove `../../js/api_shared_utils.js` import.
  - Replace direct `sessionStorage` and direct `fetch` use with storage/service owner calls.
- `src/pages/modes-page.ts`
  - Remove `../../js/theme_manager.js` import if targeted smoke confirms page behavior remains stable.
- `scripts/page-legacy-runtime-boundary-audit.mjs`
  - Remove allowlist entries that no longer exist for `modes-page.ts`, `admin-page.ts`, and `stone-2k-monitor-page.ts`.
- `scripts/service-boundary-audit.mjs`
  - Remove page exception entries after direct storage/fetch use is gone.
- `tests/unit/page-legacy-runtime-boundary-audit-helpers.spec.ts`
  - Update baseline assertions to match removed allowlist entries.
- `tests/unit/service-boundary-audit-helpers.spec.ts`
  - Assert moved pages are no longer allowlisted.
- `docs/ROADMAP_MILESTONES.md`
  - Record allowlist shrink evidence.
- `docs/ARCHITECTURE_GUARDRAILS.md`
  - Record current guardrail delta.

## Task 1: Add Storage Owner

**Files:**
- Create: `src/storage/browser-storage.ts`
- Create: `tests/unit/storage-browser-storage.spec.ts`

- [ ] **Step 1: Write failing tests for browser storage wrappers**

Create `tests/unit/storage-browser-storage.spec.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  createBrowserStorageAccess,
  readStorageValue,
  removeStorageValue,
  writeStorageValue
} from "../../src/storage/browser-storage";

describe("storage: browser-storage", () => {
  it("resolves local and session storage from a window-like host", () => {
    const localStorage = {
      getItem() {
        return null;
      },
      setItem() {},
      removeItem() {}
    };
    const sessionStorage = {
      getItem() {
        return null;
      },
      setItem() {},
      removeItem() {}
    };

    const access = createBrowserStorageAccess({
      windowLike: {
        localStorage,
        sessionStorage
      }
    });

    expect(access.local()).toBe(localStorage);
    expect(access.session()).toBe(sessionStorage);
  });

  it("returns null when storage lookup throws or is missing", () => {
    const access = createBrowserStorageAccess({
      windowLike: {
        get localStorage() {
          throw new Error("blocked");
        }
      }
    });

    expect(access.local()).toBeNull();
    expect(access.session()).toBeNull();
  });

  it("reads, writes, and removes storage values safely", () => {
    const writes: Array<{ key: string; value: string }> = [];
    const removes: string[] = [];
    const storage = {
      getItem(key: string) {
        return key === "token" ? "abc" : null;
      },
      setItem(key: string, value: string) {
        writes.push({ key, value });
      },
      removeItem(key: string) {
        removes.push(key);
      }
    };

    expect(readStorageValue(storage, "token")).toBe("abc");
    expect(writeStorageValue(storage, "token", "def")).toBe(true);
    expect(removeStorageValue(storage, "token")).toBe(true);
    expect(writes).toEqual([{ key: "token", value: "def" }]);
    expect(removes).toEqual(["token"]);
  });

  it("fails safely when storage operations throw", () => {
    const storage = {
      getItem() {
        throw new Error("read blocked");
      },
      setItem() {
        throw new Error("write blocked");
      },
      removeItem() {
        throw new Error("remove blocked");
      }
    };

    expect(readStorageValue(storage, "x")).toBeNull();
    expect(writeStorageValue(storage, "x", "y")).toBe(false);
    expect(removeStorageValue(storage, "x")).toBe(false);
    expect(readStorageValue(null, "x")).toBeNull();
    expect(writeStorageValue(null, "x", "y")).toBe(false);
    expect(removeStorageValue(null, "x")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the new tests and verify they fail**

Run:

```bash
npx vitest run tests/unit/storage-browser-storage.spec.ts
```

Expected: FAIL because `src/storage/browser-storage.ts` does not exist.

- [ ] **Step 3: Implement browser storage owner**

Create `src/storage/browser-storage.ts`:

```ts
export type StorageName = "localStorage" | "sessionStorage";

export interface StorageHost {
  localStorage?: unknown;
  sessionStorage?: unknown;
}

export interface BrowserStorageAccessOptions {
  windowLike?: StorageHost | null | undefined;
}

export interface BrowserStorageAccess {
  local: () => Storage | null;
  session: () => Storage | null;
}

function isStorageLike(value: unknown): value is Storage {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as Storage).getItem === "function" &&
    typeof (value as Storage).setItem === "function" &&
    typeof (value as Storage).removeItem === "function"
  );
}

export function resolveBrowserStorage(
  windowLike: StorageHost | null | undefined,
  storageName: StorageName
): Storage | null {
  if (!windowLike) return null;
  try {
    const storageLike = windowLike[storageName];
    return isStorageLike(storageLike) ? storageLike : null;
  } catch (_err) {
    return null;
  }
}

export function createBrowserStorageAccess(
  options: BrowserStorageAccessOptions = {}
): BrowserStorageAccess {
  const windowLike =
    options.windowLike || (typeof window !== "undefined" ? (window as unknown as StorageHost) : null);
  return {
    local: () => resolveBrowserStorage(windowLike, "localStorage"),
    session: () => resolveBrowserStorage(windowLike, "sessionStorage")
  };
}

export function readStorageValue(storageLike: Storage | null | undefined, key: string): string | null {
  if (!storageLike) return null;
  try {
    return storageLike.getItem(key);
  } catch (_err) {
    return null;
  }
}

export function writeStorageValue(
  storageLike: Storage | null | undefined,
  key: string,
  value: string
): boolean {
  if (!storageLike) return false;
  try {
    storageLike.setItem(key, value);
    return true;
  } catch (_err) {
    return false;
  }
}

export function removeStorageValue(storageLike: Storage | null | undefined, key: string): boolean {
  if (!storageLike) return false;
  try {
    storageLike.removeItem(key);
    return true;
  } catch (_err) {
    return false;
  }
}
```

- [ ] **Step 4: Run storage tests and verify they pass**

Run:

```bash
npx vitest run tests/unit/storage-browser-storage.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit storage owner**

Run:

```bash
git add src/storage/browser-storage.ts tests/unit/storage-browser-storage.spec.ts
git commit -m "refactor: add browser storage owner"
```

## Task 2: Add API Service Owners

**Files:**
- Create: `src/services/api-client.ts`
- Create: `src/services/admin-rescue.ts`
- Create: `src/services/stone-2k-monitor.ts`
- Create: `tests/unit/services-api-client.spec.ts`
- Create: `tests/unit/services-stone-2k-monitor.spec.ts`

- [ ] **Step 1: Write failing tests for API client**

Create `tests/unit/services-api-client.spec.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

import {
  buildApiBaseCandidates,
  createJsonApiClient,
  readAuthToken
} from "../../src/services/api-client";

describe("services: api-client", () => {
  it("builds API base candidates from same-origin and remote fallback", () => {
    expect(
      buildApiBaseCandidates({
        locationLike: { origin: "https://example.test" },
        remoteApiBase: "https://2048next.cn/api"
      })
    ).toEqual(["https://example.test/api", "https://2048next.cn/api"]);
  });

  it("deduplicates remote base when same-origin already matches", () => {
    expect(
      buildApiBaseCandidates({
        locationLike: { origin: "https://2048next.cn" },
        remoteApiBase: "https://2048next.cn/api"
      })
    ).toEqual(["https://2048next.cn/api"]);
  });

  it("reads auth token through storage owner", () => {
    const storage = {
      getItem(key: string) {
        return key === "2048_auth_token_v1" ? "token-1" : null;
      },
      setItem() {},
      removeItem() {}
    };

    expect(readAuthToken({ storageLike: storage })).toBe("token-1");
  });

  it("sends JSON request to the first base that returns JSON", async () => {
    const fetchLike = vi.fn().mockResolvedValue({
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve({ success: true })
    });
    const client = createJsonApiClient({
      bases: ["https://api.test"],
      fetchLike,
      token: "token-1"
    });

    await expect(client.request("/admin/me", { method: "GET" })).resolves.toEqual({
      success: true
    });
    expect(fetchLike).toHaveBeenCalledWith(
      "https://api.test/admin/me",
      expect.objectContaining({
        method: "GET",
        headers: expect.any(Headers)
      })
    );
    const headers = fetchLike.mock.calls[0][1].headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer token-1");
  });

  it("returns a stable error object when all bases fail", async () => {
    const fetchLike = vi.fn().mockRejectedValue(new Error("offline"));
    const client = createJsonApiClient({
      bases: ["https://api-a.test", "https://api-b.test"],
      fetchLike,
      token: "token-1"
    });

    await expect(client.request("/admin/me", { method: "GET" })).resolves.toEqual({
      success: false,
      error: "offline"
    });
    expect(fetchLike).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Write failing tests for Stone 2K monitor service**

Create `tests/unit/services-stone-2k-monitor.spec.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  buildStone2kRunsPath,
  createStone2kMonitorService
} from "../../src/services/stone-2k-monitor";

describe("services: stone-2k-monitor", () => {
  it("builds the runs query path from filter options", () => {
    expect(
      buildStone2kRunsPath({
        names: "alice,bob",
        sortValue: "time_asc",
        startAt: "2026-06-01T00:00:00.000Z",
        endAt: "2026-06-02T00:00:00.000Z",
        limit: 500,
        latestOnly: true
      })
    ).toBe(
      "/stone-2k/runs?limit=200&count=true&names=alice%2Cbob&sort_by=time&sort_order=asc&start_at=2026-06-01T00%3A00%3A00.000Z&end_at=2026-06-02T00%3A00%3A00.000Z&latest_only=true"
    );
  });

  it("fetches runs through the shared JSON API client", async () => {
    const calls: string[] = [];
    const service = createStone2kMonitorService({
      request: async (path) => {
        calls.push(path);
        return { success: true, rows: [{ id: "run-1" }] };
      }
    });

    await expect(service.listRuns({ limit: 10, sortValue: "score_desc" })).resolves.toEqual({
      success: true,
      rows: [{ id: "run-1" }]
    });
    expect(calls).toEqual(["/stone-2k/runs?limit=10&count=true&sort_by=score&sort_order=desc"]);
  });
});
```

- [ ] **Step 3: Run service tests and verify they fail**

Run:

```bash
npx vitest run tests/unit/services-api-client.spec.ts tests/unit/services-stone-2k-monitor.spec.ts
```

Expected: FAIL because service files do not exist.

- [ ] **Step 4: Implement shared API client**

Create `src/services/api-client.ts`:

```ts
import { readStorageValue } from "../storage/browser-storage";

export type JsonRecord = Record<string, unknown>;

export interface LocationLike {
  origin?: string;
}

export interface BuildApiBaseCandidatesOptions {
  locationLike?: LocationLike | null | undefined;
  remoteApiBase?: string;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<{
  status?: number;
  statusText?: string;
  json: () => Promise<unknown>;
}>;

export interface JsonApiClientOptions {
  bases: string[];
  fetchLike?: FetchLike;
  token?: string;
}

export interface JsonApiClient {
  request: (path: string, options?: RequestInit) => Promise<JsonRecord>;
}

const DEFAULT_REMOTE_API_BASE = "https://2048next.cn/api";
const AUTH_TOKEN_KEY = "2048_auth_token_v1";

function normalizeBase(value: string): string {
  return value.replace(/\/+$/u, "");
}

function toText(value: unknown): string {
  return value == null ? "" : String(value);
}

export function buildApiBaseCandidates(options: BuildApiBaseCandidatesOptions = {}): string[] {
  const remoteApiBase = normalizeBase(options.remoteApiBase || DEFAULT_REMOTE_API_BASE);
  const origin = toText(
    options.locationLike?.origin || (typeof window !== "undefined" ? window.location.origin : "")
  ).replace(/\/+$/u, "");
  const bases = origin ? [`${origin}/api`, remoteApiBase] : [remoteApiBase];
  return Array.from(new Set(bases.map(normalizeBase).filter(Boolean)));
}

export function readAuthToken(options: { storageLike?: Storage | null | undefined } = {}): string {
  return readStorageValue(options.storageLike || null, AUTH_TOKEN_KEY) || "";
}

export function createJsonApiClient(options: JsonApiClientOptions): JsonApiClient {
  const bases = Array.from(new Set(options.bases.map(normalizeBase).filter(Boolean)));
  const fetchLike =
    options.fetchLike ||
    (typeof fetch !== "undefined" ? (fetch.bind(globalThis) as FetchLike) : null);

  return {
    async request(path: string, requestOptions: RequestInit = {}) {
      if (!fetchLike) {
        return { success: false, error: "fetch_unavailable" };
      }
      let lastError = "api_unavailable";
      for (const base of bases) {
        try {
          const headers = new Headers(requestOptions.headers || {});
          if (options.token) headers.set("Authorization", "Bearer " + options.token);
          if (requestOptions.body !== undefined && !headers.has("Content-Type")) {
            headers.set("Content-Type", "application/json");
          }
          const response = await fetchLike(base + path, { ...requestOptions, headers });
          const data = (await response.json().catch(() => null)) as JsonRecord | null;
          if (data) return data;
          lastError = toText(response.statusText || response.status);
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
        }
      }
      return { success: false, error: lastError };
    }
  };
}
```

- [ ] **Step 5: Implement admin service owner**

Create `src/services/admin-rescue.ts`:

```ts
import { createBrowserStorageAccess } from "../storage/browser-storage";
import {
  buildApiBaseCandidates,
  createJsonApiClient,
  readAuthToken,
  type JsonApiClient,
  type JsonRecord
} from "./api-client";

export interface AdminServiceOptions {
  windowLike?: Window | null | undefined;
  client?: JsonApiClient;
}

export interface AdminService {
  request: (path: string, options?: RequestInit) => Promise<JsonRecord>;
}

export function createAdminService(options: AdminServiceOptions = {}): AdminService {
  if (options.client) return { request: options.client.request };
  const windowLike = options.windowLike || (typeof window !== "undefined" ? window : null);
  const storageAccess = createBrowserStorageAccess({
    windowLike: windowLike as unknown as Record<string, unknown>
  });
  const token = readAuthToken({ storageLike: storageAccess.local() });
  const client = createJsonApiClient({
    bases: buildApiBaseCandidates({ locationLike: windowLike?.location }),
    token
  });

  return {
    async request(path, requestOptions) {
      if (!token) {
        return { success: false, code: "NO_TOKEN", error: "未登录或 token 不存在" };
      }
      return client.request(path, requestOptions);
    }
  };
}
```

- [ ] **Step 6: Implement Stone 2K monitor service owner**

Create `src/services/stone-2k-monitor.ts`:

```ts
import { buildApiBaseCandidates, createJsonApiClient, type JsonApiClient, type JsonRecord } from "./api-client";

export interface Stone2kRunsQuery {
  names?: string;
  sortValue?: string;
  startAt?: string;
  endAt?: string;
  limit?: number;
  latestOnly?: boolean;
}

export interface Stone2kMonitorService {
  listRuns: (query: Stone2kRunsQuery) => Promise<JsonRecord>;
}

export interface Stone2kMonitorServiceOptions {
  client?: JsonApiClient;
  request?: JsonApiClient["request"];
  windowLike?: Window | null | undefined;
}

function clampLimit(value: unknown): number {
  const limit = Math.floor(Number(value));
  if (!Number.isFinite(limit)) return 50;
  return Math.max(1, Math.min(200, limit));
}

function toText(value: unknown): string {
  return value == null ? "" : String(value);
}

function toIsoInput(value: string): string {
  return new Date(value).toISOString();
}

export function buildStone2kRunsPath(query: Stone2kRunsQuery): string {
  const params = new URLSearchParams();
  const sortValue = toText(query.sortValue || "score_desc");
  const sortParts = sortValue.split("_");

  params.set("limit", String(clampLimit(query.limit ?? 50)));
  params.set("count", "true");
  if (query.names) params.set("names", query.names);
  params.set("sort_by", sortParts[0] === "time" ? "time" : "score");
  params.set("sort_order", sortParts[1] === "asc" ? "asc" : "desc");
  if (query.startAt) params.set("start_at", toIsoInput(query.startAt));
  if (query.endAt) params.set("end_at", toIsoInput(query.endAt));
  if (query.latestOnly) params.set("latest_only", "true");

  return "/stone-2k/runs?" + params.toString();
}

export function createStone2kMonitorService(
  options: Stone2kMonitorServiceOptions = {}
): Stone2kMonitorService {
  const request =
    options.request ||
    options.client?.request ||
    createJsonApiClient({
      bases: buildApiBaseCandidates({
        locationLike: (options.windowLike || (typeof window !== "undefined" ? window : null))?.location
      })
    }).request;

  return {
    listRuns(query) {
      return request(buildStone2kRunsPath(query), { method: "GET" });
    }
  };
}
```

- [ ] **Step 7: Run service tests and verify they pass**

Run:

```bash
npx vitest run tests/unit/services-api-client.spec.ts tests/unit/services-stone-2k-monitor.spec.ts
```

Expected: PASS.

- [ ] **Step 8: Commit service owners**

Run:

```bash
git add src/services/api-client.ts src/services/admin-rescue.ts src/services/stone-2k-monitor.ts tests/unit/services-api-client.spec.ts tests/unit/services-stone-2k-monitor.spec.ts
git commit -m "refactor: add frontend service owners"
```

## Task 3: Move Admin And Stone Pages Off Direct Service Access

**Files:**
- Modify: `src/pages/admin-page.ts`
- Modify: `src/pages/stone-2k-monitor-page.ts`
- Modify: `scripts/page-legacy-runtime-boundary-audit.mjs`
- Modify: `scripts/service-boundary-audit.mjs`
- Modify: `tests/unit/service-boundary-audit-helpers.spec.ts`
- Modify: `tests/unit/page-legacy-runtime-boundary-audit-helpers.spec.ts`
- Test: existing smoke under `tests/smoke/pages-*`

- [ ] **Step 1: Write failing static assertions for service-boundary allowlist shrink**

Update `tests/unit/service-boundary-audit-helpers.spec.ts` imports:

```ts
import {
  collectBoundaryViolations,
  collectPatternMatches,
  DIRECT_SERVICE_USAGE_ALLOWLIST,
  ensureNoBoundaryViolations,
  normalizePortablePath,
  shouldAuditFile,
  toProjectRelativePath
} from "../../scripts/service-boundary-audit.mjs";
```

Add this test:

```ts
  it("keeps page-level service boundary exceptions out of the baseline", () => {
    expect(DIRECT_SERVICE_USAGE_ALLOWLIST.has("src/pages/admin-page.ts")).toBe(false);
    expect(DIRECT_SERVICE_USAGE_ALLOWLIST.has("src/pages/stone-2k-monitor-page.ts")).toBe(false);
  });
```

- [ ] **Step 2: Run the targeted audit-helper test and verify it fails**

Run:

```bash
npx vitest run tests/unit/service-boundary-audit-helpers.spec.ts
```

Expected: FAIL because both page files are still in `DIRECT_SERVICE_USAGE_ALLOWLIST`.

- [ ] **Step 3: Refactor admin page imports and API request helper**

In `src/pages/admin-page.ts`, replace:

```ts
import "../../js/api_shared_utils.js";
```

with:

```ts
import { createAdminService } from "../services/admin-rescue";
```

Remove the `ApiSharedUtilsLike`, `AdminWindow`, `AUTH_TOKEN_KEY`, and `REMOTE_API_BASE` declarations.

Replace `getAuthToken`, `getApiBases`, and `apiRequest` with:

```ts
function createAdminPageService() {
  return createAdminService({
    windowLike: typeof window === "undefined" ? null : window
  });
}

async function apiRequest(path: string, options: RequestInit = {}): Promise<JsonRecord> {
  return createAdminPageService().request(path, options);
}
```

This keeps call sites unchanged while moving storage and fetch ownership into `src/services`.

- [ ] **Step 4: Refactor Stone 2K monitor page imports and storage helpers**

In `src/pages/stone-2k-monitor-page.ts`, replace:

```ts
import "../../js/api_shared_utils.js";
```

with:

```ts
import {
  createBrowserStorageAccess,
  readStorageValue,
  removeStorageValue,
  writeStorageValue
} from "../storage/browser-storage";
import { createStone2kMonitorService } from "../services/stone-2k-monitor";
```

Remove `ApiSharedUtilsLike`, `MonitorWindow`, and `REMOTE_API_BASE`.

Replace `getApiBases` and `apiGet` with:

```ts
function createMonitorService() {
  return createStone2kMonitorService({
    windowLike: typeof window === "undefined" ? null : window
  });
}
```

Replace `hasStoredAccess` with:

```ts
function hasStoredAccess(): boolean {
  const storageAccess = createBrowserStorageAccess({
    windowLike: typeof window === "undefined" ? null : window
  });
  return readStorageValue(storageAccess.session(), MONITOR_ACCESS_STORAGE_KEY) === "granted";
}
```

Replace `setStoredAccess` with:

```ts
function setStoredAccess(granted: boolean): void {
  const storageAccess = createBrowserStorageAccess({
    windowLike: typeof window === "undefined" ? null : window
  });
  const storageLike = storageAccess.session();
  if (granted) {
    writeStorageValue(storageLike, MONITOR_ACCESS_STORAGE_KEY, "granted");
    return;
  }
  removeStorageValue(storageLike, MONITOR_ACCESS_STORAGE_KEY);
}
```

Replace the request in `refreshRuns`:

```ts
const result = await apiGet(buildQueryPath());
```

with:

```ts
const result = await createMonitorService().listRuns({
  names: getInputValue("stone-filter-names"),
  sortValue: getInputValue("stone-sort-by") || "score_desc",
  startAt: getInputValue("stone-start-at"),
  endAt: getInputValue("stone-end-at"),
  limit: Math.floor(toNumber(getInputValue("stone-filter-limit"), 50)),
  latestOnly: isChecked("stone-filter-latest")
});
```

After this replacement, delete the page-local `buildQueryPath` and `apiGet` functions because query construction and fetch ownership are now owned by `src/services/stone-2k-monitor.ts`.

- [ ] **Step 5: Add page-legacy allowlist shrink assertions for admin and stone**

In `tests/unit/page-legacy-runtime-boundary-audit-helpers.spec.ts`, add:

```ts
  it("keeps operational TS pages out of the legacy api shared utils allowlist", () => {
    expect(PAGE_LEGACY_IMPORT_ALLOWLIST["admin-page.ts"]).toBeUndefined();
    expect(PAGE_LEGACY_IMPORT_ALLOWLIST["stone-2k-monitor-page.ts"]).toBeUndefined();
  });
```

- [ ] **Step 6: Remove page files from service-boundary and page-legacy allowlists**

In `scripts/service-boundary-audit.mjs`, replace:

```js
const DIRECT_SERVICE_USAGE_ALLOWLIST = new Set([
  "js/admin_rescue_client_runtime.js",
  "src/pages/admin-page.ts",
  "src/pages/stone-2k-monitor-page.ts"
]);
```

with:

```js
const DIRECT_SERVICE_USAGE_ALLOWLIST = new Set(["js/admin_rescue_client_runtime.js"]);
```

In `scripts/page-legacy-runtime-boundary-audit.mjs`, remove these entries:

```js
  "admin-page.ts": new Set(["../../js/api_shared_utils.js"]),
```

```js
  "stone-2k-monitor-page.ts": new Set(["../../js/api_shared_utils.js"]),
```

- [ ] **Step 7: Run targeted tests and service/page audits**

Run:

```bash
npx vitest run tests/unit/service-boundary-audit-helpers.spec.ts tests/unit/page-legacy-runtime-boundary-audit-helpers.spec.ts tests/unit/admin-replay-upload-ui.spec.ts tests/unit/services-api-client.spec.ts tests/unit/services-stone-2k-monitor.spec.ts tests/unit/storage-browser-storage.spec.ts
npm run audit:service-boundary
node scripts/page-legacy-runtime-boundary-audit.mjs
```

Expected: all PASS. `npm run audit:service-boundary` must not report `src/pages/admin-page.ts` or `src/pages/stone-2k-monitor-page.ts`; the page legacy audit must not report admin or stone page imports.

- [ ] **Step 8: Run page smoke checks for affected operational pages**

Run:

```bash
npm run test:smoke:pages
```

Expected: PASS. If the broad page smoke suite has an unrelated flake, rerun the specific failing spec once and record the result in `docs/EXECUTION_LOG.md`.

- [ ] **Step 9: Commit service-boundary page migration**

Run:

```bash
git add src/pages/admin-page.ts src/pages/stone-2k-monitor-page.ts scripts/page-legacy-runtime-boundary-audit.mjs scripts/service-boundary-audit.mjs tests/unit/service-boundary-audit-helpers.spec.ts tests/unit/page-legacy-runtime-boundary-audit-helpers.spec.ts
git commit -m "refactor: move operational pages behind service owners"
```

## Task 4: Shrink Modes Page Legacy Import Allowlist

**Files:**
- Modify: `src/pages/modes-page.ts`
- Modify: `scripts/page-legacy-runtime-boundary-audit.mjs`
- Modify: `tests/unit/page-legacy-runtime-boundary-audit-helpers.spec.ts`
- Test: `tests/refactor-contract/pages-modes-page-system.smoke.spec.ts`

- [ ] **Step 1: Add a failing baseline test for modes allowlist removal**

In `tests/unit/page-legacy-runtime-boundary-audit-helpers.spec.ts`, add:

```ts
  it("keeps modes page out of the legacy page import allowlist", () => {
    expect(PAGE_LEGACY_IMPORT_ALLOWLIST["modes-page.ts"]).toBeUndefined();
  });
```

- [ ] **Step 2: Run the targeted test and verify it fails**

Run:

```bash
npx vitest run tests/unit/page-legacy-runtime-boundary-audit-helpers.spec.ts
```

Expected: FAIL because `modes-page.ts` is still allowlisted for `../../js/theme_manager.js`.

- [ ] **Step 3: Remove the legacy import from modes page**

In `src/pages/modes-page.ts`, delete:

```ts
import "../../js/theme_manager.js";
```

Do not change any page copy, selectors, mode links, or storage keys.

- [ ] **Step 4: Remove modes page from the page legacy allowlist**

In `scripts/page-legacy-runtime-boundary-audit.mjs`, delete this entry:

```js
  "modes-page.ts": new Set(["../../js/theme_manager.js"]),
```

- [ ] **Step 5: Run targeted unit and page-system smoke**

Run:

```bash
npx vitest run tests/unit/page-legacy-runtime-boundary-audit-helpers.spec.ts tests/unit/bootstrap-page-bootstrap.spec.ts tests/unit/modes-logo-css.spec.ts
node scripts/page-legacy-runtime-boundary-audit.mjs
npx playwright test --config=playwright.refactor-contract.config.ts tests/refactor-contract/pages-modes-page-system.smoke.spec.ts
```

Expected: all PASS. The audit output should show the legacy import count reduced by one relative to the pre-task baseline.

- [ ] **Step 6: Commit modes allowlist shrink**

Run:

```bash
git add src/pages/modes-page.ts scripts/page-legacy-runtime-boundary-audit.mjs tests/unit/page-legacy-runtime-boundary-audit-helpers.spec.ts
git commit -m "refactor: remove modes page legacy theme import"
```

## Task 5: Update Architecture Evidence And Run Stage Gates

**Files:**
- Modify: `docs/ROADMAP_MILESTONES.md`
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/EXECUTION_LOG.md` only if smoke required rerun evidence

- [ ] **Step 1: Record guardrail delta**

At the top of `docs/ARCHITECTURE_GUARDRAILS.md`, add:

```md
# Guardrail Delta (2026-06-13, Stage-1 Legacy Retirement)

## Batch Impact
- `modes-page.ts` no longer imports `../../js/theme_manager.js`; the page legacy import allowlist shrank by one entry.
- `admin-page.ts` and `stone-2k-monitor-page.ts` moved direct storage/API behavior behind `src/services` and `src/storage` owners and no longer import `../../js/api_shared_utils.js`.
- `DIRECT_SERVICE_USAGE_ALLOWLIST` now retains only the legacy runtime exception that still lives under `js/`.

## Verification
- `node scripts/page-legacy-runtime-boundary-audit.mjs`
- `npm run audit:service-boundary`
- targeted unit tests for storage/service owners
- affected page smoke checks
```

- [ ] **Step 2: Record roadmap progress**

At the top of `docs/ROADMAP_MILESTONES.md`, add:

```md
# Stage-1 Legacy Retirement Delta (2026-06-13)

## Phase Decision
- `WS4-03-next`
  - status: in_progress
  - progress: `modes-page.ts` removed one legacy page import and left the page-system smoke passing
- `WS6-01A`
  - status: in_progress
  - progress: operational page direct storage/API exceptions moved into typed `services/storage` owners

## Evidence
- `node scripts/page-legacy-runtime-boundary-audit.mjs`
- `npm run audit:service-boundary`
- targeted Vitest suites for `browser-storage`, `api-client`, and `stone-2k-monitor`
```

- [ ] **Step 3: Run first-stage gate set**

Run:

```bash
npm run audit:entry-manifest
npm run audit:page-legacy-runtime-boundary
npm run audit:service-boundary
npm run test:unit
npm run test:smoke:pages
npm run build
```

Expected: all PASS.

- [ ] **Step 4: Run prepush gate**

Run:

```bash
npm run verify:prepush
```

Expected: PASS. If smoke flakes once and a no-code rerun passes, record the failed test name, failure shape, and rerun result in `docs/EXECUTION_LOG.md`, then rerun `npm run verify:prepush`.

- [ ] **Step 5: Commit docs and final verification evidence**

Run:

```bash
git add docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/EXECUTION_LOG.md
git commit -m "docs: record stage 1 legacy retirement evidence"
```

If `docs/EXECUTION_LOG.md` was not changed, omit it from `git add`.

## Self-Review Checklist

- Spec coverage:
  - Batch 1 page shell legacy retirement: Task 4.
  - Batch 2 service/storage owner closure: Tasks 1-3.
  - Testing and gates: Task 5.
  - Documentation updates: Task 5.
  - Engine takeover intentionally excluded from this first execution slice per the spec risk controls.
- Placeholder scan:
  - The plan contains no unresolved markers or incomplete file names.
- Type consistency:
  - `createBrowserStorageAccess`, `readStorageValue`, `writeStorageValue`, `removeStorageValue`, `buildApiBaseCandidates`, `createJsonApiClient`, `createAdminService`, `buildStone2kRunsPath`, and `createStone2kMonitorService` are defined before later tasks consume them.
