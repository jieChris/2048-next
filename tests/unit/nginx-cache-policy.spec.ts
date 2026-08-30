import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("self-hosted nginx cache policy", () => {
  it("revalidates fixed-name assets in browsers and briefly caches HTML at the edge", () => {
    const config = readFileSync(
      "deploy/nginx/2048-next.nginx.conf.example",
      "utf8",
    );

    expect(config).toContain("root /usr/share/nginx/html;");
    expect(config).toContain("gzip on;");
    expect(config).toContain('default "no-cache, must-revalidate";');
    expect(config).toContain(
      "max-age=60, stale-while-revalidate=300, stale-if-error=86400",
    );
    expect(config).toContain("max-age=31536000, immutable");
    expect(config).toContain(
      "add_header X-Content-Type-Options nosniff always;",
    );
    expect(config).toContain(
      'add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;',
    );
    expect(config).not.toContain('Cloudflare-CDN-Cache-Control "no-store"');
  });

  it("only permits same-origin framing for the embedded breakout easter egg", () => {
    const config = readFileSync(
      "deploy/nginx/2048-next.nginx.conf.example",
      "utf8",
    );

    expect(config).toContain("~^/easter-eggs/breakout(?:/|$) SAMEORIGIN;");
    expect(config).toContain("default DENY;");
    expect(config).toContain(
      "add_header X-Frame-Options $frame_options always;",
    );
  });

  it("serves admin.html only after the existing admin identity check", () => {
    const config = readFileSync(
      "deploy/nginx/2048-next.nginx.conf.example",
      "utf8",
    );

    expect(config).toContain("location = /admin.html {");
    expect(config).toContain("auth_request /_admin_page_auth;");
    expect(config).toContain("error_page 401 403 =404 /404.html;");
    expect(config).toContain("location = /_admin_page_auth {");
    expect(config).toContain("internal;");
    expect(config).toContain("proxy_pass http://game_data_api/api/admin/me;");
    expect(config).toContain('proxy_set_header Cookie "";');
    expect(config).toContain(
      'proxy_set_header Authorization "Bearer $cookie_next_admin_session_v1";',
    );
    expect(config).toContain('/admin.html "private, no-store";');
    expect(config).toContain('/404.html "private, no-store";');
  });

  it("publishes the repo nginx config during self-hosted deploy", () => {
    const workflow = readFileSync(
      ".github/workflows/deploy-self-hosted.yml",
      "utf8",
    );

    expect(workflow).toContain("Checkout deployment config");
    expect(workflow).toContain("Upload Nginx config");
    expect(workflow).toContain("deploy/nginx/2048-next.nginx.conf.example");
    expect(workflow).toContain(
      'sudo -n docker run --rm \\\n              "${docker_network_args[@]}" \\\n              -v "${nginx_config_path}:/etc/nginx/conf.d/default.conf:ro"',
    );
    expect(workflow).toContain(
      'cp "${nginx_config_path}" "${deploy_root}/nginx.conf"',
    );
    expect(workflow).toContain("npm run verify:release");
    expect(workflow).toContain("previous release restored");
  });

  it("keeps production deployment manual while checking main pushes", () => {
    const deployWorkflow = readFileSync(
      ".github/workflows/deploy-self-hosted.yml",
      "utf8",
    );
    const smokeWorkflow = readFileSync(".github/workflows/smoke.yml", "utf8");

    expect(deployWorkflow).toContain("name: Deploy Self Hosted (Manual)");
    expect(deployWorkflow).toContain("  workflow_dispatch:");
    expect(deployWorkflow).toContain("      expected_sha:");
    expect(deployWorkflow).toContain("      confirm_production:");
    expect(deployWorkflow).not.toContain("secrets: inherit");
    expect(deployWorkflow).not.toMatch(
      /uses:\s+[^\s]+@(v\d|main|master|latest)(?:\s|$)/u,
    );
    expect(smokeWorkflow).not.toMatch(
      /uses:\s+[^\s]+@(v\d|main|master|latest)(?:\s|$)/u,
    );
    expect(deployWorkflow).not.toMatch(
      /\n {2}push:\n {4}branches:\n {6}- main\n/u,
    );
    expect(deployWorkflow).toContain(
      'test "${GITHUB_REF}" = "refs/heads/main"',
    );
    expect(smokeWorkflow).toMatch(/\n {2}push:\n {4}branches:\n {6}- main\n/u);
    expect(smokeWorkflow).not.toContain("      - develop");
    expect(smokeWorkflow).not.toContain('      - "feature/**"');
  });
});
