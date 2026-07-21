# 执行记录

## Route Deviation

- 仓库存在 `.trellis/spec` 与 `.trellis/tasks`，但缺少技能约定的 `.trellis/scripts/get_context.py` 和 `.trellis/spec/guides/index.md`。采用最保守回退：手工创建本任务目录，完整读取现有 `.trellis/spec/index.md`、`frontend-api-boundary.md` 与 `cross-repo-architecture.md`，并将改动限制在前端拥有的本地历史数据链路。
- 云端用户历史排序扩展需要跨到相邻 `2048-game-api`，其 Trellis 同样缺少 `get_context.py` 与 shared guides。采用同一回退：读取该仓库 `AGENTS.md`、`backend-ownership.md`、`api-contracts-and-persistence.md`，仅修改权威 Node 路由与对应测试，不向前端添加后端逻辑。

## 调查记录

- 本地历史由 `LocalHistoryStore` 同步兼容层立即写入 localStorage，并异步镜像到 IndexedDB；历史页当前优先调用同步兼容方法，因此两条存储路径都必须支持 `board_sum`。
- `board_sum` 以终局盘面为准：盘面存在单元格时重新计算全部正数方块之和，避免导入记录携带错误派生值；没有盘面时才保留合法的已有 `board_sum`。
- IndexedDB 版本从 1 升到 2，新增 `board_sum` 索引并在升级事务中规范化旧记录；localStorage 旧记录在首次列表读取时补算并回写。
- 新记录在游戏结束自动保存载荷中直接写入 `board_sum`，存储规范化层仍会再次校验，确保生成端与持久化端一致。
- 历史页将“盘面和”放在“分数”右侧，并在既有排序框中加入按盘面和降序；关键词搜索也包含该值。
- 旧记录回填最初复用了完整记录规范化，但 legacy fallback 会丢弃已有归属字段，导致读取时被当前登录账号覆盖。现已让 fallback 保留原始归属和诊断字段，回填盘面和不会改变游客/Alice/Bob 等历史归属。
- 初始需求只涉及前端拥有的本地历史记录，当时未扩展在线账号记录或 `2048-game-api` 契约。
- 后续需求明确要求用户主页云端历史支持盘面和排序，因此扩展了权威 API：盘面和由 PostgreSQL 查询从 `final_board` 派生，并在 `LIMIT/OFFSET` 前排序，避免仅对当前页假排序；暂不新增存储列或索引，只有出现可测性能瓶颈时再升级。
- 用户主页排序改为两个原生下拉框：字段为上传时间/分数/盘面和，顺序为倒序/正序；默认仍为上传时间倒序。
- 后续检查发现用户主页只接入了盘面和排序，记录行漏掉了盘面和展示；现已在分数右侧补列，直接使用会从 `final_board` 重算的规范化 `board_sum`，与最大方块分开显示。
- 用户主页六列展示后，“用时”与“上传时间”仅有 8px 间距；桌面端为上传时间增加 12px 左内边距，使视觉间距达到 20px，移动端换行布局不变。
- 视觉复查发现单独加内边距没有解决根因：模式列仍为其他数值列约 3 倍宽，且桌面列采用左/右混合对齐。现改为前五列等比例、上传时间略宽，六列桌面端统一居中；移动端仍按内容类型分行对齐。
- 最终列权重按反馈调整为模式列 1.35 份、其余五列各 1 份；上传时间标题和内容继续同轴居中。
- 模式列作为文本主列最终恢复左对齐，标题增加 10px 左内边距以与记录行内容起点一致；其余五列保持居中。
- 上传时间作为最右列改为右对齐，标题增加 10px 右内边距以与记录行右边缘一致；中间四列保持居中。

## 验证记录

- 专项单测：6 个文件、92 项通过；收尾修正后的相关单测：5 个文件、87 项通过。
- `npm run test:smoke:history`：5 项全部通过，覆盖旧记录补算、展示、排序、关键词、导出，以及原有导出/清空、模式和归属筛选。
- `npm run audit:game-manager`：通过；盘面和计算提取为独立小函数后符合 runtime helper 热点上限。
- `npm run audit:service-boundary`：通过，453 个文件、0 项边界违规。
- `npx tsc --noEmit`、4 个 legacy runtime `node --check`、`git diff --check`：通过。
- `npm run build`：通过；仅保留仓库已有的 `ui-preview.html` 非 module script 构建提示。
- `npm run test:unit`：1826/1827 通过；唯一失败为 `tests/unit/wide-logo-asset.spec.ts` 仍要求 `history.html` 包含大 Logo，而用户此前已将历史页标题替换为无文字返回按钮，与本任务无文件逻辑交集，未回退该既有页面改动。
- 用户主页完整 Smoke：14 项全部通过，覆盖双下拉框尺寸、移动端无横向溢出和 `sort_by=board_sum&order=asc` 请求。
- `2048-game-api` Node 测试：21 个文件、143 项全部通过；新增覆盖派生 `board_sum`、正序 SQL 和响应排序元数据。
- 前端 `npm run build`、`npm run api:types:check`、`npm run audit:service-boundary`、后端 `npx tsc --noEmit`、两仓 `git diff --check`：通过。
- 用户主页盘面和展示修正后，完整用户主页 Smoke 14 项通过，`npm run build` 通过；浏览器实测首条记录同时显示盘面和 4096 与最大方块 2048。
- 用时/上传时间间距修正后，专项 Smoke 1 项与 `npm run build` 通过；1108px 预览实测无横向溢出。
- 列分配与对齐修正后，用户主页完整 Smoke 14 项与 `npm run build` 通过；1108px 实测前五列均约 154px、上传时间约 215px，横向溢出为 0。
- 最终权重调整专项 Smoke 与 `npm run build` 通过；1108px 实测模式列约 209px，其余五列均约 155px，横向溢出为 0。
- 模式列左对齐修正专项 Smoke 与 `npm run build` 通过；浏览器实测标题、内容均为左对齐且横向溢出为 0。
- 上传时间右对齐修正专项 Smoke 与 `npm run build` 通过；浏览器实测标题、内容均为右对齐且横向溢出为 0。
