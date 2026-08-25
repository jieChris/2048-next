# 账号私人色板同步 V2 Tickets

Canonical spec：`../prd.md`
Architecture：`../design.md`
Rollout：`../implement.md`

| Ticket | 主题 | 仓库 | Blocked by |
| --- | --- | --- | --- |
| T01 | 冻结 V2 OpenAPI、状态机与能力开关 | Web + API | — |
| T02 | 建立逐套权威数据模型与迁移骨架 | API | T01 |
| T03 | 回填旧整库数据并实现影子对账 | API | T02 |
| T04 | 实现逐套读取、bootstrap、选择和顺序 | API | T02 |
| T05 | 实现保存、版本历史、三方合并和删除 | API | T02, T04 |
| T06 | 实现容量、幂等、重复和冲突副本事务 | API | T05 |
| T07 | 实现 Web 登录会话首同步和设置页延迟加载 | Web | T01, T04 |
| T08 | 实现编辑草稿、保存按钮、离线队列和离开保护 | Web | T07, T05 |
| T09 | 接入单套分享资格和 Theme Plaza 细粒度能力 | Web + API | T06, T08 |
| T10 | 建立生产影子验证与维护切换工具 | Web + API | T03, T06, T08, T09 |
| T11 | 执行生产切换并分阶段重新开放 | Web + API | T10 |

执行规则：

- 每个 ticket 是独立可验收 tracer bullet；阻塞项未完成不得启动。
- 所有实现采用 TDD，并在提交前做 Standards + Spec 双轴 review。
- 一次只允许一个 writer 修改同一仓库工作目录。
- push、部署和生产开关操作继续要求明确授权。
