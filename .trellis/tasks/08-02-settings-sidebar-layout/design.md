# 设计

参考 GitHub Primer NavList 的二级导航层级：左侧为无外框的紧凑分类入口，右侧为独立内容工作区。项目使用原生 HTML、CSS 和 TypeScript，且 palette 页面不加载已安装的 Tabler Core；因此只复用 Primer 的布局语言，不引入组件库或新依赖。沿用项目颜色 token 与现有分类链接；只调整 DOM 容器和 CSS，不改 hash 或色板业务逻辑。

“回首页”属于固定目的地，不应被共享的上下文返回逻辑转换为 `history.back()`；通过 `data-back-navigation="fixed"` 显式退出该共享拦截。其他页面未标记的返回按钮保持原有上下文返回行为。

外观与配色工作区复用计时器的原生 `<details>` 折叠模式，默认不带 `open` 属性。折叠容器包裹主题选择、色板列表、颜色编辑和棋盘预览，避免只折叠局部控件而增加无意义层级。
