# ADR 0001：Android App 基底

- 状态：已接受
- 日期：2026-07-23
- 决策来源：`.trellis/tasks/07-22-android-app-foundation/`

## 背景

2048 NEXT 需要新增专属 Android App，同时保留 Web，并在未来允许微信小程序复用游戏规则和后端合同。现有 Web 是多页面 Vite 应用，`play` 仍加载大量 legacy runtime；当前 `src/core/engine.ts` 也尚未独立完成棋盘移动、确定性出块、撤回和回放。直接封装现有 Web 会把加载顺序、DOM 状态和浏览器存储带入 App，无法满足离线恢复、稳定性与高刷要求。

## 方案

1. 在 `2048-next` 同仓库建立独立 `mobile/` 单入口和 `vite.app.config.ts`，输出 `dist-app`，由 Capacitor 打包本地资源。App 构建不复制 Web HTML、legacy 脚本或现有页面样式清单。
2. 加深现有 `src/core/engine.ts`，让 Web、App 和服务端 verifier 通过固定 seed/action 黄金向量共享移动、出块、撤回和回放语义；不建立第二套移动引擎。
3. App 本地数据使用独立、版本化 IndexedDB。Token 与排位 Token 只进入最小 Android Keystore AES-GCM bridge。退出账号通过 owner 不可见标记和启动续清实现跨存储逻辑原子性。
4. App 直接调用 Node/PostgreSQL `2048-game-api`。账号、回放验证、排行榜、成就和删号继续由后端权威管理；App 不调用 `2048-ranked` 的 `/ranked/*` 产品接口。
5. 排位新局在棋盘展示前以稳定 operation ID 幂等取得并安全保存服务端 `started_at/seed/token`。失败则从一开始创建 normal 局；棋盘可操作后所有输入纯本地执行。
6. 首版只引入 Capacitor 核心、Android、App、StatusBar、Filesystem 与 Share；触觉使用遵守 Android 系统开关的单方法原生桥，不依赖直接振动的 Haptics 插件。不引入 React、路由库、SQLite、Network/Preferences、WorkManager、推送、统计或更新框架。
7. Android 使用 `cn.next2048.app`、minSdk 29、竖屏、独立 debug 包名。release 不允许远程 `server.url`、明文流量、WebView 调试、外部存储或通知权限。

## 影响面

- 前端：新增独立移动构建、移动页面、IndexedDB、Android 适配层；现有 Web 构建继续独立运行。
- 共享核心：`src/core` 与 contracts 增加完整 Game Session 行为和版本化快照/回放。
- 后端：以向后兼容方式补 OpenAPI、幂等排位启动、权威 rank、删号、成就元数据、诊断和 CORS；生产部署需要单独批准。
- 发布：新增 Android 工程、Gradle Wrapper、APK/AAB、签名与 Android CI；正式密钥不进入仓库。

## 回滚方式

- App 构建与 Web 构建隔离；移动入口失败时可停用 App 构建，不回滚 Web 页面。
- 共享核心 parity 未通过时停在旧 Web 路径，不用页面补丁绕过差异。
- 后端只做加法迁移；`auth_version` 与删除态校验一旦启用只能前向修复。
- IndexedDB 不做降级迁移。只有已验证能读取当前 schema 的旧提交才能以更高 versionCode 回发，否则基于当前 schema 前向修复。
- 公开发布后始终使用更高 versionCode 和同一 app-signing 证书。

## 验收命令

```bash
# Web 与共享核心
npm run audit:service-boundary
npm run audit:entry-manifest
npm run test:unit:core
npm run verify:release

# App / Android（建立后）
npm run verify:app
npm run android:check
npm run android:release

# 后端
cd /Users/a19/Documents/2048-Next/.worktrees/2048-game-api-android-app
npm run typecheck
npm run test:node
```
