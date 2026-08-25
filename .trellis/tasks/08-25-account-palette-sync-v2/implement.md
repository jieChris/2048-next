# 账号私人色板同步 V2 实施计划

## 当前生产状态

- Theme Plaza 公开浏览开启。
- Theme Plaza 写入已于 2026-08-25 安全关闭。
- 自动发布关闭。
- 旧 `/api/me/app-palettes` 仍承担当前账号色板读写；实施切换前不得把它当作目标模型继续扩展。

## 阶段

| 阶段 | 交付 | 完成标准 | 回退点 |
| --- | --- | --- | --- |
| 0 | 安全关闭 | read=true、write=false、auto=false；认证写探针 503 且数据不变 | 恢复环境备份，仅限误操作 |
| 1 | ADR/Spec/tickets | 决策、合同、依赖和门禁完整 | 文档回退 |
| 2 | 数据库扩展 | 新表、约束、容量锁、版本历史和迁移工具 | 新表未接流量，可停用 |
| 3 | 回填与影子对账 | 旧 JSON 无损回填；异常清单；旧/新投影一致 | 清空未接流量的新表后重跑，禁止动旧表 |
| 4 | 新 API | bootstrap、逐套 CRUD、merge、selection、order、compat GET | 新写开关关闭 |
| 5 | 新 Web | 会话首同步、延迟加载、草稿保存、离线队列、单套状态 | Web flag 回旧只读体验 |
| 6 | 生产影子 | 测试账号/影子读写与性能门禁通过 | 关闭 v2 flags |
| 7 | 写维护切换 | 最终 delta、新表权威、旧 PUT fail-closed、新 Web 上线 | 关闭全部色板写，兼容只读 |
| 8 | 分阶段开放 | reaction → save → share；auto publish 继续关闭 | 逐项关闭对应 flag |

## 测试顺序

每个 ticket 必须采用 red-green，先在其公开接口建立失败测试。最低验证：

1. 单元：规范化、diff、merge、身份、重复、状态机。
2. API route：认证、幂等、revision、容量、偏好和错误码。
3. 真实 PostgreSQL：所有并发与事务回滚场景。
4. Web unit：会话首同步、草稿、保存、队列和账号隔离。
5. Browser Smoke：首页负载、设置延迟加载、未保存离开、离线保存、Theme Plaza 单套资格。
6. 视觉：设置页草稿/待上传/重复确认/冲突副本状态。
7. 生产：只读对账、版本锁定、健康检查、无损计数和日志观察。

## 数据门禁

- 迁移前后有效私人色板总数一致。
- 每套稳定 ID、内容、顺序和时间戳可对账。
- 旧 format:2 投影升级结果确定且可重跑。
- 所有异常账号都有原因和修复路径。
- 没有账号超过十套 active 色板。
- Theme Plaza listing/version/vote/reference/report 计数不下降。

## 并发门禁

真实 PostgreSQL 必须覆盖：

- 不同色板并发保存。
- 同色板非重叠合并。
- 同字段相同结果去重。
- 同字段不同结果冲突副本。
- 冲突副本满库。
- 并发第十套。
- 保存与删除竞争。
- 永久删除和旧设备写回。
- base revision 过期。
- operation ID 重试和不同请求哈希冲突。
- 选择/顺序与色板生命周期竞争。

## 性能门禁

- bootstrap 不返回完整色板库。
- 内置/跟随主题选择不返回私人色板内容。
- 设置页骨架先渲染，库在需要时加载。
- 无后台轮询。
- API 失败不阻塞游戏启动。
- 与发布前基线比较 Core Web Vitals 和主线程时间，无未批准显著退化。

## 生产切换清单

1. 新旧数据连续只读对账。
2. 生产备份和恢复演练。
3. 锁定 API/Web commit 和 migration version。
4. 打开色板写维护提示。
5. 执行最终 delta 和校验。
6. 开启 v2 read，验证 bootstrap/library。
7. 开启 v2 write，运行测试账号 Smoke。
8. 关闭 legacy PUT。
9. 部署新 Web 并验证旧标签页 fail-closed。
10. 解除私人色板写维护。
11. 观察错误率、冲突副本、容量拒绝和迁移异常。
12. 分阶段开放 Theme Plaza 能力。

## 回滚

- 不回滚或删除新表和新版本。
- 关闭 v2 write、save、share 和 auto publish。
- 保留 read 与兼容 GET。
- 切回兼容只读 Web/API。
- 旧整库 PUT 永不重新开放。
- 修复通过前向迁移完成。
