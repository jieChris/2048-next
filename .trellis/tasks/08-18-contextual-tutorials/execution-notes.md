# 上下文新手指引执行记录

## Route Deviation

- 初始视觉审阅阶段暂时只启用 `guide=practice-board-v1` 显式入口；用户确认后已接通首次自动提示和统一设置目录，本阶段偏离已收束。
- 用户最终确认目录仅保留在完整设置页，游戏内设置弹窗不再重复显示入口；host 会清理热更新或旧模板残留节点。

## Validation

- `npx vitest run tests/unit/contextual-guide.spec.ts tests/unit/bootstrap-settings-modal-page-host.spec.ts`：20 项通过。
- `npx tsc --noEmit`：通过。
- `npm run build`：通过；仅保留仓库已有的 `ui-preview.html` 非 module 脚本警告。
- `git diff --check`：通过。
- Codex 内置浏览器：验证设置目录展开 8 项、当前页直接打开、八方向跨页、普通模式不误开八方向、回放及五个手动页面显式打开、斐波那契动态文案和练习板默认高亮 `0`；当前视口 1006×837，另有前一阶段 1280×720 与 390×844 验证记录。
- 内置浏览器验证未执行真实放置、移动、回放写入或服务器提交；指引层只读并关闭后恢复页面状态。
- 未更新视觉基线 PNG：本轮没有批准新的基线矩阵，且项目硬约束要求网页验证只使用 Codex 内置浏览器；已用内置浏览器完成结构和溢出检查，后续若批准基线再单独更新 manifest。
- 追加默认选择调整：练习板标准和斐波那契模式均默认高亮 `0`。
