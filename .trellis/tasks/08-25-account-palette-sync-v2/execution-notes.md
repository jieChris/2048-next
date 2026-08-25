# 账号私人色板同步 V2 执行记录

## 已确认的领域决策

- 每账号最多十套私人自定义色板，内置色板不计入。
- 每套色板以稳定 ID 和独立权威记录同步。
- 当前选择、正式顺序和色板内容分别演进。
- 登录会话只读取一次当前选择和必要的一套自定义色板；完整库在设置页延迟加载。
- 编辑使用草稿和明确保存按钮；离线保存进入原账号队列；不后台轮询。
- 服务端保存不可变版本并执行三方合并；无法合并时创建冲突副本。
- 永久删除标记不占十套名额，旧设备不能复活原 ID。
- 旧整库 GET 只读兼容，旧 PUT 在切换后 fail-closed。
- 采用短暂色板写维护完成切换，不长期双写。

## 生产安全动作

2026-08-25T17:30:23Z 已设置：

```text
APP_PALETTE_FORMAT3_ENABLED=true
THEME_PLAZA_READ_ENABLED=true
THEME_PLAZA_WRITE_ENABLED=false
THEME_PLAZA_AUTO_PUBLISH_ENABLED=false
```

验证：

- API commit：`a21cbb86f78669a8431b47c78684c90cb4aa2fb9`
- API 容器：healthy
- 公开 capabilities：read=true、write=false、auto=false
- 认证分享探针：`503 THEME_PLAZA_WRITE_DISABLED`
- 探针前后 listing/version 计数不变
- 环境备份：`.env.self-hosted.before-theme-plaza-write-shutdown-20260825T173023Z`

## Route Deviation

原 Theme Plaza 方案把临时 Web 整库 repository 当作成熟账号色板同步基础，并采用八套限制和整库 revision。用户澄清目标产品为十套逐套同步、跨设备当前选择和设置页延迟加载，因此暂停 Theme Plaza 写入并重新设计底层权威模型。

## 尚未执行

- 未创建数据库迁移。
- 未实现新 API 或新 Web 同步。
- 未执行色板写维护切换。
- 未重新开放 Theme Plaza 写能力。
