# Blog Weykon - 二进制部署指南

## 概述

本指南介绍如何在 Mac 上交叉编译 Linux 二进制，然后部署到中国服务器。

**优势：**
- ✅ 避免服务器上 Docker 镜像拉取慢的问题
- ✅ 构建速度快（本地 Mac 构建）
- ✅ 静态链接，无需在服务器上安装 Rust
- ✅ 二进制文件小（~12MB）
- ✅ 支持多种部署方式（systemd / Docker / 直接运行）

---

## 1. 本地构建（Mac）

### 一键构建

```bash
# 赋予执行权限
chmod +x build.sh

# 构建（首次构建会自动安装依赖）
./build.sh

# 如果需要重新生成 SQLx 数据
./build.sh --prepare-sqlx
```

### 手动构建步骤

```bash
# 1. 安装依赖
cargo install cargo-zigbuild
brew install zig
rustup target add x86_64-unknown-linux-musl

# 2. 生成 SQLx 离线数据（只需一次）
cd backend
DATABASE_URL="postgres://blog_user:blog_password@localhost:5435/blog_db" \
  cargo sqlx prepare

# 3. 交叉编译
SQLX_OFFLINE=true cargo zigbuild --release --target x86_64-unknown-linux-musl

# 4. 检查二进制
file target/x86_64-unknown-linux-musl/release/blog-weykon
```

**预期输出：**
```
ELF 64-bit LSB executable, x86-64, version 1 (SYSV), statically linked, stripped
```

---

## 2. 上传到服务器

### 一键上传

```bash
# 赋予执行权限
chmod +x upload-binary.sh

# 上传
./upload-binary.sh
```

脚本会自动：
1. 检查二进制文件是否存在
2. 测试 SSH 连接
3. 创建远程目录结构
4. 上传二进制、模板、静态文件、迁移文件
5. 上传配置文件（.env, docker-compose, systemd service）
6. 设置可执行权限

---

## 3. 服务器部署

SSH 连接到服务器：

```bash
ssh douyin
cd /root/blog.weykon
```

### 方案 A: 使用 systemd（推荐生产环境）

**首次配置：**

```bash
# 1. 安装 systemd 服务
sudo mv /tmp/blog-weykon.service /etc/systemd/system/
sudo systemctl daemon-reload

# 2. 编辑环境变量（如果需要）
nano .env

# 3. 启动服务
sudo systemctl enable blog-weykon
sudo systemctl start blog-weykon

# 4. 查看状态
sudo systemctl status blog-weykon

# 5. 查看日志
sudo journalctl -u blog-weykon -f
```

**后续更新：**

```bash
# 本地重新构建和上传
./build.sh && ./upload-binary.sh

# 服务器上重启服务
ssh douyin "sudo systemctl restart blog-weykon"
```

---

### 方案 B: 使用 Docker Compose（适合需要隔离）

```bash
# 使用预编译二进制的 docker-compose
docker-compose -f docker-compose.binary.yml up -d

# 查看日志
docker-compose -f docker-compose.binary.yml logs -f backend

# 停止
docker-compose -f docker-compose.binary.yml down
```

**注意：** 此方案仍需要 Docker，但不需要构建镜像，只运行预编译的二进制。

---

### 方案 C: 直接运行（适合快速测试）

```bash
# 设置环境变量
export DATABASE_URL="postgres://blog_user:blog_password@localhost:5432/blog_db"
export RUST_LOG=info

# 运行
./blog-weykon

# 后台运行
nohup ./blog-weykon > blog.log 2>&1 &

# 查看日志
tail -f blog.log
```

---

## 4. 数据库设置

### 如果使用本地 PostgreSQL

```bash
# 安装 PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# 创建用户和数据库
sudo -u postgres psql
CREATE USER blog_user WITH PASSWORD 'blog_password';
CREATE DATABASE blog_db OWNER blog_user;
\q

# 运行迁移
cd /root/blog.weykon
psql -U blog_user -d blog_db -f migrations/20240101000000_init.sql
psql -U blog_user -d blog_db -f migrations/20240102000000_add_privacy.sql
psql -U blog_user -d blog_db -f migrations/20240103000000_add_content_type.sql
```

### 如果使用 Docker PostgreSQL

