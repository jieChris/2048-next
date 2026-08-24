# 公开玩家个人主页技术设计

> 本文从属于 `prd-v3-corrected.md` v3.1。发生冲突时以 PRD 为准；P0、P1、P2 必须独立实现和验收。

## 仓库与身份边界

- `2048-game-api` 是账号、游戏 ID 桥接、资料、审核、背景目录和媒体文件的唯一权威；新服务器逻辑只放 `src/server/*` 与 PostgreSQL 迁移。
- `2048-next` 只负责页面、输入状态、API 调用与降级展示；不保存第二份服务器状态，不修改 `2048-ranked`。
- 公开主页继续以 `users_shadow.user_id`（游戏 ID）寻址；认证 token 的账号 ID 必须先解析为 `{ accountUserId, gameUserId }`，禁止同号回退。

## P0：公开主页与简介审核（已实现）

- `profile_current` / `profile_revisions` 以游戏 ID 为键；简介上限 150 Unicode code points。
- 简介写入只创建不可变修订和 `moderation_*` 任务；审核通过前保留旧公开简介，空简介可安全清除。
- DeepSeek 文本模型固定为 `deepseek-v4-flash`；密钥只在后端加密托管，管理员只能配置、轮换、停用和发起合成内容连接测试。
- 本人审核历史只返回状态、时间和安全原因码，不返回待审原文；管理员专用列表才可读取待审文本。
- 页面默认是普通访客视图；只有本人从菜单进入编辑模式后显示编辑区。

## P1：完整昼夜三层背景目录

### 数据与状态

- `bg_variants`：一个 `day|night` 变体及其 `sky|city|foreground` 三层元数据、对象 key、SHA-256、尺寸、MIME、Alpha 统计和状态。
- `bg_scenes`：`scene_family_id + day_variant_id + night_variant_id + status + revision`；只有同场景族、同尺寸且两个变体均校验通过才能发布。
- `bg_default`：单例默认场景指针。发布、归档和默认切换均在事务中完成并写管理员审计。
- 生命周期为 `draft -> validated -> paired -> published -> archived`；文件与 URL 不可变，更新必须创建新修订。

### 文件与校验

- 使用独立 `PROFILE_BACKGROUND_STORAGE_ROOT`，默认与回放目录分离；对象 key 由 SHA-256 和层名组成，服务端必须校验路径仍位于根目录内。
- 上传 `multipart/form-data`，一次提交恰好包含 `sky`、`city`、`foreground` 三张。首版统一接受真实 PNG；该限制与透明层契约一致，后续若开放 WebP/JPEG 必须新增版本化能力声明。
- 运行时依赖 `sharp` 做真实解码；统一要求 2172×272、限制单文件与总像素。天空必须完全不透明，城市/前景必须同时含透明与非透明像素；拒绝动画、伪 MIME、整片半透明底、明显棋盘格和空层。
- 三张全部完成内存校验后才写不可变对象；数据库失败只会留下无引用对象，由对账任务回收，数据库永不指向缺失文件。

### API 与读取

- 管理员端点沿用 PRD §6.2：上传/列出变体，创建/列出场景，发布、归档和切换默认。
- `GET /api/profile-backgrounds` 只返回已发布完整场景和白天预览；用户保存的只有 `background_scene_id`。
- `GET /api/profile-backgrounds/:id/layers?variant=day|night` 返回同一场景同一修订的三条不可变资源 URL。场景缺失、归档或资源失败时返回/使用默认场景。
- 资源响应使用不可变缓存头；数据库与 API 不返回绝对文件路径。

### 前端

- 管理控制台新增“主页背景”：上传多套变体、配对场景、发布/归档、指定完整昼夜场景。
- 用户编辑器只展示完整已发布场景的白天预览，并明确夜间由显示模式自动选择；不单独展示或选择夜间版本。
- `user.html` 根据 `auto|day|night` 请求相应变体，把三层 URL 写入现有 sky/city/foreground 容器；不改横幅高度和资料层位置。

## P2：头像与视觉审核

- 在 P0 审核平台上扩展 `avatar` 内容类型和 `deepseek-v4-flash-vision-exp` 路由；AI 通过后仍必须人工批准，不能审核自己的头像。
- 原图 ≤200 KiB，仅 JPEG/PNG/WebP；真实解码 128–2048px、≤4MP，纠正方向、居中裁剪 256×256、去元数据并重编码 WebP。
- 待审与公开对象目录分离；先复制不可变公开对象，再事务更新 `avatar_objects`、`profile_current.avatar_revision_id` 和审计，最后异步清理待审文件。
- 头像滚动 7 天最多一次；失败始终保留旧公开头像。批准后只更新 `profile_current.avatar_revision_id → avatar_objects`，不回填 `users.avatar_url`；旧列仅作兼容读取回退。

## 失败与验证边界

- 任一 API/文件/审核步骤失败都不得覆盖当前公开简介、头像或背景；归档背景安全回退默认场景。
- OpenAPI 只覆盖本任务端点并生成前端类型；每期分别跑迁移、目标测试、两仓 typecheck、前端 build、服务边界、`git diff --check` 和只读对抗审查。
- 页面交互与视觉只用内置浏览器连接真实本地 API；覆盖中英文、浅色/夜间及 320×568、390×844、768×1024、1280×720，禁止横向溢出。
