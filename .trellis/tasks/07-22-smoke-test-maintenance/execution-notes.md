# 执行记录

## Route Deviation

- 仓库没有 `.trellis/scripts/get_context.py` 和 `.trellis/spec/guides/index.md`；按现有根级 spec 结构读取 `.trellis/spec/index.md`，并直接新增测试规范后继续。

## 根因

- 主题与排行榜视觉用例依赖旧的经典默认配色，未显式选择主题和“跟随主题”色板。
- 设置页已改为计时器/外观分类互斥显示，夜间页面用例仍从无锚点 URL 查找被隐藏的色板侧栏。
- 文字按钮已采用 `42px / 7px` 的珐琅样式，旧断言仍使用图标按钮的 `50px / 12px`。
- 排位撤回用例禁用了在线自动加载，却依赖其轮询阶段绑定即时提交钩子。
- 认证恢复后刷新可能同时触发旧页面生命周期冲刷与新页面启动重试；接口由 `client_record_id` 提供幂等，测试不应要求严格一次网络请求。
- 仓库级 `AGENTS.md` 新增提交/推送门禁：每次发布前阅读冒烟规范，并在发现可复用经验时先更新规范。

## 验证

- 6 个原失败目标用例：全部通过。
- 2 个 CI 时序用例使用 `--repeat-each=5`：10/10 通过。
- `npm run test:smoke:index-ui`：4/4 通过。
- `npm run test:smoke:pages`：216/216 通过。
- `npm run verify:release`：审计、单元测试、关键 Smoke、生产构建和发布就绪检查全部通过。
- `git diff --check`：通过。
