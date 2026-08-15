# 执行记录

## Route Deviation

- 仓库缺少 `.trellis/scripts/get_context.py`，无法执行标准包上下文脚本；采用最保守回退，直接读取 `.trellis/spec/index.md`、`frontend-api-boundary.md`、`cross-repo-architecture.md`、`smoke-testing.md` 及相关历史任务文档。
- 当前环境没有可调用的 `trellis` CLI，无法建立 Trellis channel；保留 Trellis 任务工件，并使用 Codex 原生多 Agent 协作完成并行审计与实现。
- 存储审计 Agent 在接手续跑时误判自己为主 Agent，将隔离工作树从 `6a0f1b8f` 快进到当时最新的 `origin/main` `22f1af97`。该操作没有覆盖未提交修复且无冲突，但超出原并行只读计划。采用最保守回退：不反向重置已发布上游提交，改为核对受影响文件并在新基线重跑全部相关验证后继续。
- 仓库没有 `npm test` 脚本；最终完整测试改用项目现有的 `npm run test:unit`，未新增别名或改动包脚本。

## 调查记录

- 生产容量诊断约 522 万字符；最大四项为 checkpoint 本地镜像、完整当前存档、轻量当前存档和本地历史镜像。
- 普通导航由 `RANKED_NAVIGATION_LINK_IDS` 和标题链接捕获器硬编码为 `abandon/navigation`，没有专项产品授权。
- 终局当前顺序为先清存档，再调用同步兼容本地历史保存；该兼容保存会吞掉 `localStorage` 与后台 IndexedDB 失败并返回假成功。
- 云端 pending 写入使用无返回值 `safeSetStorage()`，写失败后仍清理 checkpoint/当前会话，再从空 pending 读取，因此网络请求可能完全不发出。
- 二轮独立审计发现旧局 Promise、新局 checkpoint/session 清理、失败后生命周期重试、重开 pending 门控、队列满截断及非法 pending/fallback 原文覆盖等竞态；均按“先可靠写入、再按对局身份清理”的同一原则收敛。
- 最终规范审计又发现两个读路径缺口：结构化 future/malformed `record_schema_version` 会被旧客户端当作有效 pending 消费，以及 fallback 列表读取会把内存规范化结果自动写回并丢弃未知字段。前者在共享 payload normalizer 中按“字段缺失兼容旧数据、字段存在只接受当前数值版本”封闭；后者删除无硬合同的读时回写，展示和排序继续使用内存规范化结果。

## 基线验证

- 相关 5 个单元测试文件：134/134 通过。

## 验证记录

- 目标回归：8 个文件、163 个用例通过，覆盖普通导航、full/lite 去重、checkpoint 紧凑镜像、IndexedDB 迁移、配额失败、终局异步门控、pending 写失败与新局身份保护。
- 完整单元测试：305 个文件、1954 个用例全部通过。
- `npx tsc --noEmit`、变更 JS 的 `node --check`、`git diff --check` 全部通过。
- `npm run audit:service-boundary` 通过：459 个文件、0 个边界违规。
- `npm run build` 通过；仅保留仓库既有的 `ui-preview.html` 非 module script 构建警告。
- Codex 内置浏览器生产构建验证：标准 4×4 页面执行有效移动后点击“直通练习板”，练习板新标签正常打开，原对局未出现错误阻断提示；测试标签与本地服务均已清理。
- 独立本地历史审计以可控事务复现并验证迁移 CAS：迁移期间新增的兼容记录在后续 IndexedDB abort 后仍保留于 fallback；非法 JSON 原文保留，配额异常显式失败。
- full 仅写入 sessionStorage 时不再删除持久 lite；当前 lite 会继续尝试写入 localStorage，关闭标签后仍有最新轻量恢复点。
- fallback 严格读取、兼容记录清理 CAS、终局旧/新身份隔离、失败重试与重开门控均增加了可控回归。

## 最终稳定态验证（2026-08-03）

- 确认所有实现/审计 Agent 已停止写入后，按顺序执行验证。
- future/malformed pending 与 fallback 纯读专项：2 个文件、91/91 个用例通过。
- `npm run test:unit`：305 个文件、1979/1979 个用例通过。
- `npx tsc --noEmit` 通过。
- `npm run audit:game-manager` 通过。
- `npm run audit:service-boundary` 通过：459 个文件、0 个边界违规。
- `npm run audit:page-legacy-runtime-boundary` 通过：18 个文件、0 个 legacy import。
- 变更 JavaScript 的 `node --check` 与 `git diff --check` 通过。
- `npm run build` 独立串行通过，`precompress-dist` 为 392 个资源生成 784 个压缩文件；仅有仓库既有的 `ui-preview.html` 非 module script 警告。
- Codex 内置浏览器复验：标准 4×4 执行有效移动后打开练习板，新标签正确载入当前三枚方块；原对局无弹窗、无阻断，两页均无应用来源错误日志。测试标签与本地服务已清理。

## PR CI 修复（2026-08-03）

