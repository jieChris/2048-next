import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it, vi } from "vitest";

const originalDocument = globalThis.document;
const originalWindow = globalThis.window;

function restoreGlobals(): void {
  if (originalDocument === undefined) delete (globalThis as { document?: Document }).document;
  else Object.defineProperty(globalThis, "document", { value: originalDocument, configurable: true, writable: true });
  if (originalWindow === undefined) delete (globalThis as { window?: Window }).window;
  else Object.defineProperty(globalThis, "window", { value: originalWindow, configurable: true, writable: true });
}

function installDom(url = "https://example.test/admin.html?view=dashboard"): JSDOM {
  const dom = new JSDOM(`<!doctype html><html><body data-admin-access="checking">
    <div id="admin-gate"><span id="admin-gate-text"></span></div>
    <div id="admin-shell" hidden><aside id="admin-sidebar"></aside><div id="admin-sidebar-backdrop" hidden></div><div><header id="admin-topbar"></header><main id="admin-content"></main></div></div>
    <dialog id="admin-dialog"><div id="admin-dialog-title"></div><div id="admin-dialog-body"></div><div id="admin-dialog-actions"></div></dialog>
    <div id="admin-toast" hidden></div>
  </body></html>`, { url });
  Object.defineProperty(globalThis, "document", { value: dom.window.document, configurable: true, writable: true });
  Object.defineProperty(globalThis, "window", { value: dom.window, configurable: true, writable: true });
  dom.window.localStorage.setItem("2048_auth_token_v1", "admin-token");
  return dom;
}

async function flush(): Promise<void> {
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));
}

