import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readEntry(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("user-profile entry bootstrap", () => {
  it("uses the shared unified direct-page bootstrap entry", () => {
    const source = readEntry("src/entries/user-profile.ts");

    expect(source).toContain('import { bootstrapDirectPage } from "../app/bootstrap-direct-page";');
    expect(source).toContain('import { bootstrapUserProfilePage } from "../pages/user-profile-page";');
    expect(source).toContain('await bootstrapDirectPage("user-profile", bootstrapUserProfilePage);');
  });

  it("keeps the tide cover as one coherent scene with reduced-motion support", () => {
    const html = readEntry("user.html");
    const css = readEntry("style/user_profile_page.css");
    const page = readEntry("src/pages/user-profile-page.ts");

    expect(html).toContain('class="user-profile-cover-art"');
    expect(html).toContain('class="user-profile-cover-art-layer user-profile-cover-art-sky"');
    expect(html).toContain('class="user-profile-cover-art-layer user-profile-cover-art-glow"');
    expect(html).toContain('class="user-profile-cover-art-layer user-profile-cover-art-city"');
    expect(html).toContain('class="user-profile-cover-art-layer user-profile-cover-art-foreground"');
    expect(html).not.toContain('user-profile-cover-character');
    expect(css).toContain('/images/profile-banner/day-sky-generated-v1-8x1.png');
    expect(css).toContain('/images/profile-banner/day-city-generated-v1-8x1.png');
    expect(css).toContain('/images/profile-banner/day-foreground-generated-v1-8x1.png');
    expect(css).toContain('html[data-night-background="1"] .user-profile-cover-art-sky');
    expect(css).toContain('html[data-night-background="1"] .user-profile-cover-art-city');
    expect(css).toContain('html[data-night-background="1"] .user-profile-cover-art-foreground');
    expect(css).toContain('filter: brightness(0.25)');
    expect(css).toContain('filter: brightness(0.52)');
    expect(css).toContain('filter: brightness(0.46)');
    expect(css).not.toContain('/images/profile-banner/night-sky-8x1.png');
    expect(css).not.toContain('mask-image');
    expect(css).not.toContain('/images/profile-banner/night-background.webp');
    expect(css).not.toContain('/images/profile-banner/night-composite');
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(page).toContain('"--profile-cover-sky-x"');
    expect(page).toContain('"--profile-cover-city-x"');
    expect(page).toContain('"--profile-cover-foreground-x"');
    expect(page).not.toContain('hasAttribute("data-night-background") ? 1 : 0.25');
  });

  it("uses the shared storage boundary and the 150-code-point bio contract", () => {
    const html = readEntry("user.html");
    const page = readEntry("src/pages/user-profile-page.ts");
    const openapi = readEntry("openapi/2048next.v1.yaml");

    expect(html).toContain('id="user-profile-bio-count">0 / 150');
    expect(html).toContain('maxlength="150"');
    expect(page).toContain('safeReadStorageItem');
    expect(page).toContain(" / 150");
    expect(page).not.toContain("window.localStorage");
    expect(openapi).toContain("profile_bio:\n          type: string\n          maxLength: 150");
    expect(openapi).toContain("profileBio:\n          type: string\n          maxLength: 150");
    expect(openapi).not.toContain("profile_bio:\n          type: string\n          maxLength: 80");
  });
});
