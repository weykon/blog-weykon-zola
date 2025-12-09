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

## SQLx 查询缓存问题处理

**问题现象：**
- 添加新的 SQL 查询后，Docker 构建失败
- 错误信息：`error communicating with database: failed to lookup address information`
- 或者：`expected to read 5 bytes, got 0 bytes at EOF`

**问题根源：**
SQLx 使用编译时查询验证，有两种模式：
1. `SQLX_OFFLINE=false`: 编译时连接数据库验证查询（需要数据库运行）
2. `SQLX_OFFLINE=true`: 使用预生成的 `.sqlx/` 目录缓存文件（离线模式）

Docker 构建时数据库容器还没启动，所以无法使用 online 模式。

**解决方案：**

### 1. 添加新查询时的正确流程

```bash
# 1. 确保本地数据库运行
# 如果使用远程数据库，设置正确的 DATABASE_URL

# 2. 生成 SQLx 查询缓存
cd backend
DATABASE_URL="postgres://user:pass@host:port/db" cargo sqlx prepare

# 3. 将生成的 .sqlx 目录提交到 git
git add .sqlx/
git commit -m "chore: update SQLx query cache"

# 4. 确保 Dockerfile 使用 SQLX_OFFLINE=true
# 检查 Dockerfile 中:
# ENV SQLX_OFFLINE=true
# COPY .sqlx ./.sqlx

# 5. 正常部署
./deploy-docker.sh
```

### 2. 如果忘记生成缓存导致构建失败

**紧急恢复流程：**
```bash
# 1. 回退代码到上一个 working 版本
git checkout backend/src/handlers/auth.rs backend/src/main.rs

# 2. 部署旧版本恢复服务
./deploy-docker.sh

# 3. 在本地生成查询缓存（需要数据库访问）
cd backend
DATABASE_URL="postgres://..." cargo sqlx prepare

# 4. 重新应用修改并提交缓存
git add .sqlx/
git commit -m "chore: update SQLx query cache"

# 5. 重新部署
./deploy-docker.sh
```

### 3. 本地测试新 SQL 查询

```bash
# 方法1: 使用生产数据库（只读操作）
DATABASE_URL="postgres://blog_user:password@115.190.29.246:5432/blog_db" \
  cargo sqlx prepare

# 方法2: 使用本地 Docker 数据库
docker compose up -d postgres
DATABASE_URL="postgres://blog_user:blog_password@localhost:5435/blog_db" \
  cargo sqlx prepare

# 方法3: 在服务器上测试（如果服务器有 cargo）
ssh douyin 'cd /root/blog.weykon/backend && \
  DATABASE_URL="postgres://blog_user:pass@postgres:5432/blog_db" \
  cargo sqlx prepare'
```

### 4. 常见错误和解决方案

**错误1: "failed to lookup address information"**
- 原因：Dockerfile 设置了 `SQLX_OFFLINE=false` 但构建时数据库未启动
- 解决：改为 `SQLX_OFFLINE=true` 并确保 `.sqlx/` 目录存在

**错误2: "No such file or directory: .sqlx"**
- 原因：`.sqlx/` 目录不存在或未被 COPY 到镜像
- 解决：运行 `cargo sqlx prepare` 生成缓存，并检查 Dockerfile 的 COPY 命令

**错误3: "expected to read 5 bytes, got 0 bytes at EOF"**
- 原因：数据库连接配置错误或数据库未运行
- 解决：检查 DATABASE_URL 配置，确保数据库可访问

### 5. 检查清单

部署前检查：
- [ ] `.sqlx/` 目录存在且已提交到 git
- [ ] Dockerfile 中 `SQLX_OFFLINE=true`
- [ ] Dockerfile 中有 `COPY .sqlx ./.sqlx`
- [ ] 所有新的 `sqlx::query!` 宏都在 `.sqlx/` 中有对应缓存

**重要提示：**
- 每次添加或修改 SQL 查询后，都必须重新生成 `.sqlx/` 缓存
- 前端模板和静态文件修改不需要重新生成缓存
- 数据库 migration 后可能需要重新生成缓存