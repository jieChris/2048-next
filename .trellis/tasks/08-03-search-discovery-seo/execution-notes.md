# 执行记录

## Route Deviation

- 仓库缺少 Trellis `./.trellis/scripts/get_context.py` 与 `.trellis/spec/guides/index.md`，无法执行标准上下文发现流程。采用最保守回退：手工读取仓库 `AGENTS.md`、`.trellis/spec/index.md`、`cross-repo-architecture.md`、`frontend-api-boundary.md` 与 `smoke-testing.md`，并仅修改前端静态 SEO 与部署配置。
- 原计划使用 `X-Forwarded-Proto` 在站点 Nginx 强制 HTTPS；只读审计确认外层 edge 会覆盖该头。为避免误判或重定向循环，改用会被 edge 原样转发的 Cloudflare `CF-Visitor`，且只在其明确声明 HTTP 时跳转。Cloudflare API 连接可读取 zone，但读取/修改 `always_use_https` 返回授权错误，因此未绕过权限修改账户设置。
- 初版 `CF-Visitor` 正则会把 `https` 的 `http` 前缀误判为 HTTP。该版本未提交、未部署；发布前已改为完整匹配 `{"scheme":"http"}` 并增加 HTTPS 反例断言。
- PR 第二轮 `Refactor Gate` 暴露既有排位重启 Smoke 在确认框关闭后立即读取异步准备阶段才写入的清理标记。为避免扩大到排位产品逻辑，仅按现有“等待能力”规范改为等待标记出现；该场景的产品单元测试仍验证标记写入本身是同步的。
- PR 第三轮 `Smoke (pages)` 暴露语言审计在固定等待 800ms 后采样时，练习盘的后台脚本仍可能尚未加载完成。初步曾判断为错过 `DOMContentLoaded`，但复核发现共享 loader 已兼容晚到监听；用未修改的脚本延迟 1.5 秒对照确认其会在加载后正常初始化。采用最保守回退：不改产品代码，仅让审计等待练习盘运行时、模式键和模式列表就绪后再采样。
- 上述可复用的代理头与重定向反例规则已沉淀到 `.trellis/spec/smoke-testing.md`。

## 进度

- 已完成代码与生产环境只读审计。
- 已确认站长验证/提交只能帮助发现和诊断，不直接提高自然排名。
- 已完成 canonical、模式页元数据、运行时标题、sitemap、正式开放文案、旧内测入口与 IndexNow key 的实现。
- PR 首轮 `Smoke (pages)` 暴露两条旧测试合同仍要求首页标题为 `2048`，并把品牌词 `NEXT` 误判为中文页夹杂英文；仅同步测试合同，没有回退 SEO 标题。

## 验证

- `npx vitest run tests/unit/seo-contract.spec.ts tests/unit/nginx-cache-policy.spec.ts`：10 项通过。
- `PW_WEB_PORT=4191 npx playwright test --config=playwright.config.ts tests/smoke/pages-seo-contract.smoke.spec.ts --workers=1`：4 项通过。
- SEO 标题合同修正后，目标回归 2 项通过，完整 `npm run test:smoke:pages` 231 项通过。
- 排位清理标记 Smoke 调整后连续 20 次通过，相关产品单元测试 55 项通过，完整 critical smoke 41 项通过。
- 练习盘脚本延迟 1.5 秒的对照显示：脚本返回前为静态混合文案，未修改脚本会在返回后自动完成英文初始化；改为按运行时就绪条件采样后，完整中英文页面审计通过。
- 本地生产预览确认中英文首页与模式页的最终运行时 title、canonical 正确。
- 最新 `npm run verify:release`：全部 refactor、unit、critical smoke、build 与 release-ready 门禁通过。
- `git diff --check`：通过。
- 本机未安装 Docker/Nginx，无法本地执行 `nginx -t`；现有生产部署流水线会在激活发布前用 Nginx 1.27 容器强制校验配置，失败会停止发布并保留旧版本。
