# 搜索收录修复

## 目标

- 恢复被旧分支覆盖的 Google、百度与 Bing 搜索发现信号。
- 将游戏首页权重统一到 `https://2048next.cn/2048.html`。
- 保留百度、Bing 的站点验证文件。
- 避免应用内部页和参数模式页继续制造重复标题与描述问题。
- 发布 SEO 修复时保持管理员鉴权与 `/api/*` 上游可用。

## 范围

- 仅修改 `2048-next` 的静态元数据、站点地图、验证文件、SEO 契约测试和生产 Nginx 配置。
- 不修改 `2048-ranked`、后端数据、排行榜数据或页面布局。
- 不在代码中保存或使用任何站长平台 API 密钥。

## 验收标准

- `/`、`/index.html`、HTTP、`www` 与旧内测入口永久跳转到规范 URL。
- sitemap 只列 `/2048.html` 与 `/modes.html`，`lastmod` 为本次发布日期。
- 首页与模式页具有稳定、独立的 title、description、canonical 与分享元数据。
- `play.html`、账号、用户记录与工具页通过 `X-Robots-Tag: noindex, follow` 退出索引。
- 百度与 Bing 验证文件在构建产物和生产根目录持续可访问。
- Nginx API 上游保持为同一 Docker 网络内的 `2048-game-api:3001`。
