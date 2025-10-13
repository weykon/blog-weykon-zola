#!/bin/bash

# 快速修复 Docker 镜像问题

echo "快速修复 Docker 配置..."

# 1. 更新 DNS
sudo tee /etc/resolv.conf > /dev/null <<EOF
nameserver 223.5.5.5
nameserver 223.6.6.6
nameserver 114.114.114.114
nameserver 8.8.8.8
EOF

# 2. 配置 Docker 使用稳定的镜像源和 DNS
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json > /dev/null <<'EOF'
{
  "registry-mirrors": [
    "https://docker.nju.edu.cn",
    "https://registry.docker-cn.com"
  ],
  "dns": ["223.5.5.5", "223.6.6.6", "114.114.114.114", "8.8.8.8"],
  "insecure-registries": [],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

# 3. 重启 Docker
sudo systemctl daemon-reload
sudo systemctl restart docker

echo "✓ Docker 配置已更新"
echo ""
echo "测试拉取镜像："
docker pull alpine:latest

echo ""
echo "如果还有问题，运行："
echo "  bash scripts/fix_docker_mirrors.sh"
