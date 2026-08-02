# 实施计划

1. 建立 SEO 契约测试，覆盖 canonical、sitemap、元数据、正式开放文案和 Nginx 跳转规则。
2. 修改首页、模式页、sitemap、llms 与生产 Nginx 配置；复核并保留已正确允许搜索爬虫的 robots。
3. 运行目标单测、Nginx 配置检查（环境允许时）、构建、`verify:release` 与 `git diff --check`。
4. 提交、推送并通过现有 GitHub Actions 发布。
5. 验证生产 URL、robots、sitemap 与元数据；列出三家站长平台仍需账号授权的步骤。
