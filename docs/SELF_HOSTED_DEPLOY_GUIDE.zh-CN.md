# 自托管部署指南（GitHub Actions 构建 dist）

## 1. 目标

- 代码合入 `main` 后，由 GitHub Actions 自动执行构建并部署。
- 服务器只发布 `dist/` 构建产物，不直接暴露仓库源码。
- 发布采用 `releases/<release_id> + current` 软链，便于快速回滚。

## 2. 为什么必须发布 dist

当前页面入口已经改为模块入口，浏览器在线上需要加载的是 Vite 构建后的资源文件，而不是仓库中的 `src/entries/*.ts`。

如果服务器继续直接托管仓库源码，会出现这些问题：

- 模块脚本返回错误 MIME 类型或未被编译；
- 页面无法创建初始局面；
- 计时器上下滚动按钮、设置面板和部分样式失效；
- 浏览器报错但业务代码本身并未真正损坏。

因此，生产环境必须发布 `npm run build` 生成的 `dist/`。

## 3. 服务器一次性准备

### 3.1 创建发布目录

```bash
sudo mkdir -p /var/www/2048-next/releases
sudo mkdir -p /var/www/2048-next/shared
sudo chown -R <deploy_user>:<deploy_user> /var/www/2048-next
```

### 3.2 Nginx 指向 current

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/2048-next/current;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

说明：

- `current` 会始终指向某个发布版本目录；
- 工作流上传的是 `dist/` 的内容，所以 `current` 目录下会直接包含 `index.html`、`play.html`、`assets/` 等文件；
- 这是静态多页面站点，不需要把所有请求回退到单页 `index.html`。

### 3.3 验证 SSH

确保 GitHub Actions 使用的私钥可以登录服务器：

```bash
ssh -p <port> <deploy_user>@<server_ip>
```

如果工作流需要重载 Nginx，给部署用户最小权限即可，例如只允许执行 `sudo systemctl reload nginx`。

## 4. GitHub 仓库配置

路径：`Settings -> Secrets and variables -> Actions`

### 4.1 Repository secrets（必填）

- `DEPLOY_HOST`：服务器地址（IP 或域名）
- `DEPLOY_PORT`：SSH 端口，例如 `22`
- `DEPLOY_USER`：部署用户
- `DEPLOY_ROOT`：部署根目录，例如 `/var/www/2048-next`
- `DEPLOY_SSH_PRIVATE_KEY`：部署私钥全文

### 4.2 Repository variables（可选）

- `DEPLOY_KEEP_RELEASES`：保留历史版本数量，默认 `5`

## 5. 自动部署触发

工作流文件：`.github/workflows/deploy-self-hosted.yml`

触发条件：

- push 到 `main`
- 手动 `Run workflow`

部署流程：

1. `npm ci`
2. `npm run verify:release-ready`
3. `npm run build`
4. 将 `dist/` 打包为 `dist-<release_id>.tar.gz`
5. 上传到服务器 `/tmp`
6. 解包到 `${DEPLOY_ROOT}/releases/<release_id>`
7. 软链 `${DEPLOY_ROOT}/current` 指向新版本
8. 清理超出保留数量的旧版本

## 6. 回滚

在服务器上执行：

```bash
cd /var/www/2048-next/releases
ls -1dt */
# 假设回滚到 20260305xxxxxx-abcdef1
ln -sfn /var/www/2048-next/releases/20260305xxxxxx-abcdef1 /var/www/2048-next/current
```

如果 Nginx 配置有缓存或需要显式重载：

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 7. 首次上线前检查

- `main` 最新提交在 GitHub Actions 上通过构建与发布前检查；
- `deploy-self-hosted` workflow 成功；
- 线上访问验证：
  - `/index.html`
  - `/play.html`
  - `/history.html`
  - `/replay.html`
  - `/PKU2048.html`

## 8. 常见问题

### 8.1 `Permission denied (publickey)`

- 私钥与服务器 `authorized_keys` 不匹配；
- `DEPLOY_USER` 或 `DEPLOY_PORT` 配置错误。

### 8.2 页面仍像源码直出那样失效

检查 Nginx 是否仍指向仓库目录，而不是 `${DEPLOY_ROOT}/current`。

### 8.3 页面 404 或资源路径错误

- 构建产物没有完整上传；
- CDN 或反向代理仍缓存旧 HTML；
- 手工上传时漏掉了 `assets/` 目录。

### 8.4 如何确认服务器不需要 Node.js

只要构建发生在 GitHub Actions，而服务器只负责接收 `dist` 文件并提供静态访问，就不需要在服务器安装 Node.js 或 npm。
