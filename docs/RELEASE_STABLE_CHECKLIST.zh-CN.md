# 稳定发布检查清单

## 发布前门禁

- `CORE_PERFORMANCE_BASELINE_REF=<实际基线提交> npm run verify:refactor:ci`（实际基线必须是与候选提交不同的真实 base commit，不得使用候选 HEAD）
- `npm run verify:release-ready`
- `CORE_PERFORMANCE_BASELINE_REF=<实际基线提交> npm run verify:release`（同样不得使用候选 HEAD；本地 `verify:prepush` 也必须提供这个实际基线环境变量）
- `npm run audit:quality:report`（CI 的 `refactor-gate` 通过 `verify:refactor:ci` 完成候选构建并上传专用 `deterministic-dist` artifact；quality job 和手动生产发布的 package job 必须依赖该 job、下载同一份 `dist`，不得再次执行 `verify:release` 或构建。结构预算与 core-load 预算共享同一个实际 baseline ref：PR 使用 base SHA；普通 push 使用 `event.before`，对象缺失时只尝试精确 fetch 该 SHA，失败即关闭门禁；zero-before push、`workflow_call` 与手动部署调用仅使用候选提交第一父提交；候选为 root commit 时失败，baseline 不得等于候选 `HEAD`）
- `npm run audit:core-load-budget`（只读扫描当前新鲜 `dist/`；从 `2048.html`、`play.html`、`replay.html` 自动发现 hashed module entry；static import 计入启动闭包，dynamic import 单列为 deferred，导航 `href` 不计入下载；CSS `@import`/`url()` 递归计入字体、图片等关键资源；query 保留为请求身份、fragment 去除；Brotli 优先且全部可压缩资源必须有 gzip fallback，旁车必须可解压且与 raw 完全一致；`dist.backup-*` 永不扫描）
- `CORE_PERFORMANCE_BASELINE_REF=<实际基线提交> npm run test:performance:core`（只使用现有 `dist/`，脚本自行启动并回收独占 `vite preview` 和无头 Chromium；固定 1365×768、4× CPU、80ms/1.6MBps/0.75MBps、中文/上海时区/浅色/减少动态效果，每场景固定 5 次并以 median/nearest-rank p75 判定。执行档案不可由 CLI/env 选择：普通本地运行固定为 `reference`，官方 GitHub Actions 仅在 `GITHUB_ACTIONS=true` 且 runner/process 同时为 Linux/X64 时自动使用 `github-actions-linux-x64`；未知 GitHub runner fail-closed。两个档案共享同一 fixture、5×5 样本、proof/error 规则和 immutable hard cap；`reference` 对全部指标执行 relative baseline ratchet，标准 GitHub runner 因跨 VM 的 CPU 计时不可复现，对时间/交互/CLS 执行 immutable absolute hard cap，对 request/transfer/decoded bytes 继续执行 relative resource ratchet。该 execution policy 由 schema v3 固定，入库后不得修改。失败先看 `artifacts/core-performance/latest.json`；校准仅用 `--measure-only --evidence=<指定文件>`，不会自动改预算配置。）

## 历史页面基础回归

- [ ] 历史记录列表可正常加载
- [ ] 模式、关键字、排序筛选正常
- [ ] 分页上一页、下一页正常
- [ ] 导出全部正常
- [ ] 导入合并、导入替换正常
- [ ] 单条记录的回放、导出、删除正常

## 回放与模式回归

- [ ] 回放页只接受当前格式（如 `v4`、`v9`）
- [ ] 旧回放格式会提示仅支持当前回放格式
- [ ] `practice` 模式入口、存档、历史记录可用

## 发布与部署

- [ ] 合并 PR 后，目标分支为最新 `main`
- [ ] 已执行构建并生成 `dist/`
- [ ] 自托管部署发布的是 `dist/`，不是仓库源码
- [ ] 线上 `index / play / replay / history / Practice_board` 首屏可访问
