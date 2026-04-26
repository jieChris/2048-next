# 后端长期安全运行与高可信排位任务文档

最后更新：2026-04-24

## 1. 目标

本任务文档用于推进 2048 项目从“可运行”升级为“可长期安全在线运行、可维护、可审计、支持高可信排位”的后端体系。

当前后端部署在 Cloudflare Worker，主要使用 D1 和 COS 承载用户数据、排行榜、记录和回放。后续方向是先修复线上高风险问题，再逐步迁移到独立服务器后端，并将核心数据存储收敛到服务器侧，降低长期运维复杂度。

本轮目标不是单纯换技术栈，而是拿到以下能力：

- 登录与身份不能被伪造。
- 排行榜只接受服务端验证过的成绩。
- 排位挑战必须有服务端状态，并且一次 session 只能产生一次最终提交。
- 数据库、回放文件、排行榜、审计日志可以备份、恢复和重算。
- 生产 schema 变更走显式 migration，不在请求中自动改表。
- 后端可以长期运行、可监控、可回滚、可排查。

## 2. 当前主要风险

| 优先级 | 问题 | 后果 |
| --- | --- | --- |
| P0 | legacy token 可伪造 | 攻击者可冒充任意用户调用登录后接口 |
| P0 | `/api/score` 接受裸分数 | 用户可直接提交极高分污染排行榜 |
| P1 | ranked session 无服务端消费状态 | 用户可围绕同一个 seed 反复试出更好结果 |
| P1 | token secret 回退到 password/OTP pepper | secret 边界混乱，泄露或轮换会产生连锁风险 |
| P2 | COS 与 D1 分步写入无对账 | 可能出现孤儿回放、记录与榜单不同步 |
| P2 | 请求时自动建表/改表 | 生产 schema drift 被隐藏，请求延迟与失败不可控 |
| P2 | 镜像域优先跨域 API | 镜像站依赖主域，CSP 报错和首请求延迟风险 |

## 3. 团队角色分配

| 成员 | 角色 | 主要职责 |
| --- | --- | --- |
| A | 项目负责人 / 架构负责人 | 确认迁移边界、接口兼容策略、上线节奏和最终验收 |
| B | 后端安全负责人 | 修复认证、token、secret、权限校验和安全测试 |
| C | 后端数据与排位负责人 | 设计 Postgres schema、ranked session、record、leaderboard 和 replay 校验链路 |
| D | 前端与 API 兼容负责人 | 保持前端 `/api` 调用稳定，调整 API base、CSP、失败提示和兼容开关 |
| E | DevOps / SRE 负责人 | 服务器部署、反代、备份、日志、监控、迁移脚本和回滚方案 |
| F | QA / 审计负责人 | 制定测试矩阵、刷榜攻击用例、迁移验收、回归和发布签字 |

## 4. 阶段计划

### 阶段 0：线上止血

目标：在不等待整体迁移的前提下，先关闭最高风险入口。

| 任务 | 负责人 | 优先级 | 交付物 | 验收标准 |
| --- | --- | --- | --- | --- |
| 移除 legacy token fallback | B | P0 | 后端补丁与测试 | 手工构造 base64 token 无法通过 `/me`、`/records`、`/score` |
| 关闭裸 `/api/score` 写榜能力 | B、C | P0 | `/api/score` 兼容处理方案 | 未携带有效 replay 的请求不能影响公开排行榜 |
| 拆分生产 secret | B、E | P0 | `AUTH_TOKEN_SECRET`、`RANKED_SESSION_SECRET` 独立配置 | 生产缺少任一 secret 时健康检查失败或拒绝启动 |
| API base 同源优先 | D | P2 | `api_shared_utils.js` 调整 | `2048next.cn` 优先访问同源 `/api`，再 fallback |
| 止血验证 | F | P0 | 安全回归记录 | token 伪造、裸分刷榜、镜像 API fallback 均有测试证据 |

阶段 0 完成后，线上风险应从“可直接伪造身份和刷榜”降到“迁移前可控运行”。

### 阶段 1：独立后端基础设施

目标：搭建可长期运行的自托管游戏数据后端。

建议技术边界：

- API 服务：Node.js + Hono/Fastify，或 Go。
- 数据库：Postgres。
- 回放文件：服务器磁盘目录，例如 `/data/2048/replays`。
- 文件记录：数据库保存 replay hash、路径、大小、状态、创建时间。
- 入口：Caddy 或 Nginx 反代 HTTPS。
- Cloudflare：继续做 DNS/CDN/WAF，可选保留 Worker 作为轻量代理。

