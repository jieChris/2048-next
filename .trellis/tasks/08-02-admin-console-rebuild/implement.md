# 实施计划：2048 Next 管理后台

## 1. 收紧合同与清理内测管理

1. 在 `2048-game-api` 删除已结束的 Admin 内测名单路由导入和 `/api/admin/beta-access/allowlist` 三个管理端点，保留历史表与不影响本任务的历史数据。
2. 从 `2048-next/openapi/2048next.v1.yaml` 删除对应 Admin 合同并重新生成类型。
3. 删除 `admin.html`、`admin-page.ts`、样式、翻译和测试中的内测管理挂载与行为。

## 2. 建立后端统一用户管理合同

1. 在 `2048-game-api/src/server/app.ts` 新增仪表盘、用户列表、用户详情、资料修正、账户状态、角色、强制注销和安全密码重置端点。
2. 复用现有 `isGameApiSuperAdmin`、root 保护、昵称校验、邮件验证码和令牌失效缓存；不复制第二套权限逻辑。
3. 为每个写操作写入 `audit_logs`，记录 actor、target 和前后差异。
4. 添加 Node 路由测试，覆盖普通用户拒绝、super admin、root、当前账户保护、ID 0 保护、字段过滤和分页上限。

## 3. 建立记录处置与审计合同

1. 新增 Admin 记录列表、补录预校验、确认补录、隐藏和恢复端点。
2. 将 `scripts/import-user-replay-records.ts` 的校验、去重、回放存储和写入核心抽到后端共享模块，让 CLI 与 Admin API 复用同一实现；通过显式策略参数保留 CLI 的 beta 历史导入语义，并让 Admin 补录使用 `official_v1`。
3. 抽取或复用现有记录软删除/恢复与最佳记录重算逻辑，确保所有调用方走同一根因路径。
4. 新增 Next Admin 审计与运行事件查询端点，复用现有表和映射函数。
5. 测试补录 dry-run、非法回放、非终局回放、大小限制、回放指纹重复、`client_record_id` 冲突、`official_v1` 正式写入、排行榜重算、成就触发、审计与用户归属。
6. 测试记录处置事务、排行榜重算、审计、分页与敏感字段不泄露。

## 4. 重写后台框架

1. 安装并固定 `@tabler/core`，只从 `src/entries/admin.ts` 引入其 CSS 与所需 JavaScript；不得修改其他入口。
2. 将 `admin.html` 改为 Tabler 垂直导航布局的最小静态挂载壳：侧边栏、顶栏、主内容、Modal/Offcanvas 挂载和无权限状态。
3. 移除 Admin 对 `main.css` 与 `palette_page.css` 的依赖，防止旧页面样式与 Tabler 冲突。
4. 将 `src/pages/admin-page.ts` 收缩为权限门禁、URL 参数路由和模块装配。
5. 新增统一 `src/services/admin.ts`，封装 Admin API 请求、分页和错误类型。
6. 使用结构化 i18n 字典替换 DOM 文本 MutationObserver。
7. 重写 `style/admin_page.css`，只保留 2048 品牌变量、状态方块、盘面预览、信息密度和必要响应式覆盖。

## 5. 实现仪表盘与用户中心

1. 实现状态方块带、最近用户、近期异常和最近管理员操作。
2. 实现用户搜索、筛选、分页与深链接。
3. 实现用户详情四个分区及按需加载。
4. 接入资料修正、启停、角色、强制注销和密码重置确认流程。
5. 为列表纯函数、URL 状态和权限可见性留下最小单测。

## 6. 实现记录、成就与恢复单

1. 实现全局记录筛选和记录详情抽屉，接入隐藏/恢复与排行榜影响提示。
2. 实现“成绩补录”独立一级模块，并复用单条对局补录抽屉：目标用户、回放文件/文本、原因、预校验摘要和确认写入；不渲染可编辑成绩字段。
3. 将现有成就管理逻辑迁入新模块，保留规则、图标、发放和回填。
4. 将恢复单改为列表优先、抽屉签发；合并手工盘面与回放上传两种来源。
5. 支持用户详情预填用户 ID 跳转。

## 7. 实现治理与系统工具

