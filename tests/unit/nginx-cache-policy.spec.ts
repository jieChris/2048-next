import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("self-hosted nginx cache policy", () => {
  it("revalidates fixed-name assets in browsers and briefly caches HTML at the edge", () => {
    const config = readFileSync("deploy/nginx/2048-next.nginx.conf.example", "utf8");

    expect(config).toContain("root /usr/share/nginx/html;");
    expect(config).toContain("gzip on;");
    expect(config).toContain('default "no-cache, must-revalidate";');
    expect(config).toContain('max-age=60, stale-while-revalidate=300, stale-if-error=86400');
    expect(config).toContain('max-age=31536000, immutable');
    expect(
      config.split('/downloads/android/beta/latest-v1.json "no-store";'),
    ).toHaveLength(3);
    expect(
      config.split(
        '2048-next-[0-9A-Za-z._-]+\\.apk$ "public, max-age=31536000, immutable";',
      ),
    ).toHaveLength(3);
    expect(config).toContain('add_header X-Content-Type-Options nosniff always;');
    expect(config).toContain('add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;');
    expect(config).toContain('~^/downloads/android/beta/ "*";');
    expect(config).toContain('add_header Access-Control-Allow-Origin $android_beta_cors_origin always;');
    expect(config).not.toContain('Cloudflare-CDN-Cache-Control "no-store"');
  });

  it("only permits same-origin framing for the embedded breakout easter egg", () => {
    const config = readFileSync("deploy/nginx/2048-next.nginx.conf.example", "utf8");

    expect(config).toContain('~^/easter-eggs/breakout(?:/|$) SAMEORIGIN;');
    expect(config).toContain('default DENY;');
    expect(config).toContain('add_header X-Frame-Options $frame_options always;');
  });

  it("publishes the repo nginx config during self-hosted deploy", () => {
    const workflow = readFileSync(".github/workflows/deploy-self-hosted.yml", "utf8");

    expect(workflow).toContain("Checkout deployment config");
    expect(workflow).toContain("Upload Nginx config");
    expect(workflow).toContain("deploy/nginx/2048-next.nginx.conf.example");
    expect(workflow).toContain('cp "${nginx_config_path}" "${deploy_root}/nginx.conf"');
    expect(workflow).toContain("npm run verify:release");
    expect(workflow).toContain("previous release restored");
  });
});
