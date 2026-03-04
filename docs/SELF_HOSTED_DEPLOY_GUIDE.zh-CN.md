# 自有服务器部署指南（GitHub Actions）

## 1. 目标
- 代码合入 `main` 后自动构建并部署到你自己的服务器。
- 发布采用 `releases/<release_id> + current` 软链，支持快速回滚。

## 2. 服务器一次性准备

### 2.1 创建部署目录
```bash
sudo mkdir -p /var/www/2048-next/releases
sudo mkdir -p /var/www/2048-next/shared
sudo chown -R <deploy_user>:<deploy_user> /var/www/2048-next
```

### 2.2 Nginx 指向 current
```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/2048-next/current;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

> 如果你是纯静态多页面，本项目默认直接访问 `index.html / play.html / history.html` 等页面即可。

### 2.3 验证 SSH
- 确保 GitHub Actions 使用的私钥可登录服务器：
```bash
ssh -p <port> <deploy_user>@<server_ip>
```

## 3. GitHub 仓库配置

路径：`Settings -> Secrets and variables -> Actions`

### 3.1 Repository secrets（必填）
- `DEPLOY_HOST`: 服务器地址（IP 或域名）
- `DEPLOY_PORT`: SSH 端口（例如 `22`）
- `DEPLOY_USER`: 部署用户
- `DEPLOY_ROOT`: 部署根目录（例如 `/var/www/2048-next`）
- `DEPLOY_SSH_PRIVATE_KEY`: 私钥全文（推荐专用 deploy key）

### 3.2 Repository variable（可选）
- `DEPLOY_KEEP_RELEASES`: 保留历史版本数量，默认 `5`

## 4. 自动部署触发
- workflow 文件：`.github/workflows/deploy-self-hosted.yml`
- 触发条件：
  - push 到 `main`
  - 手动 `Run workflow`

部署流程：
1. `npm ci`
2. `npm run verify:release-ready`
3. `npm run build`
4. 打包 `dist-<release_id>.tar.gz`
5. 上传到服务器 `/tmp`
6. 解包到 `${DEPLOY_ROOT}/releases/<release_id>`
7. 软链 `${DEPLOY_ROOT}/current` 指向新版本
8. 清理超出保留数量的旧版本

## 5. 回滚（服务器手工）

```bash
cd /var/www/2048-next/releases
ls -1dt */
# 假设回滚到 20260305xxxxxx-abcdef1
ln -sfn /var/www/2048-next/releases/20260305xxxxxx-abcdef1 /var/www/2048-next/current
```

如果 Nginx 有缓存策略，按实际配置执行 reload：
```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 6. 首次上线前检查
1. `main` 最新 CI（Smoke + Release Ready）通过。
2. Burn-in readiness 显示“可切换”，并满足连续窗口门槛。
3. `deploy-self-hosted` workflow 成功。
4. 线上访问验证：
- `/index.html`
- `/play.html`
- `/history.html`
- `/replay.html`

## 7. 常见问题

### 7.1 `Permission denied (publickey)`
- 私钥与服务器 `authorized_keys` 不匹配。
- `DEPLOY_USER` 或 `DEPLOY_PORT` 配置错误。

### 7.2 解包失败
- 目标目录无写权限，修正目录 owner。
- 服务器磁盘不足。

### 7.3 页面 404 或资源路径错误
- Nginx `root` 未指向 `${DEPLOY_ROOT}/current`。
- 反向代理或 CDN 未刷新缓存。