| 任务 | 负责人 | 优先级 | 交付物 | 验收标准 |
| --- | --- | --- | --- | --- |
| 新后端项目骨架 | C、E | P1 | API 服务、配置、健康检查 | 本地和服务器均可启动，`/health` 返回版本与依赖状态 |
| Postgres schema v1 | C | P1 | migration 文件 | 用户映射、records、ranked_sessions、leaderboard、audit_events 表可迁移和回滚 |
| 回放磁盘存储模块 | C、E | P1 | replay storage service | 写入使用 hash 命名，支持读取、删除、校验 size/hash |
| 反代与环境隔离 | E | P1 | Caddy/Nginx 配置 | staging 与 production 域名、日志、证书独立 |
| API 合约文档 | A、D、C | P1 | `/api` contract 文档 | 前端无需大改即可切换目标服务 |

### 阶段 2：高可信排位与排行榜

目标：让排行榜只来自可验证记录，让排位 session 具有服务端事务约束。

| 任务 | 负责人 | 优先级 | 交付物 | 验收标准 |
| --- | --- | --- | --- | --- |
| ranked session 持久化 | C | P0 | `ranked_sessions` 表和接口 | 每个 session 有 `created`、`started`、`consumed`、`expired` 状态 |
| 一次性提交事务 | C | P0 | record 提交事务 | 同一 ranked session 第二次最终提交被拒绝 |
| replay 服务端重算 | C、F | P0 | replay verify pipeline | 服务端重新计算 score、steps、final_board、seed、challenge |
| leaderboard 派生规则 | C | P0 | leaderboard update job 或事务逻辑 | 榜单只从 verified records 更新，不信任客户端裸分 |
| 反作弊审计事件 | B、F | P1 | `audit_events` 写入 | 伪造 token、重复 session、replay mismatch、异常高分均可追踪 |

关键约束：

- 客户端提交的 score 只能作为展示或调试输入，不能作为最终排名依据。
- 最终 record 的 score、steps、mode、board、challenge 必须由服务端 replay verifier 产出。
- ranked session 的消费与 record 插入必须在同一数据库事务中完成。

### 阶段 3：数据迁移与灰度切换

目标：从 Worker + D1 + COS 平滑迁移到独立后端，避免一次性大切换。

| 任务 | 负责人 | 优先级 | 交付物 | 验收标准 |
| --- | --- | --- | --- | --- |
| D1 数据导出 | E、C | P1 | 导出脚本和校验报告 | 用户、scores、records、ranked 数据可重复导出 |
| COS 回放迁移 | E | P1 | 回放下载与 hash 校验脚本 | 数据库记录与本地 replay 文件一一对应 |
| 旧数据清洗 | C、F | P1 | 异常记录列表 | 伪造风险、缺 replay、重复记录被标注处理策略 |
| 只读接口灰度 | A、D、E | P1 | leaderboard、records 只读切换 | 前端读接口可切到新服务并可回滚 |
| 写接口灰度 | A、C、D、E | P0 | `/records`、ranked session 切换 | 新写入只进入新后端，旧系统不再写榜 |
| 最终下线旧写路径 | A、B、E | P0 | Worker 旧写接口禁用 | 旧 `/score`、旧 ranked 写入不可再影响正式数据 |

灰度原则：

- 先迁只读，后迁写入。
- 先迁普通记录，再迁排位。
- 每次只切一个接口组。
- 每次切换都保留回滚开关。

### 阶段 4：长期运维与安全治理

目标：项目可以长期线上运行，不依赖临时人工排查。

| 任务 | 负责人 | 优先级 | 交付物 | 验收标准 |
| --- | --- | --- | --- | --- |
| 数据库备份 | E | P0 | 每日备份与恢复演练 | 至少保留 7-30 天，能在测试库恢复 |
| replay 目录备份 | E | P0 | 增量备份任务 | replay 文件可按日期恢复 |
| 日志与监控 | E、F | P1 | dashboard 和告警 | 错误率、提交量、重复提交、异常高分可观察 |
| 管理后台 | A、C、D | P1 | 管理页面或 CLI | 可封禁用户、隐藏记录、重算榜单、查看校验失败原因 |
| 定期榜单重算 | C、E | P1 | scheduled job | 可从 verified records 重建 leaderboard |
| 安全回归套件 | B、F | P1 | 自动化测试 | 每次发布覆盖认证、刷榜、重复 session、越权访问 |

## 5. 里程碑

