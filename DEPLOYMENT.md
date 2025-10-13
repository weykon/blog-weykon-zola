# 部署指南

## 🚀 快速部署到生产环境

### 1. 上传到服务器

使用 `upload.sh` 脚本将项目上传到服务器：

```bash
./upload.sh
```

脚本会：
- 使用 rsync 进行增量同步（只传输变更的文件）
- 自动排除开发文件（.git, target, .venv 等）
- 显示将要同步的文件预览
- 要求确认后才执行上传

### 2. 服务器配置

SSH 登录到服务器：

```bash
ssh douyin
cd /root/blog.weykon
```

### 3. 配置环境变量

复制并编辑生产环境配置：

```bash
cp .env.production .env
nano .env
```

**重要**：修改以下配置项：

1. **数据库密码**
   ```env
   POSTGRES_PASSWORD=YOUR_SECURE_PASSWORD
   DATABASE_URL=postgres://blog_user:YOUR_SECURE_PASSWORD@postgres:5432/blog_db
   ```

2. **密钥**（使用 `openssl rand -base64 32` 生成）
   ```env
   SESSION_SECRET=生成的随机字符串
   JWT_SECRET=生成的随机字符串
   ```

3. **域名**
   ```env
   BASE_URL=https://blog.weykon.com
   ```

4. **关闭开发模式**
   ```env
   DEV_MODE=false
   ```

5. **OAuth 配置**（如果需要）
   ```env
   GOOGLE_CLIENT_ID=实际的客户端ID
   GOOGLE_CLIENT_SECRET=实际的密钥
   ```

### 4. 构建并启动服务

```bash
# 构建 Docker 镜像
docker-compose -f docker-compose.prod.yml build

# 启动所有服务
docker-compose -f docker-compose.prod.yml up -d

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f backend
```

### 5. 导入数据（如果需要）

如果有备份数据需要导入：

```bash
# 安装 Python 依赖
python3 -m venv .venv
source .venv/bin/activate
pip install -r scripts/requirements.txt

# 导入 Supabase 备份
python scripts/import_supabase_backup.py dev/backup.sql

# 或导入其他格式
python scripts/import_csv.py data.csv
python scripts/import_json.py data.json
```

### 6. 配置 Nginx

复制 nginx 配置文件：

```bash
cp nginx.conf.example /etc/nginx/sites-available/blog.weykon.com
ln -s /etc/nginx/sites-available/blog.weykon.com /etc/nginx/sites-enabled/
```

编辑配置文件，修改域名和路径：

```bash
nano /etc/nginx/sites-available/blog.weykon.com
```

测试并重载 nginx：

```bash
nginx -t
systemctl reload nginx
```

### 7. 配置 SSL 证书

使用 Let's Encrypt 获取免费 SSL 证书：

```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d blog.weykon.com -d www.blog.weykon.com
```

### 8. 验证部署

访问你的域名检查服务是否正常：

```bash
curl https://blog.weykon.com
```

查看服务状态：

```bash
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f
```

## 📊 管理命令

### 查看服务状态

```bash
docker-compose -f docker-compose.prod.yml ps
```

### 查看日志

```bash
# 所有服务
docker-compose -f docker-compose.prod.yml logs -f

# 只看后端
docker-compose -f docker-compose.prod.yml logs -f backend

# 只看数据库
docker-compose -f docker-compose.prod.yml logs -f postgres
```

### 重启服务

```bash
# 重启所有服务
docker-compose -f docker-compose.prod.yml restart

# 只重启后端
docker-compose -f docker-compose.prod.yml restart backend
```

### 停止服务

```bash
docker-compose -f docker-compose.prod.yml down
```

### 更新代码

本地修改后重新上传：

```bash
# 本地执行
./upload.sh

# 服务器上重新构建和启动
ssh douyin
cd /root/blog.weykon
docker-compose -f docker-compose.prod.yml build backend
docker-compose -f docker-compose.prod.yml up -d backend
```

### 数据库管理

```bash
# 连接数据库
docker-compose -f docker-compose.prod.yml exec postgres psql -U blog_user -d blog_db

# 备份数据库
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U blog_user blog_db > backup_$(date +%Y%m%d).sql

# 恢复数据库
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U blog_user blog_db < backup.sql
```

## 🔧 故障排查

### 服务无法启动

1. 检查端口是否被占用：
   ```bash
   lsof -i :3000
   lsof -i :5432
   ```

2. 查看详细错误日志：
   ```bash
   docker-compose -f docker-compose.prod.yml logs backend
   ```

3. 检查环境变量配置：
   ```bash
   cat .env
   ```

### 数据库连接失败

1. 检查数据库容器状态：
   ```bash
   docker-compose -f docker-compose.prod.yml ps postgres
   ```

2. 测试数据库连接：
   ```bash
   docker-compose -f docker-compose.prod.yml exec postgres psql -U blog_user -d blog_db -c "SELECT 1;"
   ```

### 静态文件 404

1. 检查 nginx 配置中的路径是否正确
2. 确保静态文件目录权限正确：
   ```bash
   chmod -R 755 /root/blog.weykon/backend/static
   ```

## 🔐 安全建议

1. **定期更新密码和密钥**
2. **启用防火墙**，只开放必要端口（80, 443, 22）
3. **配置 fail2ban** 防止暴力破解
4. **定期备份数据库**
5. **监控服务器资源使用情况**
6. **及时更新依赖和系统补丁**

## 📈 性能优化

1. **启用 Redis 缓存**（未来）
2. **配置 CDN** 加速静态资源
3. **数据库查询优化** - 使用 EXPLAIN 分析慢查询
4. **启用 HTTP/2 和 Brotli 压缩**

## 🆘 获取帮助

如果遇到问题：

1. 查看日志文件
2. 检查 GitHub Issues
3. 参考 TODO.md 了解已知问题
4. 查看 AUTH_IMPLEMENTATION_GUIDE.md 了解认证系统

---

最后更新：2025-10-13
