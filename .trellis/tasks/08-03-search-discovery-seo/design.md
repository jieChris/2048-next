# 设计

## URL 规范化

沿用代码库现有导航、PWA 起始页和既有 canonical，将 `/2048.html` 作为唯一游戏首页。生产 Nginx 负责：

- Cloudflare `CF-Visitor` 明确为 HTTP 时跳转到 HTTPS 裸域。
- `www.2048next.cn` 跳转到裸域。
- `/` 与 `/index.html` 跳转到 `/2048.html`。
- `/beta-login.html` 与 `/beta-access.html` 跳转到 `/2048.html`。

现有健康检查继续直接请求 canonical URL；内部探针不带 `CF-Visitor`，不会被误重定向到公网。

## 页面发现

- sitemap 仅保留 `/2048.html` 与 `/modes.html`。
- 首页保留现有 `VideoGame` JSON-LD，删除没有对应可见正文的 `FAQPage`。
- 分享图片改用构建后稳定存在的公开图标。
- i18n 运行时标题与静态 SEO 标题保持一致。
- 不增加 `meta keywords`，不堆砌“2048”关键词。

## 平台接入边界

代码部署后提交公开 sitemap，并用无需登录的 IndexNow 通知 Bing 本次规范 URL 更新。Google Search Console、Bing Webmaster Tools 与百度搜索资源平台的所有权验证必须使用各平台实际生成的验证值，不能提前写入占位内容。
