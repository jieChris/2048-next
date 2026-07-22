# 执行记录

## Route Deviation

- 仓库缺少 `.trellis/scripts/task.py` 与 `get_context.py`，无法使用 Trellis 脚本创建任务或发现分层规范；沿用仓库现有任务目录格式手工创建，并直接读取 `.trellis/spec/index.md` 与 Smoke 规范。
- 仓库要求 Trellis 优先，因此本轮设计更新写入现有 Trellis 任务文档，不采用 `brainstorming` 技能默认的 `docs/superpowers` 路径。

## 既有版本验证记录

- 每次同值合并后，从 8 个固定落点中选择距离现有方块最远的位置，生成一个与合并结果同值的新伙伴；合并前后均保持 10 个方块，下一次合并始终可继续。
- `npx vitest run tests/unit/not-found-playground-page.spec.ts`：5 项通过，覆盖初始配对、边界限制、重叠计算、合并规则与同值伙伴生成。
- `npm run test:unit`：296 个测试文件、1849 项测试全部通过。
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-not-found-playground.smoke.spec.ts`：2 项通过，覆盖连续两次合并、每次保持 10 个方块、生成下一对、重新散落、键盘移动与移动端无横向溢出。
- `npm run build`：通过，生产产物包含新的 `dist/404.html` 与独立互动资源。
- `git diff --check`（本任务及废弃迷宫任务文件）：通过；运行时与测试目录中不再引用迷宫页面。
- 应用内浏览器连续实测合成至 `16384`：页面始终保持 10 个方块，并持续存在与合并结果同值的下一对，验证无限玩法可继续。
- 桌面视觉核验后将三行断裂标题收紧为“页面不见了 / 方块还在”两行；互动区域、首页入口与重置按钮均保持可见。
- 移除介绍区的“拖动 / 方向键 / 无输赢”提示和游戏框下方状态算式，并同步删除对应 CSS、运行时写入与旧 Smoke 断言；目标 Smoke 2 项及生产构建通过。

## 64 封顶版本验证记录

- 掉落值按 `2→4→8→16→32→64` 循环且永不超过 64；盘面失去配对时优先匹配已有小数字，极端情况下补入两个 `2`。
- 方块总数保持在 10–12 个；超过 12 个时仅回收最早、无配对且大于 64 的方块。
- 新方块使用无碰撞候选落点；候选耗尽时重新排开现有方块，不生成重叠方块。
- `npx vitest run tests/unit/not-found-playground-page.spec.ts`：7 项通过，覆盖掉落上限、持续配对、12 个上限回收和无重叠位置。
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-not-found-playground.smoke.spec.ts`：2 项通过，覆盖连续合并、小数字掉落、真实渲染边界不相交、重置、键盘移动与移动端宽度。
- `npm run test:unit`：296 个测试文件、1851 项测试全部通过。
- `npm run build`：通过。

## 随机版本验证记录

- 初始棋盘每次随机生成 5 组配对数字和连续随机位置；重新散落会生成新的数字与布局。
- 正常掉落从 `2、4、8、16、32、64` 随机选择，失去配对时随机补入可配对的小数字；位置采用连续随机坐标并执行碰撞过滤。
- 重复 Smoke 暴露随机连续坐标可能产生碎片化空隙，导致第 10 个方块无处放置；修复为整盘最多重抽 8 次，仍失败才使用打乱后的 4×4 安全网格。
- 浏览器默认复用仓库现有 `randomUnitFloat`，通过生产代码禁止 `Math.random` 的质量门禁；纯逻辑仍支持注入固定随机序列。
- `npx vitest run tests/unit/not-found-playground-page.spec.ts`：7 项通过，并额外遍历 100 组可复现随机种子。
- 目标 Smoke 连续 3 轮共 6 项通过；常规目标 Smoke 2 项通过。
- `npm run test:unit`：297 个测试文件、1854 项测试全部通过。
- `npm run build`：通过。

## 隐藏成就版本验证记录

- 已登录用户访问 404 页面时提交 `lost_page_visited`；未登录、重复授予或请求失败均不影响页面互动。
- 首次授予时复用现有解锁提示，并以“隐藏成就”文案和专属迷路路径图标展示“你也曾迷路”。
- 相关单测 4 个文件、20 项全部通过；目标 Smoke 3 项通过，覆盖成就事件上报、连续合并、重置、键盘移动和移动端宽度。
- `npm run build`：通过，生产产物包含 `dist/404.html`、方块运行时、成就服务与解锁提示资源。
