# 2048 Next（中文说明）

[点击游玩！](https://www.taihe.fun)

一个基于 Web 的 2048 变体项目，包含标准模式、撤回模式、练习板、回放、历史记录与移动端适配等功能。项目当前以模块化运行时方式组织核心逻辑，便于持续重构和回归测试。

## 功能概览

- 多页面入口：`index / play / replay / history / modes / practice / undo / capped`
- 多模式支持：标准、无撤回、练习、障碍块、自定义出数等
- 回放能力：导入、导出、步进、快进、历史跳转
- 历史记录：本地保存、筛选、分页、导出与导入
- 设置系统：主题切换、按钮显示模式（图标/文字）等
- 移动端优化：顶部按钮重排、布局适配、可读性优化

## 技术栈

- 构建与开发：Vite + TypeScript
- 测试：
  - 单测：Vitest
  - 冒烟测试：Playwright
- 代码组织：
  - `js/`：核心运行时代码与页面逻辑
  - `src/`：TS 入口与样式资源
  - `tests/`：unit 与 smoke 测试

## 快速开始

### 1. 环境准备

- Node.js 20+（建议）
- npm 10+（建议）

### 2. 安装依赖

```bash
npm install
```

### 3. 本地开发

```bash
npm run dev
```

启动后按终端提示访问本地地址（通常为 `http://localhost:5173`）。

### 4. 构建与预览

```bash
npm run build
npm run preview
```

## 测试命令

```bash
# 单元测试
npm run test:unit

# 冒烟测试（全部）
npm run test:smoke

# CI 用 smoke 组合
npm run test:smoke:ci

# 回归检查（推荐）
npm run verify:refactor:ci
```

## 常用脚本

```bash
# 重构门禁检查
npm run verify:refactor

# 发布前检查
npm run verify:release

# 重构进度报告
npm run report:refactor-progress
```

## 目录结构（简版）

```text
.
├─ js/                 # 核心运行时与页面业务逻辑
├─ src/                # TS 入口、样式
├─ tests/              # 单测与 smoke
├─ docs/               # 重构/发布相关文档（中文）
├─ public/             # 静态资源
├─ style/              # 页面样式
├─ *.html              # 多页面入口
└─ package.json
```

## 开发建议

- 提交前至少执行：
  - `npm run test:unit`
  - `npm run test:smoke:ci`
- 如果 smoke 在 CI 失败，先确认失败日志对应的是最新提交 SHA，再进行排查。

## 许可证

本项目采用 `MIT License`，详见根目录 [LICENSE](LICENSE)。


