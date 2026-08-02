# 执行记录

## Route Deviation

- 仓库缺少 Trellis `./.trellis/scripts/get_context.py` 与 `.trellis/spec/guides/index.md`，无法执行标准上下文发现流程。采用最保守回退：手工读取仓库 `AGENTS.md`、`.trellis/spec/index.md`、`cross-repo-architecture.md`、`frontend-api-boundary.md` 与 `smoke-testing.md`，并仅修改前端静态 SEO 与部署配置。
- 原计划使用 `X-Forwarded-Proto` 在站点 Nginx 强制 HTTPS；只读审计确认外层 edge 会覆盖该头。为避免误判或重定向循环，改用会被 edge 原样转发的 Cloudflare `CF-Visitor`，且只在其明确声明 HTTP 时跳转。Cloudflare API 连接可读取 zone，但读取/修改 `always_use_https` 返回授权错误，因此未绕过权限修改账户设置。
- 初版 `CF-Visitor` 正则会把 `https` 的 `http` 前缀误判为 HTTP。该版本未提交、未部署；发布前已改为完整匹配 `{"scheme":"http"}` 并增加 HTTPS 反例断言。
- 上述可复用的代理头与重定向反例规则已沉淀到 `.trellis/spec/smoke-testing.md`。

## 进度

- 已完成代码与生产环境只读审计。
- 已确认站长验证/提交只能帮助发现和诊断，不直接提高自然排名。
- 已完成 canonical、模式页元数据、运行时标题、sitemap、正式开放文案、旧内测入口与 IndexNow key 的实现。

## 验证

- `npx vitest run tests/unit/seo-contract.spec.ts tests/unit/nginx-cache-policy.spec.ts`：10 项通过。
- `PW_WEB_PORT=4191 npx playwright test --config=playwright.config.ts tests/smoke/pages-seo-contract.smoke.spec.ts --workers=1`：4 项通过。
- 本地生产预览确认中英文首页与模式页的最终运行时 title、canonical 正确。
- `npm run verify:release`：全部 refactor、unit、critical smoke、build 与 release-ready 门禁通过。
- `git diff --check`：通过。
- 本机未安装 Docker/Nginx，无法本地执行 `nginx -t`；现有生产部署流水线会在激活发布前用 Nginx 1.27 容器强制校验配置，失败会停止发布并保留旧版本。
