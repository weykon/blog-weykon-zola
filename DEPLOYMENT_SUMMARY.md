# 部署方式变更总结

## 变更原因

从**交叉编译部署**切换到**Docker服务端构建**，原因如下：

### 旧方式的问题
- ❌ 交叉编译复杂（Mac arm64 → Linux x86_64）
- ❌ 需要管理 SQLx 离线数据（`.sqlx/` 目录）
- ❌ 路径解析问题（编译时路径 vs 运行时路径）
- ❌ 需要 cargo-zigbuild 等特殊工具
- ❌ 编译时无法验证数据库查询

### 新方式的优势
- ✅ 在服务器上直接构建（无需交叉编译）
- ✅ 构建时可以连接数据库验证 SQLx 查询
- ✅ 构建环境和运行环境一致
- ✅ 易于重新构建和部署
- ✅ 支持中国镜像源加速

## 已移除的文件

```bash
# 旧的部署脚本
- build.sh                      # 交叉编译脚本
- upload-binary.sh              # 二进制上传脚本
- upload.sh                     # 旧上传脚本
- blog-weykon.service           # systemd 服务文件

# 旧的 Dockerfile
- backend/Dockerfile.optimized  # 优化版本
- backend/Dockerfile.china      # 中国镜像版本
```

## 新的部署文件

```bash
# 新的部署方式
✓ backend/Dockerfile            # 多阶段构建，包含中国镜像配置
✓ docker-compose.yml            # 服务编排（postgres + backend + pgadmin）
✓ deploy-docker.sh              # 自动化部署脚本
✓ .env.production               # 生产环境变量
✓ DOCKER_DEPLOYMENT.md          # 详细部署文档
```

## 部署流程

### 1. 一键部署
```bash
./deploy-docker.sh
```

脚本会自动：
1. 上传项目文件到服务器
2. 在服务器上构建 Docker 镜像
3. 启动所有服务
4. 显示服务状态和日志

### 2. 常用命令

```bash
# 查看日志
ssh douyin 'cd /root/blog.weykon && docker-compose logs -f backend'

# 重启服务
ssh douyin 'cd /root/blog.weykon && docker-compose restart backend'

# 重新构建
ssh douyin 'cd /root/blog.weykon && docker-compose up -d --build backend'

# 停止服务
ssh douyin 'cd /root/blog.weykon && docker-compose down'
```

## 技术细节

### Dockerfile 关键配置

1. **多阶段构建**
   - Stage 1: Builder（构建环境）
   - Stage 2: Runtime（运行环境）

2. **中国镜像加速**
   ```dockerfile
   # Cargo 使用 USTC 镜像
   echo 'registry = "sparse+https://mirrors.ustc.edu.cn/crates.io-index/"'
   ```

3. **SQLx 编译时检查**
   ```dockerfile
   ARG DATABASE_URL
   ENV SQLX_OFFLINE=false  # 构建时连接数据库
   ```

4. **自动运行迁移**
   ```dockerfile
   CMD sqlx migrate run && ./blog-weykon
   ```

### docker-compose.yml 关键配置

1. **服务依赖**
   ```yaml
   depends_on:
     postgres:
       condition: service_healthy  # 等待数据库就绪
   ```

2. **构建参数**
   ```yaml
   build:
     args:
       DATABASE_URL: postgres://...  # 传递给构建阶段
   ```

3. **持久化存储**
   ```yaml
   volumes:
     - ./backend/static/uploads:/app/static/uploads  # 图片上传目录
     - postgres_data:/var/lib/postgresql/data        # 数据库数据
   ```

## 迁移指南

如果服务器上已有旧的二进制部署：

```bash
# 1. 停止旧服务
ssh douyin 'systemctl stop blog-weykon'
ssh douyin 'systemctl disable blog-weykon'

# 2. 备份数据库（可选）
ssh douyin 'docker exec blog_postgres pg_dump -U blog_user blog_db > backup.sql'

# 3. 部署新版本
./deploy-docker.sh
```

## 环境变量配置

编辑服务器上的 `/root/blog.weykon/.env.production`：

```bash
# 必须修改的配置
POSTGRES_PASSWORD=your-secure-password
SESSION_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)

# 根据需要调整
BASE_URL=http://115.190.29.246
DEV_MODE=true  # 生产环境设为 false
```

## 故障排查

### 查看构建日志
```bash
ssh douyin 'cd /root/blog.weykon && docker-compose build --no-cache backend'
```

### 查看运行日志
```bash
ssh douyin 'cd /root/blog.weykon && docker-compose logs --tail=100 backend'
```

### 检查数据库连接
```bash
ssh douyin 'cd /root/blog.weykon && docker-compose exec backend env | grep DATABASE_URL'
```

### 检查模板文件
```bash
ssh douyin 'docker exec blog_backend ls -la /app/templates/'
```

## 性能优化

1. **Docker 缓存层优化**
   - 先复制 Cargo.toml/Cargo.lock
   - 利用 Docker 层缓存减少重复构建

2. **中国镜像源**
   - Cargo: USTC 镜像
   - Docker: 已配置 daocloud 镜像

3. **多阶段构建**
   - Builder 镜像: rust:1.75-slim (大约 1GB)
   - Runtime 镜像: debian:bookworm-slim (约 100MB)
   - 最终镜像大小显著减小

## 文档参考

- `DOCKER_DEPLOYMENT.md` - 详细部署文档
- `docker-compose.yml` - 服务配置
- `backend/Dockerfile` - 构建配置
- `scripts/quick_fix_docker.sh` - Docker 镜像修复脚本

## 下一步

1. ✅ 清理旧的部署文件
2. ✅ 创建 Docker 部署配置
3. ⏭️ 测试服务器部署
4. ⏭️ 导入现有博客内容
5. ⏭️ 配置 SSL/HTTPS
