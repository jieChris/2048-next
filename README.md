# 2048 Next（中文说明）

[点击游玩！](https://www.2048next.cn)

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

### 2.1 安装 Playwright 浏览器（运行 smoke 前必需）

```bash
# 安装 chromium 与 headless-shell（Playwright 默认无头执行依赖）
npx playwright install chromium chromium-headless-shell
# Linux 依赖（容器/CI 推荐）
npx playwright install-deps chromium
```

> 若未安装浏览器二进制，`npm run test:smoke` / `npm run verify:refactor` 可能出现 `Executable doesn't exist` 报错。

### 3. 人工本地测试（默认连接线上后端）

```bash
npm run dev:cloud-api
```

该命令先检查 `https://2048next.cn/api/health`，确认生产后端可用后再启动前端，并将所有 `/api/*` 请求代理到线上后端。启动后按终端提示访问本地地址（通常为 `http://localhost:5173`）。

这是人工体验验证的默认入口，账号、排行榜、云端记录等数据与线上一致。登录、上传记录、删除记录等写操作会作用于线上真实数据。

仅做隔离的静态页面或自动化测试时使用裸 Vite：

```bash
npm run dev
```

### 3.1 本地联调 API（登录/账号/排行榜可直接测）

前端仓已内置 `/api` 代理，默认转发到本地 `2048-game-api` 后端：`http://127.0.0.1:3000`。  
可直接一键启动（推荐）：

```bash
npm run dev:local
```

默认要求 `2048-game-api/2048-game-api` 仓库与当前前端仓库在同一父目录，且后端 `.env` 已配置 Postgres、token secret、Resend 邮件等运行配置。

手动两端启动方式：

1. 在 `2048-game-api/2048-game-api` 仓启动后端：

```bash
HTTP_PORT=3000 npm run dev:server
```

2. 在当前前端仓启动：

```bash
npm run dev
```

这样页面里所有 `/api/*` 请求都会转发到本地 API，不需要先推服务器。

如果你希望本地页面使用线上 `2048next.cn` API，可直接运行（人工测试默认使用此命令）：

```bash
npm run dev:cloud-api
```

该命令会把前端 `/api/*` 代理到 `https://2048next.cn/api/*`。

如你的 API 端口不是 `3000`，可在启动前设置：

```bash
# Windows PowerShell
$env:VITE_API_PROXY_TARGET="http://127.0.0.1:3001"
npm run dev
```

如 API 仓不在默认相邻目录，可指定目录后再一键启动：

```bash
# Windows PowerShell
$env:LOCAL_API_DIR="G:\\2048\\2048-game-api\\2048-game-api"
npm run dev:local
```

### 4. 构建与预览

```bash
npm run preview
```

`npm run preview` 会先执行一次 `build`，然后启动本地预览站点。`npm run build` 单独执行时仍会生成可部署的 `dist/` 目录。当前多页面入口依赖 Vite 处理后的模块资源，生产环境应发布 `dist/`，而不是直接托管仓库源码。

`npm run preview` 默认会把本地预览站点的 `/api/*` 请求代理到 `https://2048next.cn/api/*`，因此在不启动本地 API 仓的情况下，也可以直接登录、查看排行榜并使用在线功能。

如果你要改用其他 API 目标，可在启动前覆盖：

```bash
# Windows PowerShell
$env:VITE_API_PROXY_TARGET="https://2048next.cn"
npm run preview
```

如果你已经自行构建过，且明确要保留原始 `vite preview` 行为，可运行：

```bash
npm run preview:raw
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

# 更新 baseline 指标文档
npm run report:baseline
```

## 部署

- 推荐流程：GitHub Actions 在 CI 中执行 `npm ci && npm run build`，随后把 `dist/` 上传到服务器。
- 服务器只需要提供静态文件和原子切换发布目录，不需要安装 Node.js。
- 自托管部署步骤、Secrets 和 Nginx 指向方式见 [docs/SELF_HOSTED_DEPLOY_GUIDE.zh-CN.md](docs/SELF_HOSTED_DEPLOY_GUIDE.zh-CN.md)。

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
