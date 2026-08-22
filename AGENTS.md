# 项目协作约定

## AI Agent 工作目录、Git 与发布纪律

本项目由单人维护。以下规则是强制约定，优先于临时的“方便操作”：

- 前端唯一工作目录是 `/Users/a19/Documents/2048-Next/2048-next`。
- API 是独立仓库，唯一工作目录是 `/Users/a19/Documents/2048-Next/2048-game-api/2048-game-api`；前端不得在本仓库实现 API、数据库或迁移。
- 日常开发只使用 `main`，不得创建功能分支、临时 worktree 或在 `.worktrees`、`_backups` 中直接开发。历史分支只作为只读归档，不自动删除、不参与日常合并。
- 不得混用两个仓库的目录、提交、构建产物或部署目录。

### 每次开始前

在查看或修改文件前，必须在目标仓库执行：

```bash
pwd
git branch --show-current
git status --short --branch
git fetch origin
git log --oneline --left-right main...origin/main
```

若工作树有改动，先查看 `git diff`、确认改动归属并保留备份；未确认前禁止 `git pull`、`reset`、`checkout`、删除文件、删除分支、删除 worktree 或清理 stash。发现本地与 `origin/main` 分叉时先停下并报告，不擅自选择覆盖方向。

### 单人主线生命周期

```text
确认目录/分支/工作树
→ 修改最小范围
→ 本地静态与目标验证
→ 本地 commit
→ 用户明确要求后 push origin/main
→ GitHub CI 通过
→ 用户明确要求后，锁定 commit 部署
→ 线上健康检查并核对运行版本
```

- `commit` 只表示本地 Git 已保存；`push` 才表示 GitHub 已更新；`deploy` 才表示服务器已更新。三者必须分开报告，不能把其中一个当成另外两个。
- 未经用户明确要求，不得 push 或 deploy。部署不得从未知目录、未提交文件或旧 worktree 取代码，必须使用明确的 commit SHA 构建。
- 推送前至少检查：

  ```bash
  git diff --check
  git status --short
  git log -1 --oneline
  ```

- 推送后必须确认本地与远端一致：

  ```bash
  git fetch origin
  git status --short --branch
  git rev-parse HEAD
  git rev-parse origin/main
  ```

  两个 SHA 不一致时不得宣称同步。
- 跨仓库发布必须同时记录 `frontend commit`、`api commit`、部署时间；只改动一个仓库时明确写出另一个仓库未变更。
- 回滚优先切换到已知 release/tag 或已核实的历史 commit，先备份并检查数据迁移影响；不得用回滚代码覆盖或删除业务数据。
- 遇到必须偏离计划的极端情况，立即在对应 `.trellis/tasks/*/execution-notes.md` 的 `Route Deviation` 中记录原因、影响、保守替代方案和恢复条件。

### 交付报告

每次完成任务都要明确报告：修改文件、验证结果、是否 commit、是否 push、是否 deploy，以及本地 `HEAD`、`origin/main` 和服务器实际运行 commit。没有执行的动作写“未执行”，不得用“已更新”含糊代替。

## 本地预览

- 只要用户要求打开本地预览或测试页面，交付页面前必须准备可见、可操作的本地测试状态，不能展示空白初始状态。
- 人工本地测试默认使用 `npm run dev:cloud-api`，并确认 `/api/health` 返回 `success: true` 后再交付页面；不得交付只有前端、后端不可用的测试页。该模式连接生产后端，真实写操作会影响线上数据。
- 自动化 Smoke、视觉测试和需要隔离数据的开发验证继续使用裸 Vite、Mock 或本地后端，不得连接生产后端。
- 本地网页交互、视觉检查与自动化验证只使用 Codex／ChatGPT 内置浏览器；不得启动、连接、控制、复用或检查 Chrome、Edge、Safari 或其他外部浏览器。
- 内置浏览器不可用时必须报告阻塞并等待处理，不得自行降级到外部浏览器。GitHub Actions 等 CI 可以运行项目既有的隔离 Smoke，但 Agent 不得在本机启动独立浏览器来替代内置浏览器。
- 测试优先复用当前任务已创建的内置浏览器标签，避免重复打开；除非用户明确要求保留预览，代理创建的测试标签在任务完成后关闭。
- 默认至少准备：本地账号登录状态、可继续的游戏状态、本地游戏记录与历史记录；并按当前页面补充其依赖的其他测试数据。
- 写入测试状态后必须在实际页面验证已经生效；账号相关页面必须显示“已登录”和测试账号资料，不能仍显示登录表单。页面依赖本地 API 时，同时启动本地测试服务或等效的本地 Mock。
- 自动构造的测试状态只写入本地开发环境或当前浏览器，不修改生产默认数据；人工生产后端预览只有在用户明确要求对应写操作时才可提交线上数据。
- 除非用户明确要求空白或未登录状态，否则不得省略上述测试状态。

## 提交与推送

- 每次提交或推送代码前，必须阅读 `.trellis/spec/smoke-testing.md`，并按其中规则复核本次改动及相关 Smoke。
- 本轮开发、调试或 CI 修复只要发现可避免同类重复错误的新规则，必须在提交或推送前补充到 `.trellis/spec/smoke-testing.md`；不得只修当前用例而不沉淀可复用结论。
- 没有产生新规则时不强制修改规范文件，但仍必须确认当前改动没有违反已有规范。

## 页面视觉验证

- 修改页面布局、样式、主题、字体、可见文案或视觉状态前，必须阅读 `.trellis/spec/visual-validation.md`。
- 页面改动后必须重新验证该页面在 `tests/visual/manifest.json` 中登记的受影响尺寸和主题；确认属于预期设计变化后，才可显式更新基线 PNG 与 manifest 的日期和原因。
- 新增页面、弹窗或可视覆盖层时，必须按 `.trellis/spec/visual-validation.md` 加入全量关键尺寸与双主题矩阵，并同步更新 manifest。
- AI 交付页面改动时必须列出已验证的页面、尺寸、主题和结果；无法生成或更新基线时必须在执行记录中说明，不得以临时截图代替已批准基线。