describe("Next admin console", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.resetModules();
    restoreGlobals();
  });

  it("renders the authorized dashboard shell and has no beta qualification module", async () => {
    const dom = installDom();
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/admin/me")) return { json: async () => ({ success: true, data: { user_id: 0, admin: true, rootAdmin: true, canManageSuperAdmins: true } }) };
      if (url.includes("/admin/dashboard")) return { json: async () => ({ success: true, data: { metrics: { total_users: 12, active_users: 10, inactive_users: 2, new_users_7d: 3, active_users_7d: 7, pending_rescue_offers: 1 }, recent_users: [], recent_audit: [], recent_events: [] } }) };
      if (url.includes("/admin/record-delivery-health")) return { json: async () => ({ success: true, data: { scope: "server_observed_only", summary: { observed: 8, accepted: 5, duplicate: 2, authentication_failed: 1, payload_too_large: 0, rate_limited: 0, server_error: 0, replay_invalid: 0 }, upload_tasks: [{ status: "completed", total: 3 }] } }) };
      return { json: async () => ({ success: true, data: [] }) };
    }));
    const { bootstrapAdminPage } = await import("../../src/pages/admin-page");

    bootstrapAdminPage();
    await flush();

    expect(dom.window.document.getElementById("admin-shell")?.hidden).toBe(false);
    expect(dom.window.document.getElementById("admin-sidebar")?.textContent).toContain("用户中心");
    expect(dom.window.document.getElementById("admin-content")?.textContent).toContain("12");
    expect(dom.window.document.getElementById("admin-content")?.textContent).toContain("服务器已观测投递");
    expect(dom.window.document.getElementById("admin-content")?.textContent).toContain("无法统计从未到达服务器的浏览器本地记录");
    expect(dom.window.document.body.textContent).not.toContain("内测用户管理");
    expect(dom.window.document.body.textContent).not.toContain("内测资格");
  });

  it("renders an escaped manual moderation queue from the content moderation navigation", async () => {
    const dom = installDom("https://example.test/admin.html?view=moderation");
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/auth/refresh")) return { json: async () => ({ success: true }) };
      if (url.includes("/admin/me")) return { json: async () => ({ success: true, data: { user_id: 0, admin: true, rootAdmin: true } }) };
      if (url.includes("/admin/moderation/submissions")) return { json: async () => ({ success: true, data: [{ id: "submission-1", account_user_id: 42, game_user_id: 84, submitted_content: '<img src=x onerror="window.__moderationPwned=true">', reason_code: "model_review", status: "manual_review", model_version: "deepseek-v4-flash", submitted_at: "2026-08-23T10:00:00Z", updated_at: "2026-08-23T10:01:00Z" }] }) };
      if (url.includes("/admin/integrations/deepseek")) return { json: async () => ({ success: true, data: { configured: false, status: "unconfigured" } }) };
      return { json: async () => ({ success: true, data: [] }) };
    }));
    const { bootstrapAdminPage } = await import("../../src/pages/admin-page");

    bootstrapAdminPage();
    await flush();

    expect(dom.window.document.getElementById("admin-sidebar")?.textContent).toContain("内容审核");
    const content = dom.window.document.getElementById("admin-content");
    expect(content?.textContent).toContain("#42");
    expect(content?.textContent).toContain("#84");
    expect(content?.textContent).toContain('<img src=x onerror="window.__moderationPwned=true">');
    expect(content?.querySelector("img")).toBeNull();
    expect(content?.innerHTML).toContain("&lt;img src=x onerror=");
    expect(content?.textContent).toContain("model_review");
    expect(content?.textContent).toContain("manual_review");
    expect(content?.textContent).toContain("deepseek-v4-flash");
  });

  it("reviews private avatar submissions with the dedicated contract when P2 is enabled", async () => {
    const dom = installDom("https://example.test/admin.html?view=moderation");
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/auth/refresh")) return { json: async () => ({ success: true }) };
      if (url.includes("/admin/me")) return { json: async () => ({ success: true, data: { user_id: 0, admin: true, rootAdmin: true, avatar_review_enabled: true } }) };
      if (url.includes("/admin/avatar-submissions/avatar-1/review")) return { json: async () => ({ success: true, data: { id: "avatar-1", status: "approved" } }) };
      if (url.includes("/admin/avatar-submissions")) return { json: async () => ({ success: true, data: [{ id: "avatar-1", account_user_id: 42, game_user_id: 84, nickname: "Avatar Player", status: "pending", moderation_status: "manual_review", reason_code: "safe", byte_size: 12345, width: 256, height: 256, submitted_at: "2026-08-24T10:00:00Z", updated_at: "2026-08-24T10:01:00Z" }] }) };
      if (url.includes("/admin/moderation/submissions")) return { json: async () => ({ success: true, data: [] }) };
      if (url.includes("/admin/integrations/deepseek")) return { json: async () => ({ success: true, data: { configured: false, status: "unconfigured" } }) };
      return { json: async () => ({ success: true, data: [] }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    const { bootstrapAdminPage } = await import("../../src/pages/admin-page");

    bootstrapAdminPage();
    await flush();

    const content = dom.window.document.getElementById("admin-content");
    expect(content?.textContent).toContain("Avatar Player");
    expect(content?.textContent).toContain("账号 #42");
    expect(content?.textContent).toContain("游戏 #84");
    const image = content?.querySelector<HTMLImageElement>('.admin-avatar-review-image');
    expect(image?.src).toContain("/api/admin/avatar-submissions/avatar-1/image");
    content?.querySelector<HTMLButtonElement>('[data-avatar-approve="avatar-1"]')?.click();
    dom.window.document.querySelector<HTMLButtonElement>("[data-dialog-confirm]")?.click();
    await flush();

    content?.querySelector<HTMLButtonElement>('[data-avatar-reject="avatar-1"]')?.click();
    const reason = dom.window.document.querySelector<HTMLSelectElement>("#dialog-avatar-review-reason");
    if (reason) reason.value = "embedded_text";
    dom.window.document.querySelector<HTMLButtonElement>("[data-dialog-confirm]")?.click();
    await flush();

    const reviews = fetchMock.mock.calls.filter(([input]) => String(input).includes("/admin/avatar-submissions/avatar-1/review"));
    expect(reviews.map(([, init]) => JSON.parse(String((init as RequestInit | undefined)?.body)))).toEqual([
      { decision: "approved", reason_code: "admin_approved" },
      { decision: "rejected", reason_code: "embedded_text" }
    ]);
    const idempotencyKeys = reviews.map(([, init]) => new Headers((init as RequestInit | undefined)?.headers).get("Idempotency-Key"));
    expect(idempotencyKeys.every(Boolean)).toBe(true);
    expect(new Set(idempotencyKeys).size).toBe(2);
  });

  it("removes the legacy avatar URL editor only when reviewed avatars are enabled", async () => {
    const dom = installDom("https://example.test/admin.html?view=users&user=42");
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/auth/refresh")) return { json: async () => ({ success: true }) };
      if (url.includes("/admin/me")) return { json: async () => ({ success: true, data: { user_id: 0, admin: true, rootAdmin: true, avatar_review_enabled: true } }) };
      if (url.includes("/admin/users/42/profile")) return { json: async () => ({ success: true, data: {} }) };
      if (url.includes("/admin/users/42")) return { json: async () => ({ success: true, data: { user: { id: 42, email: "player@example.test", nickname: "Player", display_name: "Player", avatar_url: "https://example.test/old.webp", role: "player", is_active: true }, stats: {}, leaderboard: [], achievements: [], rescue_offers: [], audit: [] } }) };
      return { json: async () => ({ success: true, data: [] }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    const { bootstrapAdminPage } = await import("../../src/pages/admin-page");

    bootstrapAdminPage();
    await flush();
    dom.window.document.querySelector<HTMLButtonElement>("[data-edit-profile]")?.click();

    expect(dom.window.document.getElementById("dialog-avatar")).toBeNull();
    dom.window.document.querySelector<HTMLButtonElement>("[data-dialog-confirm]")?.click();
    await flush();
    const update = fetchMock.mock.calls.find(([input]) => String(input).includes("/admin/users/42/profile"));
    expect(JSON.parse(String((update?.[1] as RequestInit | undefined)?.body))).toEqual({ nickname: "Player", display_name: "Player" });
  });

  it("keeps the legacy avatar URL editor when the reviewed workflow is unavailable", async () => {
    const dom = installDom("https://example.test/admin.html?view=users&user=42");
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/auth/refresh")) return { json: async () => ({ success: true }) };
      if (url.includes("/admin/me")) return { json: async () => ({ success: true, data: { user_id: 0, admin: true, rootAdmin: true } }) };
      if (url.includes("/admin/users/42/profile")) return { json: async () => ({ success: true, data: {} }) };
      if (url.includes("/admin/users/42")) return { json: async () => ({ success: true, data: { user: { id: 42, email: "player@example.test", nickname: "Player", display_name: "Player", avatar_url: "https://example.test/old.webp", role: "player", is_active: true }, stats: {}, leaderboard: [], achievements: [], rescue_offers: [], audit: [] } }) };
      return { json: async () => ({ success: true, data: [] }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    const { bootstrapAdminPage } = await import("../../src/pages/admin-page");

    bootstrapAdminPage();
    await flush();
    dom.window.document.querySelector<HTMLButtonElement>("[data-edit-profile]")?.click();

    expect(dom.window.document.getElementById("dialog-avatar")).not.toBeNull();
    dom.window.document.querySelector<HTMLButtonElement>("[data-dialog-confirm]")?.click();
    await flush();
    const update = fetchMock.mock.calls.find(([input]) => String(input).includes("/admin/users/42/profile"));
    expect(JSON.parse(String((update?.[1] as RequestInit | undefined)?.body))).toMatchObject({ avatar_url: "https://example.test/old.webp" });
  });

  it("offers a dedicated profile background catalog with three-file variant upload", async () => {
    const dom = installDom("https://example.test/admin.html?view=backgrounds");
    vi.stubGlobal("FormData", dom.window.FormData);
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/admin/me")) return { json: async () => ({ success: true, data: { user_id: 0, admin: true, rootAdmin: true } }) };
      if (url.includes("/admin/profile-background/variants")) return { json: async () => ({ success: true, data: [
        { id: "11111111-1111-4111-8111-111111111111", scene_family_id: "validated-family", variant: "day", status: "validated" },
        { id: "22222222-2222-4222-8222-222222222222", scene_family_id: "validated-family", variant: "night", status: "validated" },
        { id: "66666666-6666-4666-8666-666666666666", scene_family_id: "paired-family", variant: "day", status: "paired" },
        { id: "77777777-7777-4777-8777-777777777777", scene_family_id: "published-family", variant: "night", status: "published" },
        { id: "88888888-8888-4888-8888-888888888888", scene_family_id: "archived-family", variant: "day", status: "archived" }
      ] }) };
      if (url.includes("/admin/profile-background/scenes") && init?.method === "POST") throw new Error("pair failed");
      if (url.includes("/admin/profile-background/scenes")) return { json: async () => ({ success: true, data: [
        { id: "33333333-3333-4333-8333-333333333333", scene_family_id: "test-family", day_variant_id: "11111111-1111-4111-8111-111111111111", night_variant_id: "22222222-2222-4222-8222-222222222222", status: "published", is_default: true },
        { id: "44444444-4444-4444-8444-444444444444", scene_family_id: "paired-family", day_variant_id: "11111111-1111-4111-8111-111111111111", night_variant_id: "22222222-2222-4222-8222-222222222222", status: "paired", is_default: false },
        { id: "55555555-5555-4555-8555-555555555555", scene_family_id: "archived-family", day_variant_id: "11111111-1111-4111-8111-111111111111", night_variant_id: "22222222-2222-4222-8222-222222222222", status: "archived", is_default: false }
      ] }) };
      return { json: async () => ({ success: true, data: [] }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    const { bootstrapAdminPage } = await import("../../src/pages/admin-page");

    bootstrapAdminPage();
    await flush();

    expect(dom.window.document.getElementById("admin-sidebar")?.textContent).toContain("主页背景");
    const form = dom.window.document.querySelector<HTMLFormElement>("[data-background-variant-upload]");
    expect(form).not.toBeNull();
    expect(form?.querySelector<HTMLInputElement>('input[name="sky"]')?.type).toBe("file");
    expect(form?.querySelector<HTMLInputElement>('input[name="city"]')?.type).toBe("file");
    expect(form?.querySelector<HTMLInputElement>('input[name="foreground"]')?.type).toBe("file");
    expect(form?.querySelector<HTMLSelectElement>('select[name="variant"]')?.textContent).toContain("白天");
    const dayOptions = Array.from(dom.window.document.querySelectorAll<HTMLOptionElement>('select[name="day_variant_id"] option')).map((option) => option.value).filter(Boolean);
    const nightOptions = Array.from(dom.window.document.querySelectorAll<HTMLOptionElement>('select[name="night_variant_id"] option')).map((option) => option.value).filter(Boolean);
    expect(dayOptions).toEqual(["11111111-1111-4111-8111-111111111111"]);
    expect(nightOptions).toEqual(["22222222-2222-4222-8222-222222222222"]);
    expect(dom.window.document.querySelector<HTMLInputElement>('[data-background-scene-create] input[name="name"]')).not.toBeNull();
    expect(dom.window.document.getElementById("admin-content")?.textContent).toContain("完整昼夜场景");
    expect(dom.window.document.querySelector('[data-background-default="33333333-3333-4333-8333-333333333333"]')).not.toBeNull();
    expect(dom.window.document.querySelector('[data-background-archive="33333333-3333-4333-8333-333333333333"]')).not.toBeNull();
    expect(dom.window.document.querySelector('[data-background-publish="33333333-3333-4333-8333-333333333333"]')).toBeNull();
    expect(dom.window.document.querySelector('[data-background-publish="44444444-4444-4444-8444-444444444444"]')).not.toBeNull();
    expect(dom.window.document.querySelector('[data-background-default="44444444-4444-4444-8444-444444444444"]')).toBeNull();
    expect(dom.window.document.querySelector('[data-background-archive="44444444-4444-4444-8444-444444444444"]')).toBeNull();
    expect(dom.window.document.querySelector('[data-background-publish="55555555-5555-4555-8555-555555555555"]')).toBeNull();
    expect(dom.window.document.querySelector('[data-background-default="55555555-5555-4555-8555-555555555555"]')).toBeNull();
    expect(dom.window.document.querySelector('[data-background-archive="55555555-5555-4555-8555-555555555555"]')).toBeNull();
    const restoreBuiltIn = dom.window.document.querySelector<HTMLButtonElement>('[data-background-default="default"]');
    expect(restoreBuiltIn?.textContent).toContain("恢复内置默认");
    restoreBuiltIn?.click();
    await flush();
    expect(fetchMock.mock.calls.some(([input, init]) => String(input).includes("/admin/profile-background/default") && init?.body === JSON.stringify({ scene_id: "default" }))).toBe(true);
    const source = readFileSync(resolve(process.cwd(), "src/pages/admin-page.ts"), "utf8");
    expect(source).toContain('"Idempotency-Key": randomId("profile-background", 16)');
    const sceneForm = dom.window.document.querySelector<HTMLFormElement>("[data-background-scene-create]")!;
    sceneForm.querySelector<HTMLInputElement>('input[name="scene_family_id"]')!.value = "test-family";
    sceneForm.querySelector<HTMLInputElement>('input[name="name"]')!.value = "Test scene";
    sceneForm.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
    await flush();
    expect(sceneForm.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(false);
    expect(dom.window.document.getElementById("admin-toast")?.textContent).toContain("pair failed");
  });

  it("submits each moderation decision once with a fresh idempotency key", async () => {
    const dom = installDom("https://example.test/admin.html?view=moderation");
    let releaseApprove = (): void => {};
    const approveGate = new Promise<void>((resolvePromise) => { releaseApprove = resolvePromise; });
    let reviewCount = 0;
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/auth/refresh")) return { json: async () => ({ success: true }) };
      if (url.includes("/admin/me")) return { json: async () => ({ success: true, data: { user_id: 0, admin: true, rootAdmin: true } }) };
      if (url.includes("/admin/moderation/submissions/submission-1/review")) {
        reviewCount += 1;
        if (reviewCount === 1) await approveGate;
        return { json: async () => ({ success: true, data: { id: "submission-1", status: "approved" } }) };
      }
      if (url.includes("/admin/moderation/submissions")) return { json: async () => ({ success: true, data: [{ id: "submission-1", account_user_id: 42, game_user_id: 84, submitted_content: "hello", reason_code: "model_review", status: "manual_review", model_version: "deepseek-v4-flash", submitted_at: "2026-08-23T10:00:00Z", updated_at: "2026-08-23T10:01:00Z" }] }) };
      if (url.includes("/admin/integrations/deepseek")) return { json: async () => ({ success: true, data: { configured: false, status: "unconfigured" } }) };
      return { json: async () => ({ success: true, data: [] }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    const { bootstrapAdminPage } = await import("../../src/pages/admin-page");

    bootstrapAdminPage();
    await flush();

    const approve = dom.window.document.querySelector<HTMLButtonElement>("[data-moderation-approve]");
    approve?.click();
    approve?.click();
    await Promise.resolve();
    expect(approve?.disabled).toBe(true);
    expect(fetchMock.mock.calls.filter(([input]) => String(input).includes("/submission-1/review"))).toHaveLength(1);
    releaseApprove();
    await flush();

    dom.window.document.querySelector<HTMLButtonElement>("[data-moderation-reject]")?.click();
    const rejectReason = dom.window.document.getElementById("dialog-moderation-reason") as HTMLSelectElement;
    expect(Array.from(rejectReason.options, (option) => option.value)).toEqual(["sexual", "violence", "hate", "illegal", "self_harm", "personal_data", "spam", "other", "admin_rejected"]);
    rejectReason.value = "hate";
    dom.window.document.querySelector<HTMLButtonElement>("[data-dialog-confirm]")?.click();
    await flush();

    dom.window.document.querySelector<HTMLButtonElement>("[data-moderation-retry]")?.click();
    await flush();

    const reviewCalls = fetchMock.mock.calls.filter(([input]) => String(input).includes("/submission-1/review"));
    expect(reviewCalls.map(([, init]) => JSON.parse(String((init as RequestInit | undefined)?.body)))).toEqual([
      { decision: "approved", reason_code: "admin_approved" },
      { decision: "rejected", reason_code: "hate" },
      { decision: "retry", reason_code: "admin_retry" }
    ]);
    const keys = reviewCalls.map(([, init]) => new Headers((init as RequestInit | undefined)?.headers).get("Idempotency-Key"));
    expect(keys.every(Boolean)).toBe(true);
    expect(new Set(keys).size).toBe(3);
  });

  it("keeps DeepSeek secrets out of the DOM and step-up protects every write", async () => {
    const dom = installDom("https://example.test/admin.html?view=moderation");
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/auth/refresh")) return { json: async () => ({ success: true }) };
      if (url.includes("/admin/me")) return { json: async () => ({ success: true, data: { user_id: 0, admin: true, rootAdmin: true } }) };
      if (url.includes("/admin/moderation/submissions")) return { json: async () => ({ success: true, data: [] }) };
      if (url.includes("/admin/integrations/deepseek/test")) return { json: async () => ({ success: true, data: { status: "pending", key_version: 2 } }) };
      if (url.includes("/admin/integrations/deepseek/key")) return { json: async () => ({ success: true, data: { configured: true, status: "active", masked_key: "sk-****5678" } }) };
      if (url.includes("/admin/integrations/deepseek")) return { json: async () => ({ success: true, data: { configured: true, status: "active", masked_key: "sk-****5678", api_key: "sk-raw-never-render", provider_response: "raw-provider-never-render", updated_at: "2026-08-23T10:00:00Z" } }) };
      return { json: async () => ({ success: true, data: [] }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    const { bootstrapAdminPage } = await import("../../src/pages/admin-page");

    bootstrapAdminPage();
    await flush();

    expect(dom.window.document.getElementById("admin-content")?.textContent).toContain("sk-****5678");
    expect(dom.window.document.body.textContent).not.toContain("sk-raw-never-render");
    expect(dom.window.document.body.textContent).not.toContain("raw-provider-never-render");

    dom.window.document.querySelector<HTMLButtonElement>("[data-deepseek-configure]")?.click();
    const apiKey = dom.window.document.getElementById("dialog-deepseek-api-key") as HTMLInputElement;
    const configurePassword = dom.window.document.getElementById("dialog-deepseek-password") as HTMLInputElement;
    expect(apiKey.type).toBe("password");
    expect(configurePassword.type).toBe("password");
    expect(apiKey.autocomplete).toBe("off");
    expect(configurePassword.autocomplete).toBe("current-password");
    apiKey.value = "sk-plaintext-once";
    configurePassword.value = "current-password-once";
    dom.window.document.querySelector<HTMLButtonElement>("[data-dialog-confirm]")?.click();
    expect(apiKey.value).toBe("");
    expect(configurePassword.value).toBe("");
    await flush();

    dom.window.document.querySelector<HTMLButtonElement>("[data-deepseek-test]")?.click();
    const testPassword = dom.window.document.getElementById("dialog-deepseek-password") as HTMLInputElement;
    testPassword.value = "test-password-once";
    dom.window.document.querySelector<HTMLButtonElement>("[data-dialog-confirm]")?.click();
    expect(testPassword.value).toBe("");
    await flush();
    expect(dom.window.document.getElementById("admin-toast")?.textContent).toContain("测试进行中");

    dom.window.document.querySelector<HTMLButtonElement>("[data-deepseek-disable]")?.click();
    const disablePassword = dom.window.document.getElementById("dialog-deepseek-password") as HTMLInputElement;
    disablePassword.value = "disable-password-once";
    dom.window.document.querySelector<HTMLButtonElement>("[data-dialog-confirm]")?.click();
    expect(disablePassword.value).toBe("");
    await flush();

    const writes = fetchMock.mock.calls.filter(([, init]) => ["PUT", "POST", "DELETE"].includes(String((init as RequestInit | undefined)?.method)));
    expect(writes.map(([, init]) => JSON.parse(String((init as RequestInit | undefined)?.body)))).toEqual([
      { api_key: "sk-plaintext-once", current_password: "current-password-once" },
      { current_password: "test-password-once" },
      { current_password: "disable-password-once" }
    ]);
    const keys = writes.map(([, init]) => new Headers((init as RequestInit | undefined)?.headers).get("Idempotency-Key"));
    expect(keys.every(Boolean)).toBe(true);
    expect(new Set(keys).size).toBe(3);
  });

  it("uses the HttpOnly admin session when no local bearer is available", async () => {
    const dom = installDom();
    dom.window.localStorage.removeItem("2048_auth_token_v1");
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/admin/me")) {
        const headers = new Headers(init?.headers || {});
        expect(headers.get("Authorization")).toBeNull();
        expect(init?.credentials).toBe("include");
        return { json: async () => ({ success: true, data: { user_id: 0, admin: true, rootAdmin: true } }) };
      }
      if (url.includes("/admin/dashboard")) {
        return { json: async () => ({ success: true, data: { metrics: {}, recent_users: [], recent_audit: [], recent_events: [] } }) };
      }
      return { json: async () => ({ success: true, data: [] }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    const { bootstrapAdminPage } = await import("../../src/pages/admin-page");

    bootstrapAdminPage();
    await flush();

    expect(dom.window.document.getElementById("admin-shell")?.hidden).toBe(false);
  });

  it("keeps Tabler and admin styles isolated to the admin entry", () => {
    const root = process.cwd();
    const entry = readFileSync(resolve(root, "src/entries/admin.ts"), "utf8");
    const html = readFileSync(resolve(root, "admin.html"), "utf8");

    expect(entry).toContain('@tabler/core/dist/css/tabler.min.css');
    expect(entry).toContain('style/admin_page.css');
    expect(html).not.toContain("main.css");
    expect(html).not.toContain("palette_page.css");
    const htmlDocument = new JSDOM(html).window.document;
    expect(htmlDocument.getElementById("admin-dialog")?.getAttribute("aria-labelledby")).toBe("admin-dialog-title");
  });

  it("implements dry-run then official record import without editable score fields", () => {
    const root = process.cwd();
    const page = readFileSync(resolve(root, "src/pages/admin-page.ts"), "utf8");

    expect(page).toContain("/record-import/preview");
    expect(page).toContain("/record-import`");
    expect(page).toContain("official_v1");
    expect(page).not.toContain('id="dialog-import-score"');
    expect(page).not.toContain('id="dialog-import-duration"');
  });

  it("uses URL parameters for stable module and user detail navigation", () => {
    const page = readFileSync(resolve(process.cwd(), "src/pages/admin-page.ts"), "utf8");

    expect(page).toContain('const ADMIN_DENIED_REDIRECT = "/404.html";');
    expect(page).toContain('url.searchParams.set("view", view)');
    expect(page).toContain('url.searchParams.get("user")');
    expect(page).toContain('window.addEventListener("popstate"');
  });

  it("lists safe device-session metadata and requires a reason to revoke one", async () => {
    const dom = installDom("https://example.test/admin.html?view=users&user=42&section=sessions");
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/admin/me")) return { json: async () => ({ success: true, data: { user_id: 99, admin: true } }) };
      if (url.includes("/admin/users/42/device-sessions/device_session_1/revoke")) return { json: async () => ({ success: true, data: { revoked: true } }) };
      if (url.includes("/admin/users/42/device-sessions")) return { json: async () => ({ success: true, data: [{ id: "device_session_1", device_label: "Safari on Mac", created_at: "2026-08-01T00:00:00Z", last_used_at: "2026-08-19T00:00:00Z", status: "active" }] }) };
      if (url.includes("/admin/users/42")) return { json: async () => ({ success: true, data: { user: { id: 42, email: "player@example.com", nickname: "Player", role: "player", is_active: true }, stats: {}, leaderboard: [], achievements: [], rescue_offers: [], audit: [] } }) };
      return { json: async () => ({ success: true, data: [] }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    const { bootstrapAdminPage } = await import("../../src/pages/admin-page");

    bootstrapAdminPage();
    await flush();
    expect(dom.window.document.getElementById("admin-content")?.textContent).toContain("Safari on Mac");
    expect(dom.window.document.body.textContent).not.toContain("token_hash");
    dom.window.document.querySelector<HTMLElement>("[data-revoke-device-session]")?.click();
    const reason = dom.window.document.getElementById("dialog-device-session-reason") as HTMLTextAreaElement;
    reason.value = "设备已丢失";
    dom.window.document.querySelector<HTMLElement>("[data-dialog-confirm]")?.click();
    await flush();

    const revokeCall = fetchMock.mock.calls.find(([input]) => String(input).includes("/device_session_1/revoke"));
    expect(JSON.parse(String((revokeCall?.[1] as RequestInit | undefined)?.body))).toEqual({ reason: "设备已丢失" });
  });

  it("renders the fixed read-only reconciliation snapshot in existing data tools", async () => {
    const dom = installDom("https://example.test/admin.html?view=tools");
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/admin/me")) return { json: async () => ({ success: true, data: { user_id: 99, admin: true } }) };
      if (url.includes("/admin/reconciliation")) return { json: async () => ({ success: true, data: { readonly: true, generated_at: "2026-08-19T00:00:00Z", totals: { total_records: 100, active_records: 98, players: 12 }, leaderboard_modes: [], top_records: [], target_speed_eligibility: [] } }) };
      if (url.includes("/admin/tables")) return { json: async () => ({ success: true, data: [] }) };
      return { json: async () => ({ success: true, data: [] }) };
    }));
    const { bootstrapAdminPage } = await import("../../src/pages/admin-page");

    bootstrapAdminPage();
    await flush();

    const content = dom.window.document.getElementById("admin-content")?.textContent || "";
    expect(content).toContain("固定只读发布对账");
    expect(content).toContain("100");
    expect(content).toContain("98");
  });

  it("keeps reconciliation and safe table browsing but removes arbitrary SQL", async () => {
    const dom = installDom("https://example.test/admin.html?view=tools");
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/admin/me")) return { json: async () => ({ success: true, data: { user_id: 99, admin: true } }) };
      if (url.includes("/admin/reconciliation")) return { json: async () => ({ success: true, data: { readonly: true, totals: {} } }) };
      if (url.includes("/admin/tables")) return { json: async () => ({ success: true, data: ["users"] }) };
      if (url.includes("/admin/table/users")) return { json: async () => ({ success: true, data: [{ id: 1 }] }) };
      return { json: async () => ({ success: true, data: [] }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    const { bootstrapAdminPage } = await import("../../src/pages/admin-page");

    bootstrapAdminPage();
    await flush();

    expect(dom.window.document.querySelector("[data-table-form]")).not.toBeNull();
    expect(dom.window.document.getElementById("admin-content")?.textContent).toContain("固定只读发布对账");
    expect(dom.window.document.querySelector("[data-sql-form]")).toBeNull();
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes("/admin/query"))).toBe(false);
    const source = readFileSync(resolve(process.cwd(), "src/pages/admin-page.ts"), "utf8");
    expect(source).not.toContain("data-sql-form");
    expect(source).not.toContain("/admin/query");
    expect(source).not.toContain("只读 SQL");
    expect(source).not.toContain("Read-only SQL");
    expect(source).toContain("/admin/tables");
    expect(source).toContain("/admin/reconciliation");
  });

  it("shows record delivery identifiers and target-specific speed eligibility", async () => {
    const dom = installDom("https://example.test/admin.html?view=records");
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/admin/me")) return { json: async () => ({ success: true, data: { user_id: 99, admin: true } }) };
      if (url.includes("/admin/records")) return { json: async () => ({ success: true, page: 1, limit: 50, total: 1, data: [{ id: "rec-1", user_id: 42, user_name: "Player", mode_key: "standard_4x4_pow2_no_undo", score: 1000, best_tile: 4096, duration_ms: 5000, status: "verified", client_record_id: "client-1", upload_status: "completed", tile_times_ms: { "2048": 1200 }, speed_metric_exclusions_v1: { "4096": { reason: "CHECKPOINT_TIMELINE_REWRITTEN" } } }] }) };
      return { json: async () => ({ success: true, data: [] }) };
    }));
    const { bootstrapAdminPage } = await import("../../src/pages/admin-page");

    bootstrapAdminPage();
    await flush();

    const content = dom.window.document.getElementById("admin-content")?.textContent || "";
    const details = dom.window.document.querySelector<HTMLTemplateElement>("template[data-record-json]")?.innerHTML || "";
    expect(content).toContain("client-1");
    expect(content).toContain("completed");
    expect(details).toContain("目标速度资格");
    expect(details).toContain("CHECKPOINT_TIMELINE_REWRITTEN");
  });
});
