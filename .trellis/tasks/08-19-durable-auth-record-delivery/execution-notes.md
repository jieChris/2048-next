# 执行记录：持久登录与成绩可靠投递

## 当前状态

- 2026-08-19：用户批准 PRD、管理员最小运维范围及实施。
- 前端工作树：`2048-next/.worktrees/restart-confirm-setting-20260818`，分支 `codex/durable-auth-record-delivery-20260819`，基线 `origin/main` / `64f65a23`。
- 后端工作树：`.worktrees/durable-auth-record-delivery-api-20260819`，分支 `codex/durable-auth-record-delivery-20260819`，基线 `origin/main` / `15ef3c6`。
- 2026-08-20：前后端实现、限定范围最终复验和内置浏览器核对已完成；本次分别形成前端与后端本地提交。
- 未推送、未部署、未运行生产迁移、未写生产数据；`2048-ranked` 零改动。

## 已实施范围

### 持久设备会话

- 后端新增 `0029_device_sessions.sql` 和 `auth_device_sessions`：Cookie 保存 32 字节高熵随机值，数据库只保存 SHA-256，支持当前设备撤销、账号 `auth_version` 撤销和管理员单设备撤销。
- 登录、注册和密码相关成功路径创建设备会话；`POST /api/auth/refresh` 优先使用 `HttpOnly`、`Secure`、`SameSite=Lax` Cookie 恢复 15 分钟访问令牌。
- 设备 Cookie 在每次成功恢复时滚动续期至浏览器允许的 400 天上限；服务端不设置 30 天闲置过期。
- refresh 不轮换已经有效的设备 token，只更新 `last_used_at`。这是为避免多标签页并发 refresh 响应乱序，使后返回的旧 Cookie 立即失效；安全撤销仍由服务端会话行和 `auth_version` 完成。
- 旧的仍有效 Bearer 只能兑换一次设备会话；过期、已兑换或已撤销 token 返回稳定机器码。
- 前端访问令牌只保存在内存；启动时 cookie-first 自动恢复，并发恢复合并为一个 Promise；明确 `TOKEN_EXPIRED` 最多恢复并重试原请求一次。
- 只有稳定认证机器码会清认证。未分类 HTTP `401/403/410/419`、网络错误和 `AUTH_STATE_UNAVAILABLE` 不再误清有效登录。
- 主动退出只撤销当前设备会话和清认证显示缓存，不删除本地历史或任何待投递记录。

### IndexedDB 成绩发件箱

- `js/local_history_store.js` 增加向前兼容的同步元数据、`client_record_id`/回放哈希索引、持久写入读回校验、候选扫描和状态更新 API。
- 终局顺序改为：构建完整记录 → IndexedDB 写入 → 读回校验 → 清活动存档/消费当前会话 → 联网上传。
- 本地持久化失败返回 `LOCAL_PERSIST_FAILED`，保留活动证据，显示先导出回放/重试的明确提示，不继续联网。
- 旧 `online_pending_record_submit_signature_v1` 仅作为迁移源；成功导入 IndexedDB 后才清旧值，不再依赖 localStorage 的 20 条/约 10 MiB 容量作为主发件箱。
- 旧 localStorage 兼容回退在账号不匹配时也保留原待上传记录，不再因账号切换清除证据。
- 保存 `pending`、`waiting_auth`、`retry_wait`、`needs_action`、`invalid`、`synced`、重试次数、下次重试、错误码和服务器记录 ID。
- 游客记录不会自动归属随后登录的账号；历史页只有在玩家明确确认后才转移归属并补传。账号不匹配时保留记录并进入 `needs_action`。
- TS 主运行时与 legacy 终局记录字段已对齐，补齐 `best_tile`，避免本地历史最大方块被归零。

### 普通与分块上传

