# 实施计划

1. 后端先补路由测试，覆盖固定模式过滤、正式数据过滤、盘面和派生和同分排序。
2. 实现只读展示接口，并在前端 OpenAPI 契约中声明返回结构。
3. 前端补数据规范化/格式化单元测试与独立页面 Smoke。
4. 新增 direct-page manifest、HTML、入口、页面模块和隔离样式。
5. 使用 Mock API 验证第 1—10 名紧凑列表、前三名标记、当前用户描边、空态、错误态和移动端布局。
6. 运行：
   - 后端目标 Node 测试；
   - 前端目标 Vitest 与 Playwright Smoke；
   - `npm run audit:entry-manifest`；
   - `npm run audit:service-boundary`；
   - `npm run build`；
   - `git diff --check`。

## 数据概览增量计划

1. 在 `2048-game-api/test/node/leaderboard-period.spec.ts` 先扩展固定榜单路由断言，要求返回全局汇总与连续 7 日趋势，并验证所有查询沿用同一正式记录过滤条件。
2. 运行目标后端测试确认红灯；再在 `src/server/app.ts` 的现有固定路由中增加两条只读聚合查询并转为稳定响应结构。
3. 在 `tests/unit/pages-leaderboard-4x4.spec.ts` 先增加概览规范化与百分比测试，在 Smoke Mock 中补齐 `summary`/`trend` 并断言统计卡、7 个数据点和两条参考线。
4. 运行前端目标测试确认红灯；再最小修改 `leaderboard_4x4.html`、`src/pages/leaderboard-4x4-page.ts` 和 `style/leaderboard_4x4.css`，用原生 SVG 完成折线图。
5. 更新 OpenAPI 契约与生成类型，运行后端目标测试/类型检查、前端目标单测/Smoke、OpenAPI 漂移、入口审计、服务边界审计、构建与 `git diff --check`。

## 风险点

- 两个仓库均有用户未提交改动；只追加本功能文件，并在共享 `app.ts`、OpenAPI、manifest、Vite input 中做窄范围补丁。
- `board_sum` 为即时派生；仅查询固定榜单前十，若未来扩大到分页全榜并出现性能问题，再考虑持久化/索引。

## 个人成就进度增量计划

1. 后端先补测试：无令牌仍只执行原三项榜单查询；有效令牌返回完成度最高的未完成 `nth_max_tile_reached` 成就；全部完成返回完成状态。
2. 在现有成就模块增加一个只读进度选择函数，复用成就定义和正式 ranked 记录过滤，不新增表、迁移或接口。
3. 前端先补规范化单测和登录/未登录 Smoke，再让现有固定榜单请求携带已有令牌并渲染个人进度；个人字段缺失时保持全局 32768 回退。
4. 更新 OpenAPI/生成类型，运行前后端目标测试、前端 Smoke、契约检查、构建和 `git diff --check`。