```bash
# 只启动数据库
docker-compose -f docker-compose.binary.yml up -d postgres

# 连接测试
docker exec -it blog_postgres_prod psql -U blog_user -d blog_db
```

---

## 5. Nginx 反向代理

```nginx
server {
    listen 80;
    server_name blog.weykon.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 静态文件直接由 Nginx 提供（可选优化）
    location /static/ {
        alias /root/blog.weykon/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 上传文件
    location /static/uploads/ {
        alias /root/blog.weykon/static/uploads/;
        expires 7d;
    }
}
```

```bash
# 应用配置
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. 监控和维护

### 查看服务状态

```bash
# systemd
sudo systemctl status blog-weykon
sudo journalctl -u blog-weykon --since "1 hour ago"

# Docker
docker-compose -f docker-compose.binary.yml ps
docker-compose -f docker-compose.binary.yml logs --tail=100 backend

# 进程
ps aux | grep blog-weykon
```

### 性能监控

```bash
# 查看资源使用
top -p $(pgrep blog-weykon)

# 查看内存
ps -o pid,user,%mem,command -p $(pgrep blog-weykon)

# 查看连接数
ss -tupln | grep 3000
```

### 日志轮转（systemd 自动处理）

```bash
# 查看日志大小
sudo journalctl --disk-usage

# 清理旧日志
sudo journalctl --vacuum-time=7d
```

---

## 7. 故障排查

### 服务无法启动

```bash
# 检查二进制文件
ls -lh /root/blog.weykon/blog-weykon
file /root/blog.weykon/blog-weykon

# 检查权限
chmod +x /root/blog.weykon/blog-weykon

# 手动运行查看错误
cd /root/blog.weykon
./blog-weykon
```

### 数据库连接失败

```bash
# 测试数据库连接
psql -U blog_user -d blog_db -h localhost

# 检查 DATABASE_URL
echo $DATABASE_URL

# 检查数据库服务
sudo systemctl status postgresql
# 或
docker ps | grep postgres
```

### 模板加载失败

```bash
# 检查模板文件
ls -lh /root/blog.weykon/templates/

# 检查工作目录
pwd
cd /root/blog.weykon
```

---

## 8. 更新流程

### 快速更新

```bash
# 本地
./build.sh && ./upload-binary.sh

# 服务器（systemd）
ssh douyin "sudo systemctl restart blog-weykon"

# 服务器（Docker）
ssh douyin "cd /root/blog.weykon && docker-compose -f docker-compose.binary.yml restart backend"
```

### 完整更新（含数据库迁移）

```bash
# 1. 本地构建
./build.sh

# 2. 上传
./upload-binary.sh

# 3. SSH 到服务器
ssh douyin

# 4. 停止服务
sudo systemctl stop blog-weykon

# 5. 备份数据库
pg_dump -U blog_user blog_db > backup_$(date +%Y%m%d_%H%M%S).sql

# 6. 运行新迁移（如果有）
psql -U blog_user -d blog_db -f migrations/新迁移文件.sql

# 7. 启动服务
sudo systemctl start blog-weykon

# 8. 检查
sudo systemctl status blog-weykon
curl http://localhost:3000/
```

---

## 9. 回滚

```bash
# 如果更新出问题，回滚到之前的二进制
ssh douyin
cd /root/blog.weykon

# 恢复之前的备份
cp blog-weykon blog-weykon.new
cp blog-weykon.backup blog-weykon

# 重启服务
sudo systemctl restart blog-weykon
```

---

## 10. 性能优化建议

1. **启用 Release 模式编译（已默认）**
   - 使用 `--release` 标志

2. **使用 Nginx 缓存静态文件**
   - 参考上面的 Nginx 配置

3. **数据库连接池**
   - 已在代码中配置（默认 max_connections: 5）

4. **日志级别**
   ```bash
   # 生产环境使用 info 或 warn
   RUST_LOG=info
   ```

5. **启用 gzip 压缩（Nginx）**
   ```nginx
   gzip on;
   gzip_types text/plain text/css application/json application/javascript;
   ```

---

## 总结

✅ **推荐部署方式：** systemd（简单、可靠、易于监控）

**部署命令三步走：**
```bash
# 1. 本地构建
./build.sh

# 2. 上传
./upload-binary.sh

# 3. 服务器重启
ssh douyin "sudo systemctl restart blog-weykon"
```

完成！🎉
