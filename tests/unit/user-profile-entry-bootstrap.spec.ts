import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readEntry(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("user-profile entry bootstrap", () => {
  it("uses the shared unified direct-page bootstrap entry", () => {
    const source = readEntry("src/entries/user-profile.ts");
    const page = readEntry("src/pages/user-profile-page.ts");

    expect(source).toContain(
      'import { bootstrapDirectPage } from "../app/bootstrap-direct-page";',
    );
    expect(source).toContain(
      'import { bootstrapUserProfilePage } from "../pages/user-profile-page";',
    );
    expect(source).toContain(
      'await bootstrapDirectPage("user-profile", bootstrapUserProfilePage);',
    );
    expect(page).not.toContain(
      'import { installUserProfileLegacyRuntime } from "../bootstrap/user-profile-legacy-runtime";',
    );
    expect(page).toMatch(
      /await import\(\s*["']\.\.\/bootstrap\/user-profile-legacy-runtime["']\s*\)/,
    );
    expect(page).toContain("await installUserProfileLegacyRuntime();");
  });

  it("loads the legacy profile data runtime as real scripts in production builds", () => {
    const runtime = readEntry("src/bootstrap/user-profile-legacy-runtime.ts");

    expect(runtime).toContain(
      'import coreGameSettingsStorageRuntimeUrl from "../../js/core_game_settings_storage_runtime.js?url";',
    );
    expect(runtime).toContain(
      'import apiSharedUtilsUrl from "../../js/api_shared_utils.js?url";',
    );
    expect(runtime).toContain(
      'import userProfilePageUrl from "../../js/user_profile_page.js?url";',
    );
    expect(runtime).toContain("loadLegacyScriptsSequentially");
    expect(runtime).not.toContain('import "../../js/user_profile_page.js";');
    expect(runtime).toContain("coreGameSettingsStorageRuntimeUrl");
    expect(runtime).toContain("apiSharedUtilsUrl");
    expect(runtime).toContain("userProfilePageUrl");
  });

  it("keeps the profile shell viewport-wide instead of inheriting the centered page width", () => {
    const css = readEntry("style/user_profile_page.css");

    expect(css).toContain('body[data-page="user-profile"]');
    expect(css).toContain("width: 100%;");
    expect(css).toContain("min-width: 100%;");
    expect(css).toContain('body[data-page="user-profile"] .user-page-shell');
    expect(css).toContain("max-width: none;");
  });

  it("keeps the open profile synchronized with display-mode changes", () => {
    const page = readEntry("src/pages/user-profile-page.ts");

    expect(page).toContain(
      'import { bindDisplayModeSync } from "../bootstrap/display-mode";',
    );
    expect(page).toContain(
      "bindDisplayModeSync({ documentLike: document, windowLike: window });",
    );
  });

  it("keeps the tide cover as one coherent scene with reduced-motion support", () => {
    const html = readEntry("user.html");
    const css = readEntry("style/user_profile_page.css");
    const page = readEntry("src/pages/user-profile-page.ts");

    expect(html).toContain('class="user-profile-cover-art"');
    expect(html).toContain(
      'class="user-profile-cover-art-layer user-profile-cover-art-sky"',
    );
    expect(html).toContain(
      'class="user-profile-cover-art-layer user-profile-cover-art-glow"',
    );
    expect(html).toContain(
      'class="user-profile-cover-art-layer user-profile-cover-art-city"',
    );
    expect(html).toContain(
      'class="user-profile-cover-art-layer user-profile-cover-art-foreground"',
    );
    expect(html).not.toContain("user-profile-cover-character");
    expect(css).toContain(
      "/images/profile-banner/day-sky-generated-v1-8x1.png",
    );
    expect(css).toContain(
      "/images/profile-banner/day-city-generated-v1-8x1.png",
    );
    expect(css).toContain(
      "/images/profile-banner/day-foreground-generated-v1-8x1.png",
    );
    const compactCss = css.replace(/\s+/g, " ");
    expect(compactCss).toContain(
      ".user-profile-cover:not([data-background-assets-ready]) .user-profile-cover-art-sky",
    );
    expect(css).toContain("filter: brightness(0.25)");
    expect(css).toContain("filter: brightness(0.52)");
    expect(css).toContain("filter: brightness(0.46)");
    expect(css).not.toContain("/images/profile-banner/night-sky-8x1.png");
    expect(css).not.toContain("mask-image");
    expect(css).not.toContain("/images/profile-banner/night-background.webp");
    expect(css).not.toContain("/images/profile-banner/night-composite");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(page).toContain('"--profile-cover-sky-x"');
    expect(page).toContain('"--profile-cover-city-x"');
    expect(page).toContain('"--profile-cover-foreground-x"');
    expect(page).not.toContain(
      'hasAttribute("data-night-background") ? 1 : 0.25',
    );
  });

  it("shows the 150-code-point bio editor only in the owner's edit mode", () => {
    const html = readEntry("user.html");
    const page = readEntry("src/pages/user-profile-page.ts");
    const openapi = readEntry("openapi/2048next.v1.yaml");

    expect(html).not.toContain('id="user-profile-dialog"');
    expect(html).not.toContain('id="user-avatar-file"');
    expect(html).toContain('id="user-profile-bio-editor"');
    expect(html).toContain('id="user-profile-bio-input"');
    expect(html).not.toContain('maxlength="150"');
    expect(html).toContain('for="user-profile-bio-input"');
    expect(html).toContain('id="user-profile-bio-count"');
    const compactHtml = html.replace(/\s+/g, " ");
    expect(compactHtml).toContain(
      'id="user-profile-bio-status" aria-live="polite"',
    );
    expect(html).toContain('id="user-profile-moderation-history"');
    expect(page).toContain("safeReadStorageItem");
    expect(page).toContain(
      'profileValue(profile, "profile_bio", "profileBio")',
    );
    expect(page).toContain("bioEditor.hidden = !(canEdit && editModeEnabled)");
    expect(page).toContain("const profileBio = input.value.trim()");
    expect(page).toContain("Array.from(profileBio).length");
    expect(Array.from("😀".repeat(150))).toHaveLength(150);
    expect(Array.from("😀".repeat(151))).toHaveLength(151);
    expect(page).not.toContain("window.localStorage");
    expect(openapi).toContain(
      "profile_bio:\n          type: string\n          maxLength: 150",
    );
    expect(openapi).toContain(
      "profileBio:\n          type: string\n          maxLength: 150",
    );
    expect(openapi).not.toContain(
      "profile_bio:\n          type: string\n          maxLength: 80",
    );
  });

  it("submits bio moderation without optimistically replacing the public bio", () => {
    const page = readEntry("src/pages/user-profile-page.ts");
    const save = page.slice(
      page.indexOf("async function saveProfileBio"),
      page.indexOf("function applyLanguage"),
    );
    const guardIndex = save.indexOf("if (bioSaving) return;");

    expect(guardIndex).toBeGreaterThan(-1);
    expect(guardIndex).toBeLessThan(
      save.indexOf('randomId("profile-bio", 16)'),
    );
    expect(guardIndex).toBeLessThan(
      save.indexOf('apiClient.request("/user/me/profile"'),
    );
    expect(save).toContain('apiClient.request("/user/me/profile"');
    expect(save).toContain('"Idempotency-Key": randomId("profile-bio", 16)');
    expect(save).toContain(
      "body: JSON.stringify({ profile_bio: profileBio, revision })",
    );
    expect(save).toContain("await loadModerationHistory()");
    expect(save).not.toContain("state.profile.profile_bio");
    expect(save).not.toContain("state.profile.profileBio");
    expect(save).not.toContain("renderProfile()");
  });

  it("renders owner-only moderation history through safe localized status and reason maps", () => {
    const page = readEntry("src/pages/user-profile-page.ts");

    expect(page).toMatch(
      /apiClient\.request\(\s*"\/user\/me\/moderation-submissions\?limit=20"/,
    );
    for (const status of [
      "submitted",
      "ai_reviewing",
      "ai_pass",
      "ai_reject",
      "manual_review",
      "failed_retryable",
      "approved",
      "rejected",
    ]) {
      expect(page).toContain(`${status}:`);
    }
    expect(page).toContain("SAFE_MODERATION_REASON_COPY");
    expect(page).not.toContain("reason.textContent = text(item.reason_code)");
    expect(page).toContain('"reason_code", "reasonCode"');
    expect(page).toContain("bio_blocked_until");
    expect(page).toContain("next_allowed_at");
    expect(page).toContain("CONTENT_REVIEW_PENDING");
  });

  it("uploads one reviewed avatar only from the owner's edit mode without replacing the public avatar optimistically", () => {
    const html = readEntry("user.html");
    const page = readEntry("src/pages/user-profile-page.ts");
    const avatarFlow = page.slice(
      page.indexOf("function avatarNoticeCopy"),
      page.indexOf("function availableFeaturedModes"),
    );

    expect(html).toContain('id="user-profile-avatar-editor"');
    expect(html).toContain('id="user-profile-avatar-input"');
    expect(html).toContain('accept="image/jpeg,image/png,image/webp"');
    expect(html).toContain('id="user-profile-avatar-preview"');
    const compactHtml = html.replace(/\s+/g, " ");
    expect(compactHtml).toContain(
      'id="user-profile-avatar-status" aria-live="polite"',
    );
    expect(page).toContain(
      "avatarEditor.hidden = !(canEdit && editModeEnabled)",
    );
    expect(avatarFlow).toMatch(
      /apiClient\.request\(\s*"\/user\/me\/avatar-submission"\s*,\s*\{\s*method:\s*"GET"/,
    );
    expect(avatarFlow).toContain("file.size > 200 * 1024");
    expect(avatarFlow).toContain('form.set("avatar", file)');
    expect(avatarFlow).toContain(
      'headers: { "Idempotency-Key": randomId("profile-avatar", 16) }',
    );
    expect(avatarFlow).toContain("body: form");
    expect(avatarFlow).toContain("await loadAvatarSubmission()");
    expect(avatarFlow).not.toContain("state.profile.avatar_url");
    expect(avatarFlow).not.toContain("state.profile.avatarUrl");
    expect(avatarFlow).not.toContain('setAvatar(byId("user-profile-avatar")');
  });

  it("keeps normal profile viewing free of the retired cover edit entry", () => {
    const html = readEntry("user.html");
    const page = readEntry("src/pages/user-profile-page.ts");

    expect(html).not.toContain('id="user-profile-edit"');
    expect(page).not.toContain('byId<HTMLButtonElement>("user-profile-edit")');
    expect(html).toContain('id="user-nav-edit-mode"');
    expect(html).toContain('id="user-featured-edit"');
  });

  it("loads one published scene and switches its three layers with the display mode", () => {
    const html = readEntry("user.html");
    const page = readEntry("src/pages/user-profile-page.ts");

    expect(html).toContain('id="user-profile-background-editor"');
    expect(html).toContain('id="user-profile-background-choices"');
    expect(page).toContain('apiClient.request("/profile-backgrounds"');
    expect(page).toContain(
      '`/profile-backgrounds/${encodeURIComponent(sceneId || "default")}/layers?variant=${variant}`',
    );
    expect(page).toContain("record(record(result.data).layers)");
    expect(page).toContain("records(catalog.scenes)");
    expect(page).toContain("scene.preview_url");
    expect(page).toContain("preloadProfileBackground");
    expect(page).toContain("resetProfileBackgroundLayers");
    expect(page).toContain("Promise.all(");
    expect(page).toContain("values.map");
    expect(page).toContain("data-background-assets-ready");
    expect(page).toContain('"--profile-cover-sky-image"');
    expect(page).toContain('"--profile-cover-city-image"');
    expect(page).toContain('"--profile-cover-foreground-image"');
    expect(page).toContain(
      "backgroundEditor.hidden = !(canEdit && editModeEnabled)",
    );
    expect(page).toContain(
      "body: JSON.stringify({ background_scene_id: selectedSceneId, revision })",
    );
    expect(page).toContain("data-night-background");
  });

  it("never falls back from the public profile id to the account id", () => {
    const legacy = readEntry("js/user_profile_page.js");
    const resolver = legacy.slice(
      legacy.indexOf("function publicProfileIdFromUser"),
      legacy.indexOf("function normalizeReplayFileVersion"),
    );

    expect(resolver).toContain("source.public_profile_id");
    expect(resolver).toContain("source.game_user_id");
    expect(resolver).not.toContain("source.id");
    expect(resolver).not.toContain("source.user_id");
  });

  it("fails closed when the authenticated ownership lookup is unavailable", () => {
    const legacy = readEntry("js/user_profile_page.js");
    const ownership = legacy.slice(
      legacy.indexOf("async function resolveOwnership"),
      legacy.indexOf("function buildSummaryPreviewHtml"),
    );
    const init = legacy.slice(
      legacy.indexOf("async function init()"),
      legacy.indexOf("global.UserProfilePageRuntime"),
    );

    expect(ownership).toContain("isOwnProfile = false");
    expect(ownership).not.toContain("ownershipFromStorage");
    expect(init).not.toContain("initialUserId");
  });
});