| 里程碑 | 目标 | 必须完成的任务 |
| --- | --- | --- |
| M0：风险止血 | 现有线上系统不再可被低成本伪造身份和刷榜 | legacy token 移除、裸 score 禁榜、secret 拆分 |
| M1：新后端可运行 | 独立服务器后端具备健康检查、数据库、回放存储 | API 骨架、Postgres migration、replay storage、反代 |
| M2：可信排位闭环 | 排位 session、record、leaderboard 形成事务闭环 | session 一次性消费、replay 重算、榜单派生 |
| M3：灰度上线 | 生产流量逐步迁移到新后端 | 只读灰度、写入灰度、旧写路径下线 |
| M4：长期运维 | 系统具备备份、监控、审计和管理能力 | 备份恢复、日志告警、管理后台、安全回归 |

## 6. 每个成员的近期任务

### A：项目负责人 / 架构负责人

- 确认最终后端边界：Cloudflare 只保留 DNS/CDN/WAF，还是短期保留认证 Worker。
- 确认是否接受 Postgres + 服务器磁盘 replay 存储作为目标架构。
- 审核 API 兼容策略，确保前端仍使用 `/api` 统一入口。
- 决定 M0、M1、M2 的上线顺序和回滚标准。

### B：后端安全负责人

- 删除 `parseLegacyToken` 兼容入口并补测试。
- 禁止未校验 replay 的请求影响公开 leaderboard。
- 拆分并强制要求 `AUTH_TOKEN_SECRET`、`RANKED_SESSION_SECRET`。
- 建立安全测试用例：伪造 token、越权 record、重复 session、裸分刷榜。

### C：后端数据与排位负责人

- 设计 Postgres schema v1。
- 设计 `ranked_sessions` 状态机。
- 迁移 replay verifier 到新后端或封装为共享模块。
- 实现 record 提交事务和 leaderboard 派生逻辑。

### D：前端与 API 兼容负责人

- 调整 API base 策略，第一优先级使用同源 `/api`。
- 梳理前端调用 `/score`、`/records`、`/ranked-session/start`、`/ranked-checkpoint` 的路径。
- 添加迁移期间的兼容开关和错误提示。
- 配合灰度验证不同域名、CSP 和 fallback 行为。

### E：DevOps / SRE 负责人

- 准备服务器、Postgres、反代、证书和环境变量管理。
- 设计数据库备份、replay 目录备份和恢复演练。
- 编写 D1 与 COS 迁移脚本。
- 建立日志、监控、告警和回滚方案。

### F：QA / 审计负责人

- 建立 M0 安全回归清单。
- 建立 replay 校验、排位重复提交、榜单重算测试矩阵。
- 每个里程碑输出验收记录。
- 发布前执行刷榜攻击模拟和迁移数据抽样核对。

## 7. 验收标准

项目进入“可长期安全线上运行”状态，至少需要满足：

- 任意构造的旧 token 不能通过认证。
- 客户端裸 score 不能影响正式排行榜。
- 每个 ranked session 只能提交一次最终 verified record。
- leaderboard 可从 verified records 完整重建。
- 数据库和 replay 文件均有可验证备份。
- 生产 schema 变更全部通过 migration。
- 关键操作有 audit event。
- 线上错误、异常提交、重复提交、异常高分可被监控发现。
- 前端域名、镜像域、CSP、API fallback 均通过回归。

## 8. 推荐执行顺序

1. B、C 先完成 M0 止血，F 同步做安全回归。
2. E 搭建新服务器、Postgres、反代和备份基础设施。
3. C 实现新后端的 ranked session、record、leaderboard 核心链路。
4. D 保持前端 `/api` 合约不变，并准备灰度切换开关。
5. E、C 迁移 D1 与 COS 数据，F 做抽样核对。
6. A 组织 M2/M3 验收，通过后逐步切换生产写流量。
7. M3 稳定后，下线旧 Worker 写路径，只保留必要兼容或代理能力。

## 9. 第三轮复审后续任务（2026-04-25）

本节用于承接 2026-04-25 复审新增的 5 个后续问题。当前 M0 止血已经有明显进展，但高可信排位还需要继续收敛到“verified record 是唯一事实来源、ranked session 有短时限和事务约束、生产 schema 不在请求路径变更”的目标。

### 9.1 任务总表

| 编号 | 任务 | 优先级 | 负责人 | 协作者 | 目标 |
| --- | --- | --- | --- | --- | --- |
| T11 | 废弃 `/api/score` 正式写榜能力 | P1 | B | C、D、F | leaderboard 只从 `/api/records` verified record 派生 |
| T12 | 修正 ranked session 消费与 record 插入顺序 | P1 | C | B、E、F | 避免 session 已消费但没有最终记录 |
| T13 | 缩短 ranked session TTL 并约束 checkpoint 恢复窗口 | P1 | C | A、D、F | 降低 seed grinding 风险 |
| T14 | replay fingerprint 去重改为数据库级约束 | P2 | C | E、F | 并发重复 replay 不会插入多条记录 |
| T15 | 停止生产请求路径 DDL | P2 | E | C、B、F | 生产 schema 变更只走 migration |
| T16 | 更新 QA / SRE 验收矩阵 | P2 | F | A、B、C、D、E | 把 T11-T15 纳入发布门禁 |

