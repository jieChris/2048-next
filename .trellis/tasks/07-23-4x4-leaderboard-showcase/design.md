# 技术设计

## 页面边界

- `leaderboard_4x4.html`：独立测试页，不修改 `account.html`。
- `src/entries/leaderboard-4x4.ts`：接入现有 direct-page bootstrap。
- `src/pages/leaderboard-4x4-page.ts`：请求、规范化和渲染页面状态。
- `style/leaderboard_4x4.css`：只作用于 `body[data-page="leaderboard-4x4"]`。

## API 边界

- 新增 `GET /api/leaderboard/standard-4x4-no-undo`。
- 查询固定使用 `leaderboard_best`、对应 `records` 与 `users_shadow`，只读取：
  - `mode_key = 'standard_4x4_pow2_no_undo'`
  - `mode_bucket = 'standard_no_undo'`
  - `records.status = 'verified'`
  - `records.deleted_at IS NULL`
  - `records.record_era = 'official_v1'`
  - 具备排位会话或后台授权来源的正式记录。
- `board_sum` 从最佳记录的 `final_board` 即时派生；榜单仅返回 10 行，当前规模下不增加列或迁移。
- SQL 在后端完成权威排序并返回 1—10 的 `rank`。
- 现有 `/api/leaderboard` 不改查询、字段或排序。

## 返回契约

```json
{
  "success": true,
  "mode_key": "standard_4x4_pow2_no_undo",
  "summary": {
    "total_records": 1284,
    "total_players": 96,
    "reached_16384": 83,
    "reached_32768": 12
  },
  "trend": [
    { "date": "2026-07-17", "best_score": 68240 },
    { "date": "2026-07-18", "best_score": 73110 }
  ],
  "data": [
    {
      "rank": 1,
      "user_id": 42,
      "nickname": "测试玩家",
      "score": 123456,
      "max_tile": 8192,
      "board_sum": 32764,
      "duration_ms": 1234567,
      "game_date": "2026-07-23T00:00:00.000Z",
      "uploaded_at": "2026-07-23T00:05:00.000Z"
    }
  ]
}
```

## 视觉方向

- 方向：同时覆盖 Trophy 原版的浅色仪表板与 2048 Next 的青黑专业版。默认跟随站内日间状态显示浅灰页面、白色面板、深色排版和少量青色/金色点缀；`html[data-night-background="1"]` 下切换为深青黑背景、深青面板、低对比青色描边与白色排版。
- 两套外观共享布局和语义变量，不新增排行榜专属主题开关；金银铜排名、当前用户高亮、趋势线、按钮和进度条按明暗状态使用各自可读的表面色。
- 页面主体不保留左侧品牌化大标题信息面；桌面端使用“570px 数据概览/排行榜 + 260px 补充栏”的双列组合并整体居中，900px 以下改为纵向排列。
- 第 1—10 名全部使用紧凑行，不使用大尺寸领奖台；前三名用小皇冠/名次色区分，当前用户在浅色版用深色描边、夜间版用亮色描边。
- 玩家头像槽位保持圆形；无头像时使用昵称首字和深灰/金色本地占位。
- 分数最突出，最大方块、盘面和与用时作为昵称下方的紧凑副信息。
- 原来的模式/规则/上榜人数三卡替换为参考图式概览：左侧四张统计卡，右侧原生 SVG 最近 7 天最高分折线图；图中榜首和第 10 名分数仅作为当前榜单参考线。
- 右侧补充栏不复制不存在的 XP、任务和签到系统，只展示现有成就里程碑、当前榜单前三名、成就墙入口，以及由汇总数据计算的 32768 达成率。
- 底部进度卡不新建成就模型：后端复用活跃的 `nth_max_tile_reached` 规则和正式 ranked 记录计数，排除已达到目标的规则，再按 `current / target` 降序、既有 `sort_order` 升序选出一项。有效登录令牌下返回 `achievement_focus`；全部完成返回 `completed_all: true`；未登录或个人进度计算失败时前端回退到 32768 全局达成率。
- 动效仅使用 CSS 入场和 hover，并尊重 `prefers-reduced-motion`。

## 概览数据边界

- 概览与榜单使用完全相同的模式、正式时代、验证状态、删除状态和来源过滤条件。
- 后端负责聚合总对局、玩家数、达成次数和每日最高分；前端只负责格式化、计算展示百分比和绘图，不推导权威排名。
- 最近 7 天以 `Asia/Shanghai` 自然日为准，通过日期序列补齐空白日并返回 `best_score = 0`。
- 不新增表、迁移、缓存或图表依赖；只有该公开测试页读取这些数据。

## 兼容与回滚

- 新页面没有正式导航入口，删除新增页面、入口、样式和接口即可完整回滚。
- 不修改数据库结构，无迁移与数据回填。
- API 是新增只读路由，不改变现有消费者。
- 固定榜单路由保持公开；Authorization 仅用于可选的个人成就进度，不影响榜单主体成功返回。
