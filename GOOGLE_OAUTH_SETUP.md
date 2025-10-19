# Google OAuth 登录配置指南

## 步骤 1: 在 Google Cloud Console 创建 OAuth 凭据

1. 访问 [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. 创建新项目或选择现有项目
3. 启用 Google+ API (在 API 库中搜索并启用)
4. 转到"凭据"页面
5. 点击 "创建凭据" → "OAuth 客户端 ID"
6. 应用类型选择 "Web 应用"
7. 名称：填写 "Blog Weykon" 或任意名称
8. **授权的重定向 URI** 添加：
   ```
   http://115.190.29.246/auth/google/callback
   ```
9. 点击"创建"
10. 保存获得的：
    - **Client ID** (格式类似: xxxxx-xxxxx.apps.googleusercontent.com)
    - **Client Secret**

## 步骤 2: 在服务器上配置环境变量

SSH 登录服务器：

```bash
ssh douyin
cd /root/blog.weykon
```

创建 `.env.production` 文件（如果不存在）：

```bash
cat > .env.production << 'EOF'
# Database (保持不变)
POSTGRES_USER=blog_user
POSTGRES_PASSWORD=blog_password
POSTGRES_DB=blog_db

# Google OAuth (替换为你的真实值)
GOOGLE_CLIENT_ID=你的CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=你的CLIENT_SECRET
GOOGLE_REDIRECT_URI=http://115.190.29.246/auth/google/callback

# Application
BASE_URL=http://115.190.29.246
RUST_LOG=info
DEV_MODE=false

# Security (生成随机字符串)
SESSION_SECRET=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRATION=604800
EOF
```

## 步骤 3: 更新 docker-compose.yml

确保 docker-compose.yml 中的 backend 服务读取 `.env.production`：

```yaml
backend:
  ...
  env_file:
    - .env.production
```

或者直接修改 docker-compose.yml 的 environment 部分。

## 步骤 4: 重新部署

从本地执行：

```bash
cd /Users/weykon/Desktop/p/blog.weykon
./deploy-docker.sh
```

或在服务器上手动执行：

```bash
ssh douyin
cd /root/blog.weykon
docker compose down
docker compose build backend
docker compose up -d
```

## 步骤 5: 测试登录

1. 访问 http://115.190.29.246/login (或 http://115.190.29.246/auth/login)
2. 点击 "Continue with Google" 按钮
3. 选择你的 Google 账号
4. 授权后会自动跳转回首页
5. 导航栏应该显示你的用户名和 Logout 按钮

## 故障排查

### 问题 1: 重定向 URI 不匹配错误

**错误信息**: "Error: redirect_uri_mismatch"

**解决方案**:
- 确保 Google Cloud Console 中的重定向 URI 完全匹配：`http://115.190.29.246/auth/google/callback`
- 注意 http vs https，以及末尾是否有斜杠

### 问题 2: 环境变量未生效

**检查方法**:
```bash
ssh douyin
cd /root/blog.weykon
docker compose exec backend env | grep GOOGLE
```

应该显示你的 GOOGLE_CLIENT_ID 和 GOOGLE_CLIENT_SECRET

### 问题 3: Google OAuth 未配置错误

**错误**: 登录时重定向到 `/?error=google_not_configured`

**解决方案**:
- 检查 `.env.production` 文件是否存在且包含正确的 GOOGLE_CLIENT_ID
- 重新构建并重启容器：
  ```bash
  docker compose down
  docker compose up -d --build backend
  ```

## 验证配置

检查后端日志：

```bash
ssh douyin 'cd /root/blog.weykon && docker compose logs backend --tail=50'
```

应该看到类似的日志：
- `Starting blog server on 0.0.0.0:3000`
- `Database migrations completed`

## 安全提示

⚠️ **重要**:
1. 永远不要提交 `.env.production` 到 Git 仓库
2. 定期更换 JWT_SECRET 和 SESSION_SECRET
3. 考虑为生产环境启用 HTTPS
4. 在 Google Cloud Console 中限制 API 密钥的使用范围