### 9.2 T11：废弃 `/api/score` 正式写榜能力

负责人：B  
协作者：C、D、F

背景：

- 裸 `/api/score` 写榜已经被禁用。
- 但 `/api/score` 带 `replay_string` 时仍会校验 replay 后调用 leaderboard 同步。
- ranked 模式下该路径还会消费 ranked session，但不会创建 `user_records`。
- 长期目标是 leaderboard 只能从 verified `user_records` 派生。

实施要求：

- 将 `/api/score` 固定为兼容 no-op，返回 `success: true`、`skipped: true`、`reason: "verified_record_required"`。
- `/api/score` 不再消费 ranked session。
- `/api/score` 不再写 `scores`、`mode_scores` 或任何正式 leaderboard 派生表。
- 前端保留对 `/api/score` 的兼容调用可以接受，但最终成绩提交必须依赖 `/api/records`。
- D 评估是否移除或降低前端 `maybeSubmitScoreOnGameOver` 的触发优先级，避免多余请求影响体验。

验收标准：

- 带 replay 的 `/api/score` 不会写榜。
- 带 ranked session token 的 `/api/score` 不会消费 `ranked_sessions`。
- `/api/records` 成功后 leaderboard 正常更新。
- F 增加回归用例：`/api/score` 带 replay、带 forged score、带 ranked token 均不改变正式榜单。

### 9.3 T12：修正 ranked session 消费与 record 插入顺序

负责人：C  
协作者：B、E、F

背景：

- 当前 `/api/records` 先上传 replay 到 COS，再消费 ranked session，然后插入 `user_records`。
- 如果 session consume 成功但 `user_records` 插入失败，会出现 session 已消费但没有最终 record 的状态。
- D1 与 COS 不能组成完整事务，但 D1 内部状态至少要避免“已消费无记录”。

短期 Worker / D1 要求：

- 将 `user_records` 插入与 `ranked_sessions` 消费收敛到同一 D1 原子边界；若当前 D1 API 不能提供可靠事务，则改为可恢复状态机。
- 可恢复状态机至少包括：`started` -> `finalizing` -> `consumed`，并记录 `final_record_id`、错误原因和更新时间。
- record 写入失败时，session 不应进入最终 consumed 状态。
- 如果 record 已存在且是同一 replay 的幂等重复提交，必须返回原 record，而不是消耗失败或生成新记录。
- 保留 COS 上传失败后的清理逻辑；若 D1 成功但 COS 清理失败，要写入可审计的 repair 标记。

长期 Postgres 要求：

- 在一个数据库事务中完成：锁定 ranked session、验证状态、插入 verified record、标记 session consumed、刷新 leaderboard。
- 使用唯一约束保证一个 ranked session 只能有一个 verified record。

验收标准：

- 模拟 `user_records` 插入失败时，ranked session 不能留下 `status = "consumed"` 且 `final_record_id IS NULL`。
- 模拟重复提交同一 replay 时，返回幂等结果，record 数量不增加。
- 模拟并发最终提交时，最多一个请求成功，失败请求返回明确的 `RANKED_SESSION_CONSUMED` 或冲突码。
- F 增加故障注入测试，覆盖 consume 成功、insert 失败、duplicate、conflict 四类路径。

### 9.4 T13：缩短 ranked session TTL 并约束 checkpoint 恢复窗口

负责人：C  
协作者：A、D、F

背景：

- 当前 ranked session 默认 90 天，最大 365 天。
- 即使一次性消费已经实现，长 TTL 仍允许用户拿到 seed 后长期离线搜索最佳终局，再只提交一次。

实施要求：

- A 确认排位体验目标：例如 30 分钟、60 分钟或 120 分钟。
- C 将默认 TTL 调整为小时级，最大 TTL 不超过 24 小时；生产环境建议先使用 60-120 分钟。
- ranked checkpoint 的保存、读取、删除都要受同一 session 有效期约束。
- session 过期后，checkpoint 不再恢复为可继续排位的状态。
- D 增加前端过期提示和重新开始排位的处理。

验收标准：