- 普通 `/api/records` 继续作为小回放主路径；以稳定 `client_record_id` 和回放指纹保持幂等，重复提交返回已有记录 ID。
- 所有前端成功路径都必须拿到 `id`、`record_id` 或 `server_record_id`。`success: true` 但缺 ID 转为 `SERVER_RECORD_ID_MISSING`，IndexedDB 和 legacy pending 都保留证据。
- 新增 `0029` 之后的 `0030_record_upload_tasks.sql` 以及创建/查询/传块/complete 路由；支持块长度、块 SHA-256、整体 SHA-256、断点恢复、重复块和完成幂等。
- 超过普通阈值或收到 `413`/过大机器码时切换分块；服务端 complete 完成 RPL1 语义验算后才原子创建或返回记录。
- RPL1 分块读取按块计算整体哈希，无撤回模式验算不再创建无用的撤回快照。
- 上传任务有用户隔离、并发数量、块数量、总大小、到期和临时文件路径边界；后台定期清理过期任务。

### 玩家与管理员体验

- 历史页新增同步状态、错误摘要、单条补传和“检查并补传”；自动重试失败不会移除手动补传能力。
- 服务器确认后写入服务器记录 ID；本地无效记录仍可查看和导出，不静默删除。
- 管理后台新增仅基于服务器已观测事件的投递健康、设备会话列表/撤销、记录投递诊断、审计字段和固定只读对账。
- 管理后台不推断浏览器中从未发送的记录，不展示 token/hash，不增加批量隐藏或任意 JSON 直入排行榜；既有单条隐藏与投递状态保持隔离。
- 没有使用 `review`、隐藏或删除其他玩家成绩来处理投递问题，也没有改变正常排行榜可见性。

## 验证记录

### 前端已通过

- 认证、普通/分块投递、终局落盘和 RPL1 六个专项文件：130 项。
- 针对最终类型修正重跑终局字段用例：26 项；针对旧账号归属保护重跑投递文件：70 项。
- `npx tsc --noEmit`。
- `npm run api:types:check`。
- `npm run audit:service-boundary`：463 文件，0 违规。
- `git diff --check`。

### 后端已通过

- 设备会话、投递审计、普通/分块上传、任务清理、管理员接口与 CORS 六个专项文件：40 项；此前回放验算专项也已通过。
- `npm run typecheck`。
- `git diff --check`。

最终提交前将按 `smoke-testing.md` 只重跑本任务的组合专项、类型/契约检查和 `git diff --check`；不扩大为无关全量测试。

### 内置浏览器核对

- `history.html` 在 `mist_cyan` 主题、内置浏览器默认桌面视口 `1707×960` 下，“检查并补传”可见，工具栏无溢出，页面无横向滚动。
- 临时移动端视口请求为 `390×844`，内置浏览器实际 CSS 视口为 `520×1125`；补传按钮仍完整位于视口内，页面无横向滚动。检查后已恢复默认视口并关闭代理标签。
- `admin.html` 在无本地后端/管理员会话时按既有安全逻辑跳转 `404.html`，因此没有伪造管理员身份或连接生产 API 做视觉测试；新增管理模块由前端管理员 UI 单元测试和后端管理员接口专项覆盖。

## 已知边界

- 分块上传解决单请求体上限、网络中断和重传开销，但服务端 `complete` 当前仍会把所有文本块拼成完整 RPL1 字符串后验算，并非从浏览器到数据库的全程流式解析。
- 后端任务表允许的 schema 上限为 512 MiB，当前配置默认 256 MiB；极端长局仍受服务器内存、临时磁盘和配置上限约束，不能宣称支持无限步数。
- 该边界不影响普通 4×4 记录，也不影响已落入 IndexedDB 的本地证据；超限时记录必须继续留在本地并显示可处理错误。

## Route Deviation

