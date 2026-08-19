# 执行记录

## Route Deviation

- 仓库缺少 `.trellis/scripts/get_context.py` 和 `.trellis/spec/guides/index.md`；沿用仓库既有保守路径，直接读取 `.trellis/spec/index.md`、视觉规范、冒烟规范和既有排行榜任务文档。

## 根因

- 已确认：名称方块继承全局 `.timertile { line-height: 1; }`，同时自身与昵称子元素均使用 `overflow: hidden`，导致字体下伸部超出紧贴字号的行盒后被裁切。
- 修复只在 `.timer-leaderboard-name-tile` 设置 `line-height: 1.2`；不改变全局计时方块、42px 固定高度、Flex 居中或省略规则。

## 验证

- RED：目标单测因名称方块缺少 `line-height: 1.2` 按预期失败，1 failed / 1 passed。
- GREEN：排行榜样式和计时框 CSS 目标单测通过，6 passed / 0 failed。
- `git diff --check` 通过。
- 4184 预览已改为 `npm run dev:cloud-api -- --host 127.0.0.1 --port 4184`；`/api/health` 返回 200，排行榜成功载入真实数据。
- 内置浏览器视觉确认通过：`p56`、`qianmi`、`imaginary`、`Jay` 等含下伸字母的昵称均完整显示；名称行盒为 `19.2px`，动态缩小到 14px 字号时为 `16.8px`，仍在 42px 方块内上下居中。
- 本地浏览器曾命中旧 CSS 缓存；仅在该测试标签临时禁用缓存并刷新完成验证，未改用外部浏览器或独立 Playwright，未触发任何游戏或线上写操作。
