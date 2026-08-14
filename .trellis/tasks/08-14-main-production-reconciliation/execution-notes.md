# Main 与生产分支收敛：执行记录

## 目标

- 以已部署提交 `796e4d9b` 为生产事实基线。
- 将生产代码受控收敛回默认分支 `main`，不在整理期间触发部署。
- 区分已合并残留分支、生产祖先分支和仍含独立工作的分支，禁止批量误删。

## 已完成

- 已创建并推送不可变生产标签 `production-2026-08-14-796e4d9`。
- 已创建并推送旧 `main` 归档标签 `archive-main-before-production-reconcile-2026-08-14-3087dc37`。
- 已确认 `main` 与生产分支分别有 37 和 26 个独有提交。
- 已确认仓库未开启合并后自动删除分支，且 `main` 当前没有分支保护。
- 已在隔离分支 `reconcile/main-production-20260814` 创建 history-only merge `04eefc28`，父提交分别为生产基线 `796e4d9b` 和旧 `main` `3087dc37`。
- 已验证该 merge 的文件树与生产基线完全一致（`git diff --quiet 796e4d9b 04eefc28` 返回 0），未把旧 `main` 的文件覆盖到生产树。

## 分支处置清单

- PR 已合并、可在生产代码进入 `main` 后删除：`agent/sustainable-undo-spawn-20260810`、`release/pending-web-updates-20260803`、`codex/baidu-site-verification-20260803`、`codex/search-discovery-seo-20260803`。
- 生产谱系分支，须在生产代码进入 `main` 后删除：`agent/404-lost-page-achievement`、`codex/admin-console-rebuild-20260802`、`fix/replay-timing-integrity-prod-20260812`。
- 删除前需先归档：`fix/third-party-import-413-20260806`（合并后又增加执行记录）、`hotfix/admin-cache-health-probe`（关闭但未合并的诊断提交）。
- 保留并等待单独决策：`agent/android-app-foundation`（关闭但未合并，含 72 个独立提交）。

## 发布边界

- 整合分支只推送并创建 PR，不自动合并；推送 `main` 会触发生产部署。
- PR 必须使用 merge commit，不能 squash，否则会再次丢失已连接的历史关系。
- 在 PR 合入且生产验证完成前，不删除上述任何远端分支。

## Route Deviation

- 在隔离工作树从生产提交直接合并 `origin/main` 时出现 64 个冲突文件，其中 15 个 Trellis 文档、30 个测试文件，并包含 7 个二进制视觉基线。根因是多批功能在 `main` 以 squash PR 落地、在生产谱系保留原始提交，Git 三方合并无法识别语义等价。采用最保守回退：立即中止该合并，不批量选择 ours/theirs；改为先审计提交与最终树的语义差异，再建立保留生产树且连接双方历史的整合提交，并只补入确认缺失的 `main` 语义。
- PR #223 的 `Smoke (pages)` 在当前生产基线上出现 12 个既有页面断言失败（208 个通过），而其他四项检查通过。已再次验证 history-only merge 未改变生产代码树，失败属于此前未经该 PR 工作流覆盖的测试契约漂移。为避免在分支整理中夹带游戏逻辑或批量改写测试，保守处理为：不修改运行时代码，以生产标签和旧 `main` 标签作为双重回滚点，使用 merge commit 完成历史收敛；测试漂移另行处理。
