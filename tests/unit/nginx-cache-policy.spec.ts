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

  it("serves admin.html only after the existing admin identity check", () => {
    const config = readFileSync("deploy/nginx/2048-next.nginx.conf.example", "utf8");

    expect(config).toContain("location = /admin.html {");
    expect(config).toContain("auth_request /_admin_page_auth;");
    expect(config).toContain("error_page 401 403 =404 /404.html;");
    expect(config).toContain("location = /_admin_page_auth {");
    expect(config).toContain("internal;");
    expect(config).toContain("server 2048-game-api:3001;");
    expect(config).not.toContain("server 127.0.0.1:3010;");
    expect(config).toContain("proxy_pass http://game_data_api/api/admin/me;");
    expect(config).toContain('proxy_set_header Cookie "";');
    expect(config).toContain('proxy_set_header Authorization "Bearer $cookie_next_admin_session_v1";');
    expect(config).toContain('/admin.html "private, no-store";');
    expect(config).toContain('/404.html "private, no-store";');
  });

  it("publishes the repo nginx config during self-hosted deploy", () => {
    const workflow = readFileSync(".github/workflows/deploy-self-hosted.yml", "utf8");

    expect(workflow).toContain("Checkout deployment config");
    expect(workflow).toContain("Upload Nginx config");
    expect(workflow).toContain("deploy/nginx/2048-next.nginx.conf.example");
    expect(workflow).toContain('cp "${nginx_config_path}" "${deploy_root}/nginx.conf"');
    expect(workflow).toContain("docker network inspect edge-migrate-net");
    expect(workflow).toContain("--network edge-migrate-net");
    expect(workflow).toContain("npm run verify:release");
    expect(workflow).toContain("previous release restored");
  });

  it("rolls back when the production admin guard is publicly exposed", () => {
    const workflow = readFileSync(".github/workflows/deploy-self-hosted.yml", "utf8");

    expect(workflow).toContain("http://127.0.0.1:2048/admin.html");
    expect(workflow).toContain('"/admin.html?deploy_probe=${release_id}"');
    expect(workflow).toContain('"/admin.html?view=external-import"');
    expect(workflow).toContain('[ "${origin_admin_status}" = "404" ] && [ "${public_admin_status}" = "404" ]');
    expect(workflow.indexOf("if ! wait_for_site;"))
      .toBeLessThan(workflow.indexOf('rm -f "${previous_nginx_config}"'));
  });
});
