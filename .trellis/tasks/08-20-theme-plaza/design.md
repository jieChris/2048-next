# 主题广场设计

## 范围决定

- 本轮实现 `2048-game-api` 与 `2048-next`。
- Android 仓库处于非 `main` 且有既有未提交 CI 改动，本轮不修改。
- API 默认 `APP_PALETTE_FORMAT3_ENABLED=false`、`THEME_PLAZA_READ_ENABLED=false`、`THEME_PLAZA_WRITE_ENABLED=false`、`THEME_PLAZA_AUTO_PUBLISH_ENABLED=false`。
- 代码覆盖完整浏览与写入/审核路径，但生产写开关在 Android format:3 完成前不得开启。

## 模块

### API

- `app-palettes.ts`：格式 2/3 协商、校验、投影、旧端合并、公开快照。
- `theme-plaza-domain.ts`：标题规则、规范化哈希、复制命名、投票/举报/幂等输入。
- `theme-plaza.ts`：公开读取、作者槽位、分享/取消/撤下、保存、评价、举报、管理审核路由。
- `theme-plaza-moderation.ts`：DeepSeek 严格 JSON 审核、租约、一次重试、人工兜底与可选自动发布。
- `0039_theme_plaza.sql`：作品槽位、不可变版本、事实表、保存幂等、审核 outbox/attempt。

### Web

- `account-palette-repository.ts`：owner/revision/dirty/conflict/CAS/format 3/未知字段。
- `theme-plaza-client.ts`：所有公开及写操作 HTTP 合同。
- `palette-preview.ts`：公开页与后台共用的结构化真实方块预览。
- `theme_plaza.html` + page/entry/CSS：列表、详情、我的分享和安全维护状态。
- 现有色板中心：入口、账号同步及按 capability 启用的分享按钮。
- 现有后台：单版本审核、重试、隐藏与恢复；不提供批量隐藏。

## 数据不变量

- 每账号一个 listing；最多一个公开版本和一个候选。
- 发布内容不可原地更新。
- 保存副本、revision 和引用事实同事务。
- 投票、引用和举报由唯一键去重。
- AI 失败不公开；自动发布还需独立开关。
