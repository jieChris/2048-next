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