- `Refactor Gate` 暴露新增 fallback 纯读测试依赖 `saved_at` 动态补全后的首项排序；改为按稳定记录 ID 查找，不修改既有排序合同。
- `Smoke (history)` 仍在页面迁移完成后写入旧 `localStorage`，且异步导出刚触发就撤销下载监听；改为导航前一次性播种 legacy fixture、使用 async 存储 API，并等待下载回调完成。
- 上述规则已由 `.trellis/spec/smoke-testing.md` 的“前置状态必须显式”和“等待能力，不等待时间”覆盖，未重复扩张规范。
- 修复后目标单测 15/15、完整单元测试 1979/1979、`npx tsc --noEmit` 与 `git diff --check` 通过；按浏览器约束未在本机启动独立 Playwright，History Smoke 交由 GitHub CI 验证。
- 并行终局身份审计发现：无 `client_record_id` 的旧恢复局若先以 rescue 回放保存、Promise 完成前 live 回放编码恢复，会被误判为另一局并遗漏 `sessionSubmitDone`。身份检查改为先接受同模式、同种子下匹配的 rescue identity，再检查 live identity；TS 与实际 JS 运行时各增加 1 条回归。
- 旧恢复局身份专项 30/30、完整单元测试 1981/1981、`npx tsc --noEmit`、实际 JS `node --check` 与 `git diff --check` 通过。
- `Smoke (pages)` 暴露紧凑 checkpoint 镜像在移除 `ui_state.saved_state` 后未把会话身份字段提升到顶层；镜像 builder/normalizer 现对称保留 `ranked_session_token`、`challenge_id`、`initial_seed` 与 `seed`，并收紧不同 challenge 的拒绝分支，避免旧局镜像跨会话恢复。
- checkpoint 恢复 Smoke 改为等待既有 `waitForRankedMoveReady` 能力标记，不再固定等待 3 秒；本地历史 autosave Smoke 改为等待 `saveRecordAsync`/`getAllAsync` 与 `localHistorySaveInFlight.promise`，不再从 IndexedDB 成功后已清理的同步 fallback 读取，也删除了未确认页面对话框、实际未执行的重开断言。
- 重开 Smoke 原先手工提升预取会话、覆盖 manager 会话字段并以 `rankCheckpointApplying` 绕过正常重开门控，同时没有处理页面内异步确认框，制造了旧终局与新 token 混合的非真实状态。现改为调用正常 `restart()`、点击 `GameDialog` 确认并等待 manager 与 active-session 同时切换到下一会话；无需修改产品清理逻辑。
- 本轮本地验证：checkpoint 目标单测 76/76、完整单元测试 1981/1981、`npx tsc --noEmit`、实际 JS `node --check`、7 项边界/结构审计、`git diff --check` 与生产构建全部通过；按浏览器硬性约束未启动独立 Playwright，相关 pages Smoke 交由 GitHub CI 验证。
- 最终只读审查补充发现：相同 challenge 的 checkpoint 原先会在 seed 校验前直接接受；现按完整存档合同在双方 seed 可用时拒绝不一致。重开 Smoke 也补充等待在线提交钩子、旧会话身份及专用重开状态，避免在包装器绑定前触发测试。
- 修正后三项阻塞点经同一只读审查 Agent 复核关闭，未发现新的阻塞问题；完整单测与生产构建再次通过。
- CI `30810549442` 的 Refactor Gate 与 Pages Smoke 共同复现 compact checkpoint 刷新恢复失败；现场状态为镜像身份与 seed 完整、候选通过校验，但 `lastRankedCheckpointRestoreError` 为 `parse_unavailable`。实际 play 加载链已退役旧 replay helpers 脚本，而 TypeScript replay helper installer 没有把其既有内部 `parseReplayImportEnvelope(manager, text)` 暴露到 `online_leaderboard_runtime.js` 使用的共享全局入口。
- 采用最小共享层修复：`installGameManagerReplayHelperGlobals()` 直接安装既有 parser，并在 installer 单测锁定该运行时合同；没有增加固定延时、恢复重试或重复 parser。
- parser 就绪后的内置浏览器复现进一步证明：checkpoint 身份可恢复，但 `restartWithBoard()` 内部 `setup()` 会清空 `rankCheckpointApplying`；核心 move 因恢复标志直接中止，且非 replay 状态不消费 `forcedSpawn`。即使放行 move，替换后的初始盘面也未回写 `sessionReplayV1.init_tiles`，指定出生块未写入 `lastSpawn`，会使当前盘面、分数及下一次序列化继续分叉。
- 最小修复复用既有恢复标志和 session replay 同步器：setup 后恢复 `rankCheckpointApplying`，仅在 `disableSessionSync === true` 时放行内部恢复 move（用户输入层仍无条件拦截），应用态消费并记录指定出生块，并在 `restartWithBoard()` 替换盘面后重同步回放初始块。最终 4 个目标单测文件 141/141、完整单元测试 1985/1985、TypeScript、变更 JS 语法检查、6 项发布相关结构/边界审计、`git diff --check` 与生产构建全部通过。
- Codex 内置浏览器最终复验：标准 4×4 当前对局连续执行 3 次有效移动后生成紧凑 checkpoint，再写入 424242 分冲突存档并刷新；刷新前后 `clientRecordId`、8 分盘面、challenge/seed/token 均一致，恢复错误为空、镜像仍存在，冲突存档未被采用。测试标签与自建本地服务已关闭。
