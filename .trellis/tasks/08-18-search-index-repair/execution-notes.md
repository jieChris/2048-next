# 执行记录

## Route Deviation

- 2026-08-18：Trellis 要求执行 `./.trellis/scripts/get_context.py --mode packages` 并读取 `.trellis/spec/guides/index.md`，但仓库没有该脚本和目录。采用最保守回退：手工读取 `AGENTS.md`、`.trellis/spec/index.md`、`frontend-api-boundary.md`、`cross-repo-architecture.md`、`smoke-testing.md` 与 `visual-validation.md`，并限制改动范围。
- 2026-08-18：本地网页自动化只能使用 Codex 内置浏览器，因此不在本机启动 Playwright。采用最保守回退：本地运行无浏览器单测、构建和静态检查；提交后由仓库既有 GitHub Actions 执行完整 Smoke，生产页面再用内置浏览器验证。
- 2026-08-18：本机没有 Docker 或 Nginx，无法直接执行 `nginx -t`。采用最保守回退：用单元测试锁定 Nginx 关键语义和配置文本；推送后的部署流水线会在切换生产版本前使用 `nginx:1.27-alpine` 强制执行 `nginx -t`，失败则保留旧版本。

## 进度

- 已完成 Google、百度、Bing 的只读审计并确认旧 SEO 修复被后续整树覆盖。
- 已在隔离工作区基于最新 `origin/main` 开始恢复，用户原工作区保持不变。
- 已恢复首页与模式页元数据、规范 URL、sitemap、正式开放文案和两份站点验证文件。
- 已恢复生产重定向与 `2048-game-api:3001` 上游，并对应用内部页添加 `X-Robots-Tag: noindex, follow`。

## 验证

- `npx vitest run tests/unit/seo-contract.spec.ts tests/unit/nginx-cache-policy.spec.ts`：2 个文件、11 项通过。
- `npm run test:unit`：307 个文件、1991 项通过。
- `npm run audit:service-boundary`：459 个文件、0 违规。
- `npm run build`：通过；构建产物包含两份验证文件、规范 sitemap 与页面元数据。
- `npm run verify:release-ready`：通过。
- `git diff --check`：通过。
