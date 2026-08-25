# 主题广场实施记录

## 已实现

- 账号色板 format:3 协商，默认旧端 format:2 投影。
- Web 账号色板 repository、CAS 冲突和 8 套限制。
- PostgreSQL expand-only Theme Plaza 数据模型。
- 公开列表、详情、我的分享、稳定排序/游标和 capability 接口。
- 分享候选、取消、撤下、投票、保存副本、引用、举报和幂等写路径。
- DeepSeek 标题异步审核、严格 JSON、一次重试、人工审核与影子/自动发布开关。
- 管理员单版本批准、拒绝、重试、隐藏和恢复，以及现有后台视图。
- Web 列表、详情、规则族切换、保存、投票、举报及色板中心分享入口。
- OpenAPI、生成类型、Smoke、单元、视觉矩阵。

## 保持关闭

- 生产默认所有 Theme Plaza 开关关闭。
- Android format:3 尚未实施，因此不得开启生产写能力。
- 尚未在真实 PostgreSQL 上运行并发保存/首次分享测试，因此这也是开启写开关前的门禁。

## 未执行

- 未 commit。
- 未 push。
- 未部署。
- 未运行生产迁移。
