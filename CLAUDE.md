- ## 快速前端模板热更新

  当修改 `backend/templates/*.html` 文件后，使用以下命令快速部署（无需重新编译）：

  **单个文件：**
  ```bash
  scp backend/templates/文件名.html douyin:/root/blog.weykon/backend/templates/ && \
  ssh douyin 'docker cp /root/blog.weykon/backend/templates/文件名.html
  blog_backend:/app/templates/文件名.html && \
  cd /root/blog.weykon && docker compose restart backend'

  多个文件：
  # 上传所有模板
  scp backend/templates/*.html douyin:/root/blog.weykon/backend/templates/
  scp backend/templates/admin/*.html douyin:/root/blog.weykon/backend/templates/admin/

  # 复制到容器并重启
  ssh douyin 'cd /root/blog.weykon && \
  docker cp backend/templates blog_backend:/app/ && \
  docker compose restart backend'

  说明：
  - 模板文件修改后立即生效，约 3-5 秒完成
  - 不需要重新编译 Rust 代码（节省 5-10 分钟）
  - 重启容器会清除 Tera 模板缓存

  这样每次你修改模板文件时，只需要告诉我文件名，我就能快速部署了！🚀