# Execution Notes

## Route Deviation

- 2026-08-02：仓库存在 `.trellis/spec` 与 `.trellis/tasks`，但缺少 Trellis 标准的 `./.trellis/scripts/task.py`，无法执行规定的 `task.py create`。采用最保守回退：仅手工创建本次规划目录与规划文档，不启动实施、不修改产品代码；后续继续按 Trellis 的 PRD → Design → Implement → 用户审批流程推进。
- 2026-08-02：开始实施前确认两个目标仓库均缺少 Trellis `./.trellis/scripts/get_context.py`，且不存在 `.trellis/spec/guides/index.md`。采用最保守回退：手工枚举并完整读取 `2048-next` 与 `2048-game-api` 的 spec 索引及全部相关规范；不触碰 `2048-ranked`。
- 2026-08-02：实施计划原拟把后台控制器继续拆成多个业务模块。浏览器联调时确认 URL 路由、对话框和跨模块刷新共享同一小型状态，继续拆分会在本批次扩大状态同步与回归面。采用保守回退：保留单一 `admin-page.ts` 控制器，仅抽离 Admin API 边界并删除旧实现；功能合同、测试和页面结构不缩水。后续当该控制器再次出现独立维护需求时再按业务边界拆分。
- 2026-08-02：发布前发现后端本地 `main` 与远端 `main` 已分叉，Next 当前功能分支也落后于远端 `main`，且两个原工作区均混有其他未提交任务。采用最保守回退：保留原工作区与无关改动不动，只提交本任务文件，再从最新 `origin/main` 创建干净发布工作区并移植本任务提交；后端先部署并通过健康检查，随后再发布 Next/Nginx，避免门禁先上线导致管理员临时全部返回 404。
- 2026-08-02：生产后端 Compose 使用固定镜像标签 `2048-game-api:local`，首次构建后执行普通 `up -d --no-build` 未检测到镜像内容变化，运行容器仍保持旧版本。采用最保守回退：不触碰 PostgreSQL，只对 API 服务补执行 `--force-recreate`；容器恢复 healthy 后，内外网健康检查均确认版本已切换到 `0eabc95`。
- 2026-08-02：Next 发布 PR 继承了远端 `main` 已存在的 Pages Smoke 红灯：色板用例硬编码旧 CSS 缓存版本，而页面入口已更新版本号；该失败与 Admin 产品代码无关，但会阻断发布。采用最保守回退：删除不属于产品合同的精确查询串断言，保留同一用例内完整的最终样式与交互断言，并把“不得硬编码资源缓存版本”沉淀到 Smoke 规范。
- 2026-08-02：Next 首次生产发布后，未登录 `/admin.html` 返回 500 而非 404；主站和 API 健康，定位为站点 Nginx 容器把鉴权子请求发往自身的 `127.0.0.1:3010`，无法连接实际位于共享 Docker 网络的 API 容器。采用最保守回退：仅把上游改为现有容器 DNS `2048-game-api:3001`，并让配置校验与站点运行都显式加入 `edge-migrate-net`；不改后端、不触碰数据库，补回归断言后重新发布并复验门禁。

## Delivery Summary

- `2048-next/admin.html` 已成为 Tabler 驱动的完整后台入口；固定侧栏、全局搜索、深链接和窄屏抽屉可用。
- 用户、记录、成就、恢复单、管理员权限、管理审计、运行事件和只读数据工具已统一进入该入口。
- 对局补录只接受单条完整终局回放，原因必填；服务端预校验后写入 `source=admin`、`record_era=official_v1`，并刷新排行榜、评估成就、记录审计。
- 用户最近活跃/排序、恢复单状态/时间、管理审计和运行事件时间范围筛选已补齐。
- 内测资格管理入口和 Admin allowlist 路由已移除，历史表与历史数据未删除。
- `2048-ranked` 未修改。
- `/admin.html` 已增加真实服务端门禁：登录/刷新/密码变更同步签发仅限该页面路径的 HttpOnly Cookie，Nginx 通过 `auth_request` 复用 `/api/admin/me`；未登录、普通用户、`board_admin`、停用管理员和失效 token 统一返回 404。
- Admin 页面和 404 响应均禁止浏览器与 Cloudflare 公共缓存；显式退出登录会调用 `/api/logout` 清除门禁 Cookie，前端无反向代理环境则回退到 `404.html`。

## Validation Results

- `2048-next`：全量 Unit 299 个文件、1872 项测试通过；Admin/OpenAPI 目标 Unit 41 项通过。
- `2048-next`：Admin、成就和夜间模式 Smoke 共 9 项通过；Admin 中英文审计 2 项通过。
- `2048-next`：`api:types:check`、TypeScript、生产构建、服务边界、旧运行时边界、资源预算和 `git diff --check` 通过。
- `2048-next`：生产依赖 `npm audit --omit=dev` 为 0 项漏洞。
- `2048-game-api`：TypeScript 通过；Admin、令牌失效、成就、恢复单、补录、内测退场和部署边界共 69 项测试通过；`git diff --check` 通过。
- `2048-ranked`：`git status --short` 为空。
- 页面门禁增量验证：`2048-next` 全量 Unit 299 个文件、1874 项通过；Admin/账号设置/用户页 Smoke 20 项通过；生产构建、OpenAPI 同步、服务边界、旧运行时边界、资源预算与 `git diff --check` 通过。
- 页面门禁增量验证：`2048-game-api` 全量 Node 23 个文件、177 项通过，TypeScript 与 `git diff --check` 通过；覆盖 Cookie 签发/清除、`board_admin` 拒绝和停用配置管理员拒绝。
- 本机未安装 Nginx 或容器运行时，未单独执行 `nginx -t`；仓库部署流程会在切换版本前使用 `nginx:1.27-alpine nginx -t` 校验本次配置。
