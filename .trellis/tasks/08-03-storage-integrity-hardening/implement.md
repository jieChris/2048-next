# 实施计划

1. [completed] 建立失败回归并修复普通导航语义。
2. [completed] 修复 full/lite 与 checkpoint 本地镜像的重复存储。
3. [completed] 让本地历史异步写入具备真实成功/失败合同，并迁移出完整 `localStorage` 镜像。
4. [completed] 重排终局保存、待上传持久化与清理顺序。
5. [completed] 运行目标单测、完整相关单测、构建与静态检查。
6. [completed] 使用 Codex 内置浏览器验证真实页面；内置浏览器不可用时记录阻塞，不降级到外部浏览器。
