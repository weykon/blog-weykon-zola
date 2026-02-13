#!/bin/bash

# France 服务器初始化脚本
# 安装 Docker 和 Docker Compose

set -e

echo "🚀 Setting up france server for blog deployment..."

# 更新系统
echo "📦 Updating system packages..."
apt-get update
apt-get upgrade -y

# 安装必要的依赖
echo "📦 Installing dependencies..."
apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# 添加 Docker 官方 GPG key
echo "🔑 Adding Docker GPG key..."
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# 设置 Docker 仓库
echo "📦 Setting up Docker repository..."
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装 Docker Engine
echo "🐳 Installing Docker..."
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 启动 Docker 服务
echo "🚀 Starting Docker service..."
systemctl start docker
systemctl enable docker

# 验证安装
echo "✅ Verifying Docker installation..."
docker --version
docker compose version

# 创建项目目录
echo "📁 Creating project directory..."
mkdir -p /root/blog.weykon

echo ""
echo "✅ France server setup completed!"
echo ""
echo "📝 Next steps:"
echo "1. Create .env.production file in /root/blog.weykon/"
echo "2. Run the deployment script from your local machine"
echo "3. Configure nginx"
