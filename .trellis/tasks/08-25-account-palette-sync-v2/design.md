# 账号私人色板同步 V2 设计

## 权威边界

- `2048-game-api`：每套色板权威记录、不可变版本、删除标记、容量、三方合并、选择、顺序、幂等、旧接口投影和 Theme Plaza 资格。
- `2048-next`：设备缓存、登录会话首同步、设置页延迟加载、草稿/保存 UI、离线队列、重复确认和本地待上传展示。
- Theme Plaza：公开版本仍是不依赖私人色板后续变化的不可变快照。

权威决策见：

- `docs/adr/0001-per-palette-authority.md`
- `docs/adr/0002-server-merge-maintenance-cutover.md`
- `CONTEXT.md`

## API 模块建议

- `palette-sync-domain.ts`：稳定 ID、选择引用、规范化、最小编辑单元 diff、三方合并、重复哈希和结果类型。
- `palette-sync-store.ts`：逐套记录、版本历史、删除标记、偏好、容量锁和幂等事务。
- `palette-sync-routes.ts`：bootstrap、library、CRUD、selection、order、兼容 GET 和旧 PUT fail-closed。
- `palette-sync-migration.ts`：旧 JSON 解析、回填、异常报告、影子对账和最终增量迁移。
- `theme-plaza.ts`：分享/保存改为调用逐套权威 store，不直接读写整库 JSON。

## Web 模块建议

- `account-palette-session.ts`：每登录会话一次 bootstrap，缓存选择与必要的当前自定义色板。
- `account-palette-library.ts`：设置页延迟加载、正式顺序、单套状态和 duplicate/pending 区域。
- `account-palette-editor.ts`：草稿、预览、保存按钮和离开保护。
- `account-palette-outbox.ts`：按账号和稳定 ID 折叠的 IndexedDB 队列、operation ID、重试触发和账号隔离。
- `account-palette-merge-view.ts`：只呈现自动生成的冲突副本与原因，不让用户选择覆盖任一版本。
- Theme Plaza client/page：只查询当前 palette ID 的权威状态，不读取整库 dirty/conflict。

## 核心序列

### 登录首同步

```text
restore auth
→ GET bootstrap
→ apply cloud selection
→ if custom: receive and cache one palette
→ drain only account-bound current-selection dependency
→ mark session bootstrap complete
```

### 设置页加载

```text
open settings
→ GET full active library + order + tombstone delta
→ reconcile device cache by stable ID
→ expose pending/duplicate areas
→ retry pending palettes only at this event point
```

### 保存编辑

```text
edit local draft
→ click Save
→ persist final local snapshot + operation ID
→ online PUT(base revision, full document)
   ├─ saved/merged: accept authority
   ├─ conflict_copy: cache returned new palette
   ├─ capacity_full: keep local pending
   └─ transient: queue account-bound operation
```

### 删除

```text
DELETE palette(base revision, operation ID)
→ account lock
→ permanent tombstone
→ remove from order
→ if selected: selection=follow-theme
→ old devices cannot recreate same ID
```

### 三方合并

服务器比较 `base/current/incoming` 的规范化字段路径。字段路径覆盖名称、皮肤、规则族、等级、视觉维度、强度和倍率。V2 只接受以下内容归属：

- 权威视觉字段：名称、皮肤、颜色、文字、边框、发光、强度和倍率；
- 服务端字段：稳定 ID、revision、内容哈希、创建/更新时间和删除状态；
- 设备私有字段：`source`、`locked` 和 UI 状态，上传时剥离；
- 扩展字段：只能位于命名空间化 `extensions` 对象，每个命名空间作为一个原子合并单元；旧未知字段迁入 `extensions.legacy`。

扩展字段不进入视觉重复哈希或 Theme Plaza 快照，除非后续合同明确提升为权威视觉字段。

## 身份和幂等

- 普通/离线创建由客户端使用小写 UUID v4；服务端生成的冲突副本也使用小写 UUID v4。所有 ID 在账号内作为 opaque stable ID 保存，旧迁移 ID 原样保留。
- 稳定 ID 在账号内唯一，永久删除标记继续占用该身份；重复 ID 返回稳定的 ID 冲突码。
- operation ID 在账号内唯一。第一次网络发送后 operation ID 和请求哈希冻结，后续本地编辑创建新 operation。
- 完整 operation 响应保留 400 天；过期重试通过资源 ID、revision、内容哈希和 tombstone 约束继续防重，并要求客户端重新对账。
- 私人重复内容哈希排除稳定 ID、名称、时间戳、设备字段和扩展字段，只覆盖皮肤及全部视觉样式。

## 偏好和变更游标

- 当前选择采用 operation-idempotent last-successful-write-wins，不向用户暴露 revision 冲突。
- 内置选择 ID 作为符合固定语法的 opaque ID 保存；旧客户端无法识别时回退 `follow-theme` 并定向修复云端选择。
- 顺序写入发送完整期望顺序；服务端过滤重复/无效/已删除 ID，并把并发新增但遗漏的 active ID 按创建时间和 ID 追加到末尾。
- palette-account state 维护单调 `change_seq`。library delta 接受 cursor 并返回 changes、nextCursor、hasMore 和 resetRequired。
- cursor 缺失/过期时返回完整 active snapshot 与新水位；客户端同时提交至多十个本地已知 ID，服务端返回其中的 tombstone 状态，避免返回全部历史删除标记。

## 容量锁

创建普通色板、广场副本和冲突副本均使用同一账号级事务锁。固定锁序为：

```text
palette-account state
→ operation row
→ palette identity（按 palette ID 排序）
→ palette revision
→ order
→ selection
→ Theme Plaza reference/version
```

事务步骤：

1. 查询 operation 幂等记录。
2. 检查内容重复和稳定 ID。
3. 统计 active 色板。
4. `count < 10` 才创建权威记录。
5. 写 revision、order 和 operation response 同事务提交。

冲突副本无名额时，服务器返回可识别的 capacity 结果；副本最终内容留在设备待上传区。

## 版本清理

后台清理仅删除同时满足以下条件的历史 revision：

- 不是当前 revision；
- 不属于最近 100 个；
- 早于 180 天；
- 不被正在处理的 operation 或审计引用。

删除标记和 Theme Plaza 快照不由该清理任务删除。

## 兼容与切换

- 扩展期：旧表权威，新表只回填/影子读取。
- 对账期：旧 GET 与新模型投影比较；V2 写 Smoke 只在生产备份恢复出的隔离 PostgreSQL 或已独立切断 legacy PUT 的专用 canary 账号运行。
- 维护期：暂停账号色板远端写，执行最终 delta；打开 V2 read，关闭并验证 legacy PUT fail-closed，部署新 Web 维护/排队模式。
- 切换后：确认旧写不可能成功后开启 V2 write；新表成为唯一权威，旧 GET 从新表投影。
- 回滚：关闭新写能力，保留新数据并使用兼容只读路径。

## 能力开关

建议新增：

```text
ACCOUNT_PALETTE_SYNC_V2_READ_ENABLED
ACCOUNT_PALETTE_SYNC_V2_WRITE_ENABLED
ACCOUNT_PALETTE_LEGACY_PUT_ENABLED
THEME_PLAZA_REACTION_ENABLED
THEME_PLAZA_SAVE_ENABLED
THEME_PLAZA_SHARE_ENABLED
```

现有 `THEME_PLAZA_READ_ENABLED` 和 `THEME_PLAZA_AUTO_PUBLISH_ENABLED` 保留。生产默认 fail-closed，逐阶段开启。
