# 执行记录

## Route Deviation

- 仓库存在 `.trellis/spec` 与 `.trellis/tasks`，但缺少技能约定的 `.trellis/scripts/get_context.py` 和 `.trellis/spec/guides/index.md`。采用最保守回退：手工建立本任务目录，读取现有 `.trellis/spec/index.md`、`frontend-api-boundary.md` 与 `cross-repo-architecture.md`，并将水印明确限制为非权威前端回放元数据。

## 调查记录

- v1 回放已经通过文件头保存开局时间，并通过扩展记录保存模式、规则、挑战、种子和自定义子计时器；因此无需新增回放容器或混淆协议。
- 本次只补充开局时账号 ID/昵称扩展，服务端身份仍以登录令牌和排位会话为准。
- 昵称按既有账号策略最多保留 10 个 Unicode 字符，用户 ID 最多保留 64 个字符，防止被篡改的 localStorage 或续局存档放大回放载荷。
- 回放页优先读取 v1 内嵌水印；旧云端/本地记录没有扩展字段时，回退到记录归属信息，并可用 `ended_at - duration_ms` 补出开局时间。

## 验证记录

- 专项单测：3 个文件、39 项通过，覆盖开局账号快照、扩展字段编码、Unicode 昵称原样保留/限长和 v1 编解码。
- 回放页面 Smoke：28 项全部通过，覆盖新水印展示和旧 v1、VRS、Verse、v9、云端、本地历史等兼容入口。
- `npm run audit:game-manager`、`npm run audit:service-boundary`、`npx tsc --noEmit`、`node --check js/replay_ui.js`、`git diff --check`：通过。
- `2048-game-api` 使用带 ext 6/7 的终局回放执行 `verifyReplaySubmission`：通过，未知身份扩展不会破坏服务端重演。
- `npm run build`：通过；仅保留仓库已有的 `ui-preview.html` 非 module script 构建提示。
