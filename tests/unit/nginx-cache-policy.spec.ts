import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("self-hosted nginx cache policy", () => {
  it("revalidates fixed-name code assets and keeps HTML out of edge cache", () => {
    const config = readFileSync("deploy/nginx/2048-next.nginx.conf.example", "utf8");

    expect(config).toContain("root /usr/share/nginx/html;");
    expect(config).toContain("gzip on;");
    expect(config).toMatch(/location\s+~\*\s+\\\.\(\?:js\|mjs\|css\|wasm\)[\s\S]*?Cache-Control "no-cache"/);
    expect(config).toMatch(/location\s+~\*\s+\\\.\(\?:png\|jpg\|jpeg[\s\S]*?max-age=31536000,\s*immutable/);
    expect(config).toMatch(/location\s+~\*\s+\\\.\(\?:html\|webmanifest\)[\s\S]*?Cache-Control "no-cache, must-revalidate"/);
    expect(config).toMatch(/location\s+~\*\s+\\\.\(\?:html\|webmanifest\)[\s\S]*?Cloudflare-CDN-Cache-Control "no-store"/);
    expect(config).toMatch(/location\s+=\s+\/\s+\{[\s\S]*?Cloudflare-CDN-Cache-Control "no-store"/);
    expect(config).toMatch(/location\s+\/\s+\{[\s\S]*?Cloudflare-CDN-Cache-Control "no-store"/);
  });

  it("publishes the repo nginx config during self-hosted deploy", () => {
    const workflow = readFileSync(".github/workflows/deploy-self-hosted.yml", "utf8");

    expect(workflow).toContain("Checkout deployment config");
    expect(workflow).toContain("Upload Nginx config");
    expect(workflow).toContain("deploy/nginx/2048-next.nginx.conf.example");
    expect(workflow).toContain('cp "${nginx_config_path}" "${deploy_root}/nginx.conf"');
  });
});
