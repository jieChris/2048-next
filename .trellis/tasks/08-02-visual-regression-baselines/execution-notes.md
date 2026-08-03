# Execution Notes

## Route Deviation

- 2026-08-02：仓库缺少标准 Trellis 上下文脚本 `.trellis/scripts/get_context.py`，保守回退为直接读取 `AGENTS.md`、`.trellis/spec/index.md`、冒烟规范和实际页面实现。
- 2026-08-02：任务开始时 `AGENTS.md` 禁止本地启动独立 Playwright 或外部浏览器实例，因此首批视觉验收和基线采集使用 Codex 内置浏览器。用户随后调整规则，允许项目专用的隔离 Chrome／Playwright，并要求代理启动的浏览器资源在不再需要后自动关闭。
- 2026-08-02：账号设置页“游客”移除和移动端首轮 CSS 已存在于工作区的未提交改动中。为避免覆盖并行工作，本任务复用并验证这些改动，只补视觉基线体系和必要的增量断言。
- 2026-08-02：用户将原“首批账号设置页”范围明确扩展为全部页面与弹窗。任务按最新要求覆盖 34 个页面、18 个弹窗、4 个尺寸和 2 个主题，不再采用增量纳入策略。
- 2026-08-03：移植到最新 `main` 后的发布复核发现“成就弹窗参考页”依赖 `.git/info/exclude` 中三个未跟踪本机文件，新克隆和 CI 实际回落到游戏页，原 8 张基线不可复现；真实游戏内“成就条幅”弹窗已有同尺寸、双主题 8 项覆盖。采用最保守回退：删除这组重复且不可复现的页面场景与基线，不把本机宣传参考页扩大为生产入口。
- 2026-08-03：设置弹窗在初始基线后已按用户要求把“界面语言”迁入完整设置页，并在弹窗底部增加“完整设置”入口。发布复核确认 6 张差异均来自该批准设计，保留 320×568 未变化基线，只更新其余受影响尺寸与双主题基线。

## Decisions

- 不引入商业工具或新依赖；复用现有预览页、Playwright 和 Git。
- 当前基线覆盖全部 33 个可复现页面状态和已盘点的 18 个弹窗／覆盖层，共 408 个场景。
- 基线 PNG 使用稳定文件名，Git 管理版本；manifest 记录批准日期和原因。
- 本地浏览器默认优先内置方案；需要完整 Runner 时使用隔离 Playwright，完成后关闭代理启动的窗口、上下文、端口和进程，不接管用户现有浏览器。
- 模式简介生产功能开关当前关闭；视觉场景调用项目已有简介 Host Runtime 注入目标模式 fixture。移动端隐藏入口的弹窗通过已绑定 DOM 事件打开，不修改产品可见性规则。

## Validation

- 内置浏览器确认只读画板固定为游客状态，不改浏览器认证存储；登录表单、登录/注册/忘记密码操作完整可见。
- 内置浏览器逐项确认 320×568、390×844、768×1024、1280×720 的 iframe 实际尺寸一致；浅色与夜间均无 `#home-user-display`、无横向溢出。
- 首轮基线暴露 768px 页头被共享样式纵向堆叠；已将账号设置页头固定为横向，并让登录标题行与 560px 表单同轴，重新生成 8 张基线。
- 8 张 PNG 已通过内置浏览器生成到 `tests/visual/baselines/account-settings.visual.spec.ts/`，尺寸与文件名逐项校验；生成后恢复了内置浏览器原有本地账号状态并重置临时视口。
- `npx playwright test --config=playwright.visual.config.ts --list`：识别 1 个文件、8 个场景；未启动独立 Playwright 浏览器。
- `npx tsc --noEmit`：通过。
- `npx vitest run tests/unit/bootstrap-home-user-display.spec.ts tests/unit/app-bootstrap-direct-page.spec.ts`：19 项通过。
- `npm run build`：通过；保留既有 `ui-preview.html` 普通脚本无法由 Vite 打包的警告。
- `git diff --check`：通过；8 张基线均确认为对应尺寸的非交错 RGB PNG，且未被 `.gitignore` 排除。
- 浏览器策略调整后运行 `npm run test:visual`：隔离 Chromium 中 8 个视觉场景全部通过，Runner 退出后测试 WebServer 的 `4174` 端口已释放。
- 全量巡检发现 `/api-docs.html` 被宽泛的 `/api` Vite 代理规则误拦截；代理匹配收紧为 `^/api(?:/|$)` 后页面正常采集。
- 320×568 巡检发现并修复排行榜、注册、密码、2K 监测、排位种子校验器和 5×5 接力页的横向溢出；33 个新增页面默认状态与 18 个弹窗最窄场景分别整组通过。
- `npm run test:visual:update`：隔离 Chromium 中 416 个场景全部通过，用时 3.4 分钟。
- `tests/visual/baselines/` 共 416 张 PNG；文件名所声明的 4 个视口尺寸全部与 PNG 像素尺寸一致，抽查页面、移动端、桌面端、浅色、夜间与弹窗画面未见空白或明显错位。
- 首次不更新基线的全量比较为 389/416，通过失败产物定位到 404 与练习板随机状态、色板锚点滚动及画板 iframe 主题传播竞态；未放宽截图差异阈值。
- 视觉 fixture 同时固定 Web Crypto 随机源，练习板在截图前重置为指定盘面；色板等待工作区展开并固定锚点，取色器在编辑器重绘后重新定位；画板显式选择主题并等待 iframe 根节点同步。
- 5 组受影响场景连续两次普通比较均为 40/40 通过；最终 `npm run test:visual -- --reporter=dot` 为 416/416 通过，用时 2.8 分钟，测试 WebServer 和隔离 Chromium 随 Runner 正常退出。
- 最终 `npx tsc --noEmit`、`npm run build` 和 `git diff --check` 通过；构建仅保留既有 `ui-preview.html` 非 module 脚本警告。manifest 声明 416 个场景，基线目录实有 416 张 PNG，文件名尺寸与图片像素尺寸错误为 0；4174 端口及 Playwright、Chromium、Vite 进程均无残留。
- 2026-08-03 发布复核：测试登记、manifest 与基线目录统一为 33 个页面状态、18 个弹窗／覆盖层、408 张 PNG；每个尺寸与主题组合均为 51 张，文件名尺寸与 PNG 实际像素全部一致。普通比较 `npm run test:visual -- --reporter=dot` 为 408/408 通过，用时 2.8 分钟；未更新基线，隔离 Runner 正常退出。