- 当前工作树没有 `.trellis/scripts/task.py` 或 `get_context.py`，无法执行标准任务创建/上下文命令；采用最保守路径，在既有 `.trellis/tasks/08-19-durable-auth-record-delivery/` 维护 PRD、设计、实施和本执行记录。该偏差只影响文档生成方式。
- `to-prd` 通常可发布外部 Issue，但没有外部发布授权，因此只维护本地 Trellis 文档。
- 两个仓库都不存在 `.trellis/spec/guides/index.md`；已完整读取实际存在的 spec index、API 边界、Smoke 和视觉规范后继续。
- Hono 按浏览器 Cookie 规范拒绝超过 400 天的 `Max-Age`；采用 400 天并在每次恢复时续期，而不是引入 30 天闲置期限。
- 设备 Cookie 最初设计为每次 refresh 轮换；并发多标签页会产生响应乱序并使刚写入的 Cookie 失效，因此改为稳定 opaque token + 服务端撤销/`auth_version`。这是保守的数据安全修复，不降低 Cookie 的随机强度、HttpOnly 或撤销能力。
- 前端工作树缺少被忽略的 `node_modules/.bin/openapi-typescript` 链接；只在被忽略的 `node_modules` 内链接主工作树现有二进制以运行 `api:types:check`，没有修改源码或依赖清单。
- 根级约束禁止启动独立 Playwright/外部浏览器；内置浏览器截图接口本轮不可用，且管理页需要真实管理员 API 会话，因此没有运行/更新 416 张视觉基线。采用最保守替代：内置浏览器 DOM/边界检查历史页、管理员前端结构单测及后端 API 专项，并明确保留该验证边界。
- 生产发布前备份已完成本地归档、校验和与前后引用一致性检查，也已传完异地文件，但外层 SSH 通道未正常回收，脚本没有写入新的 `last-success` 状态。发布因此暂停，直到独立通过本地 `sha256sum`、`pg_restore --list` 和异地 `rsync --checksum --dry-run` 逐文件一致性验证；未降低备份标准，也未修改或删除玩家数据。
- 首次前端推送在发布包构建阶段被 `game-manager-audit` 的 19 行 helper 门禁阻断，服务器部署步骤没有执行；采用现有 helper 拆分模式保持 payload 字段和值不变。同期 History Smoke 仍在页面启动后写入旧 localStorage fixture，与一次性迁移时序不符；仅改为导航前注入，以继续验证真实旧数据迁移。根级约束禁止本地启动独立 Playwright，因此只本地运行直接失败的审计，浏览器 Smoke 交由 GitHub Actions 复验。
- 第二次前端推送通过了上述审计与 History Smoke，但被页面 legacy 导入边界阻断；没有增加 allowlist，而是把原动态加载函数原样移到 `src/bootstrap/history-record-delivery-runtime.ts`，保持脚本顺序和禁用自动提交标志不变。随后直接边界审计、其余四个静态审计、TypeScript 和 release-readiness 均通过，服务器部署步骤仍未执行。
- 第三次前端推送通过全部静态审计及 History/Index Smoke，完整单测 2032 项中仅一条旧断言仍要求 `history` 创建已明确移除的全局用户徽标。产品代码未调整，只将该通用正向用例切换到仍应显示徽标的 `relay-5x5`；历史页排除行为继续由独立回归覆盖，服务器部署步骤仍未执行。
- 第四次前端推送通过静态审计和 2032 项单测，但 Smoke 发现新增 TypeScript API base helper 无条件给本地地址追加生产 fallback，导致持久会话启动请求越过本地代理并被 CSP 拦截；服务器部署步骤仍未执行。修复复用项目既有 localhost/127/IPv6 loopback 隔离规则，正式域候选不变，并增加共享 helper 回归用例。根级约束禁止本地启动独立 Playwright，因此本地只验证直接根因单测，完整 Smoke 继续交由 GitHub Actions 复验。

## 发布前仍需完成

1. 分别完成前后端本地提交；未经授权不推送。
2. 获得部署授权后，先确认生产 SHA、数据库备份、请求体/临时目录容量和迁移 dry-run。
3. 先部署兼容后端与只增迁移，再部署前端；迁移前后对比记录数、玩家数和排行榜可见性，任何未批准下降立即停止。
4. 生产验证必须使用正式域和内置浏览器，且不得用真实玩家成绩做破坏性测试。
