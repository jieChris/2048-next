# 设计

## 根因

1. `persistSavedPayloadWithLiteFallback()` 即使完整存档成功也继续写轻量存档，而轻量存档仍携带大型回放会话。
2. checkpoint 本地镜像保存了顶层回放，并在 `ui_state.saved_state` 中再次嵌套完整存档。
3. `local_history_store.js` 以 IndexedDB 为主存储后仍维护完整 `localStorage` 镜像；同步兼容写入和后台 IndexedDB 错误均被吞掉。
4. 终局执行先清除当前存档，再保存本地历史和云端待上传记录；两个后续写入都存在假成功。
5. 普通导航入口被硬编码为 `abandon/navigation`。

## 修复边界

### 1. 导航语义

删除普通导航的 attempt 捕获绑定。保留明确重新开始/明确放弃链路及其 `abandon/restart` 合同。服务端兼容枚举不做破坏性修改。

### 2. 当前对局存储

- 完整存档成功：以完整存档为唯一主副本，并删除同模式旧轻量键。
- 完整存档失败：继续写轻量键作为回退，不先删除旧完整存档。
- 只有首选持久存储写入完整存档成功才视为 `persistedFull`；若仅会话存储接收完整存档，仍把当前轻量存档写入首选持久存储。
- checkpoint 本地镜像调用现有 payload builder 时传入 `includeSavedState: false`；镜像保留顶层紧凑回放和计时 UI，恢复时使用既有 replay fallback。

### 3. 本地历史

- 终局调用优先使用现有 `saveRecordAsync`，等待 IndexedDB 事务完成。
- IndexedDB 成功时即视为可靠保存；`localStorage` 镜像不是成功前提。
- IndexedDB 不可用时才使用 `localStorage` 回退；回退写入失败必须 reject/返回失败。
- 历史页与回放页优先使用现有异步 API。
- 旧镜像只在 IndexedDB 迁移事务成功后清除。
- fallback 原文非法、部分不可验证或读取异常时，merge 型保存/导入必须失败并保留原文；只有明确 replace/clear 可覆盖。

### 4. 终局提交门控

终局不再在异步保存前清理恢复来源：

```text
终局触发
→ 本地历史异步保存成功
→ 云端待上传记录同步写入成功
→ 清理当前存档/checkpoint/当前会话引用
→ 尝试网络上传
```

任一步失败：保留恢复来源，重置本次提交完成标记，允许页面生命周期或用户后续操作重试。

明确重开也必须先完成上述可靠捕获；本地历史或 pending 写入失败时阻止重开并保留旧局。已经可靠保存时保持原确认框的同步时序；回放和 checkpoint 的内部同步重启不经过用户重开门控。

在线运行时包装器应等待本地历史保存 Promise 成功后再执行终局网络提交。待上传写函数返回布尔值；只有返回 `true` 才执行清理。已有待上传记录与新记录冲突时，队列写入也必须返回可判断结果。

### 5. 兼容与失败策略

- 不主动清空未知或未验证的数据。
- pending 主键和队列的非法、未来版本或不可读原文不得在初始化、入队或提升时删除/覆盖；队列满时返回失败，不静默淘汰旧记录。
- 迁移失败继续读取旧镜像。
- IndexedDB 和 `localStorage` 都不可写时保留当前对局，并记录可诊断失败。
- 不依赖扩大浏览器配额。

## 测试

- `QuotaExceededError` 下本地回退失败。
- IndexedDB 成功、镜像失败仍算可靠保存。
- 本地历史 Promise 失败时不触发后续清理。
- pending 主键/队列写失败时不清理恢复来源。
- full 成功删除 lite；full 失败保留 lite 回退。
- checkpoint 本地镜像无嵌套完整存档且可通过回放恢复。
- 普通导航不产生 `abandon`；明确重开仍产生。
