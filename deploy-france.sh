#!/bin/bash

# 部署到 france 服务器的脚本
# 使用服务器端 Docker 构建以避免交叉编译问题

set -e  # 遇到错误立即退出

SERVER="france"
REMOTE_DIR="/root/blog.weykon"

echo "🚀 Starting deployment to $SERVER..."

# Step 1: 上传项目文件
echo ""
echo "📦 Step 1: Uploading project files to server..."
echo "Transfer starting: $(find . -type f | wc -l | tr -d ' ') files"

rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude 'target' \
  --exclude '.git' \
  --exclude 'frontend/dist' \
  --exclude 'frontend/node_modules' \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude 'dev' \
  --exclude '.claude' \
  ./ $SERVER:$REMOTE_DIR/

# Step 2: 在服务器上构建和启动
echo ""
echo "🐳 Step 2: Building and starting services on server..."

ssh $SERVER << 'ENDSSH'
cd /root/blog.weykon

# 检查 .env.production 是否存在
if [ ! -f .env.production ]; then
    echo "⚠️  Warning: .env.production not found! Using defaults..."
fi

# 停止现有容器
echo "🛑 Stopping existing containers..."
docker compose down 2>/dev/null || true

# 删除旧的 backend 镜像以强制重新构建
echo "🗑️  Removing old backend image..."
docker rmi blog_backend 2>/dev/null || true

# 构建 backend（这会花一些时间）
echo "🏗️  Building backend (this may take a while on first run)..."
docker compose build backend

# 启动所有服务
echo "🚀 Starting all services..."
docker compose up -d

# 等待服务启动
echo "⏳ Waiting for services to start..."
sleep 5

# 检查服务状态
echo "✅ Checking service status..."
docker compose ps

echo ""
echo "🎉 Deployment completed!"
echo "📊 Service status:"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
ENDSSH

echo ""
echo "✅ Deployment to $SERVER completed successfully!"
echo ""
echo "📝 Blog is live at: https://blog.weykon.com"