1. 实现管理员列表与 root-only 超级管理员授予/撤销。
2. 实现管理操作与运行事件双视图审计。
3. 将表浏览和只读 SQL 迁入系统工具，保留现有安全限制。

## 8. 删除旧实现并验证

1. 删除旧卡片 DOM、旧渲染函数、重复格式化辅助、过时状态变量和死 CSS。
2. 更新 Admin 相关单测与 Smoke；为桌面和窄屏准备已登录管理员、用户、记录、成就、恢复单与审计数据。
3. 确认 `2048-ranked` 无产品代码 diff。
4. 完成构建、类型、边界和视觉核验后再交付。

## 9. 收紧后台页面访问

1. 在 `2048-game-api` 的登录、注册完成、刷新和密码变更响应中同步设置仅供页面门禁使用的安全 Cookie，并新增 `/api/logout` 清除 Cookie。
2. 在 Nginx 对精确 `/admin.html` 启用 `auth_request`，把门禁 Cookie 映射为 Bearer token 后复用 `/api/admin/me`，将未登录和无权限统一映射为真实 404，并禁止 Admin/404 公共缓存。
3. 将前端 `/api/admin/me` 拒绝回退改为 `404.html`，让 Vite 等无反向代理环境保持一致的可见行为；显式登出同步通知后端。
4. 补充 Cookie 生命周期、页面权限矩阵、Nginx 配置和退出清理测试。

## Validation Commands

### 2048-game-api

- `npm run typecheck`
- `npm run test:node -- test/node/admin-console.spec.ts test/node/token-revocation.spec.ts test/node/achievements.spec.ts test/node/admin-rescue-offer-route.spec.ts`

### 2048-next

- `npm run api:types`
- `npm run api:types:check`
- `npm run test:unit -- tests/unit/admin-*.spec.ts`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run audit:resource-budget`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-admin-console.smoke.spec.ts`
- `npm run build`
- `git diff --check`

## Risky Files and Rollback Points

- `2048-game-api/src/server/app.ts`：Admin 写操作和排行榜重算；按 API 合同、记录处置、审计拆分提交。
- `2048-next/admin.html`、`src/pages/admin-page.ts`、`style/admin_page.css`：后台整体入口；先落壳和模块，再删除旧 DOM，保证每个提交可构建。
- `2048-next/openapi/2048next.v1.yaml` 与生成类型：必须同提交保持同步。
- `2048-next/package.json` 与锁文件：只新增 `@tabler/core` 及其必要传递依赖，不引入完整模板工程或额外插件。
- 不修改 `2048-ranked`；若出现跨仓库依赖，记录 Route Deviation 并选择不触碰 Ranked 的保守路径。

## Pre-start Checklist

- [x] 用户明确批准本版 PRD、布局、安全边界与 Tabler 集成方案。
- [x] `prd.md`、`design.md`、`implement.md` 已完成最终通读且无阻塞问题。
- [x] 实施前重新读取 `.trellis/spec/frontend-api-boundary.md`、`cross-repo-architecture.md` 和 `smoke-testing.md`。
- [x] 未运行 `task.py start`；仓库缺少该脚本的偏差已记录。

## Completion Status

- [x] 内测资格管理从 Next Admin 页面、合同和权威管理路由退场，历史表与数据保留。
- [x] 统一用户管理、记录处置、补录、审计和运行事件合同已落入 `2048-game-api`。
- [x] `admin.html` 已替换为仅 Admin 加载 Tabler 的独立后台壳，玩家页面资源不受影响。
- [x] 仪表盘、用户中心、记录、成绩补录、成就、恢复单、权限、审计和数据工具均已接入稳定深链接。
- [x] 用户最近活跃/排序、记录时间范围、恢复单状态/时间、审计时间范围筛选已补齐。
- [x] 单条终局回放补录已完成服务端预校验、正式写入、排行榜重算、成就评估和审计闭环。
- [x] 桌面、窄屏、中英文、服务边界、资源预算、生产构建和目标后端测试已验证。
- [x] `2048-ranked` 工作树保持零改动。
- [x] `/admin.html` 已由服务端门禁保护，非管理员返回真实 404，退出后门禁 Cookie 被清除。
- [ ] 将 `admin-page.ts` 继续拆成多个业务文件属于后续维护优化；本次保留单控制器，偏差与原因已记录。
