# 设计

复用 2026-08-03 已发布并验证过的搜索发现实现，不整体合并旧提交，只把对应语义补回当前 `main`，从而保留其后的产品改动。

## 索引边界

- `/2048.html` 是唯一游戏首页 canonical。
- `/modes.html` 是唯一第二搜索落地页。
- Nginx 用 `X-Robots-Tag: noindex, follow` 排除 `play.html` 参数模式页及账号、历史、回放、用户资料和设置工具页；无需为数十个参数 URL 制造重复 SEO 内容。
- sitemap 只发布上述两个 canonical URL。

## 部署边界

- Cloudflare 访客协议仅从 `CF-Visitor` 的完整 `http` 值判断，避免把 `https` 错判为 HTTP。
- `www`、根路径、`index.html` 与旧内测入口使用 308。
- API 与管理员鉴权继续通过同一 Docker 网络访问 `2048-game-api:3001`。