- 过期 session 不能 final submit。
- 过期 session 不能继续保存 checkpoint。
- 过期 checkpoint 不能恢复成可提交的排位局。
- 前端遇到 `RANKED_SESSION_EXPIRED` 时能清理本地排位状态并提示重新开始。

### 9.5 T14：replay fingerprint 去重改为数据库级约束

负责人：C  
协作者：E、F

背景：

- 当前代码会按 `replay_fingerprint` 预查重复记录，但数据库只建普通索引。
- 并发提交同一 replay 时，两个请求可能都通过预查后插入。
- Postgres 目标 schema 已经有 verified replay dedupe 约束，D1 过渡期也需要收敛。

实施要求：

- E 先盘点生产 D1 中 `(user_id, mode_key, replay_fingerprint)` 是否已有重复。
- C 准备数据清洗策略：保留最早 verified record 或分数最高 record，其他标记为重复或隐藏。
- 清洗完成后添加 D1 唯一索引；如果 D1 对 NULL 的唯一行为不满足需求，使用只对非空 fingerprint 生效的替代方案。
- 插入冲突时返回幂等 duplicate 或明确 conflict，不产生 500。
- Postgres migration 保持 `records_verified_replay_dedupe_idx`，并在导入阶段执行去重报告。

验收标准：

- 同一用户、同一 mode、同一 replay fingerprint 最多存在一条 active verified record。
- 并发重复提交不会插入多条记录。
- 历史重复数据有清洗报告。
- F 增加 replay fingerprint 并发或模拟冲突测试。

### 9.6 T15：停止生产请求路径 DDL

负责人：E  
协作者：C、B、F

背景：

- 已经新增 D1 baseline migration。
- 但 Worker 运行时仍在请求路径中 `CREATE TABLE`、`ALTER TABLE`、`CREATE INDEX`。
- 这会隐藏 schema drift，并可能在生产请求中引入不可控延迟和失败。

实施要求：

- E 制定 D1 migration 发布流程：staging 先执行、校验、备份，再 production 执行。
- C 将运行时代码拆成两种模式：开发自动 bootstrap、生产只做 schema version check。
- 生产环境缺表、缺列、缺索引时应快速失败并返回可诊断错误，不自动修改 schema。
- B 确认 secret 和 schema health check 不泄露敏感信息。
- F 将 schema migration check 纳入发布门禁。

验收标准：

- production 配置下请求路径不执行 `CREATE TABLE`、`ALTER TABLE`、`CREATE INDEX`。
- 发布前必须执行 migration，并记录 migration 版本。
- `/api/health` 能暴露非敏感的 schema 版本和缺失状态。
- staging 故意缺列时，服务快速失败并给出明确错误。

### 9.7 T16：更新 QA / SRE 验收矩阵

负责人：F  
协作者：A、B、C、D、E

实施要求：

- 将 T11-T15 写入 `docs/BACKEND_TRUSTED_OPERATION_QA_MATRIX.zh-CN.md`。
- 将 session consume / record insert 故障恢复写入 SRE runbook。
- 将 `/api/score` 废弃策略写入 API 兼容文档。
- 将 ranked session TTL 和过期行为写入前端验收项。
- 每个任务完成后记录：改动文件、测试命令、测试结果、残余风险。

验收标准：

- QA 文档中有 T11-T15 的测试用例、预期结果和负责人。
- SRE 文档中有 replay / record / session 不一致时的排查和修复步骤。
- A 在 M2 验收前完成一次任务清单复核。

## 10. 更新后的执行顺序

1. B、C、D 先完成 T11，确保正式榜单只走 `/api/records`。
2. C、B、F 立刻推进 T12，修正 ranked session 与 record 的一致性边界。
3. A、C、D、F 同步推进 T13，确定 TTL 策略并完成前后端过期处理。
4. C、E、F 推进 T14，先盘点和清洗，再加数据库级去重约束。
5. E、C、F 推进 T15，把生产 DDL 从请求路径迁移到发布流程。
6. F 维护 T16，把所有新增风险纳入 QA / SRE / 发布门禁。
7. T11-T15 完成后，再进入 M2/M3 的独立后端迁移和灰度切换。

## 11. 决策建议

建议迁移后端，但不要在 P0 修复前等待大迁移完成。

短期：现有 Cloudflare Worker 继续承载线上流量，但必须立即修复伪造 token 和裸分刷榜问题。

中期：建立独立服务器后端，使用 Postgres 管理结构化数据，使用服务器磁盘保存 replay 文件，并配套备份。

长期：Cloudflare 只承担边缘流量、DNS、WAF、CDN 或轻量代理；游戏数据、排位、榜单、审计、管理能力集中在可控服务器后端。
