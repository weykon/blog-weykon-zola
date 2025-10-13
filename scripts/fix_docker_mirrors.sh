#!/bin/bash

# Docker 镜像源诊断和修复脚本

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}================================${NC}"
echo -e "${YELLOW}Docker 镜像源诊断和修复${NC}"
echo -e "${YELLOW}================================${NC}"
echo ""

# 1. 测试 DNS 解析
echo -e "${YELLOW}1. 测试 DNS 解析...${NC}"

MIRRORS=(
    "docker.mirrors.ustc.edu.cn"
    "hub-mirror.c.163.com"
    "mirror.ccs.tencentyun.com"
    "registry.docker-cn.com"
    "docker.nju.edu.cn"
)

WORKING_MIRRORS=()

for mirror in "${MIRRORS[@]}"; do
    echo -n "测试 $mirror ... "
    if ping -c 1 -W 2 "$mirror" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 可用${NC}"
        WORKING_MIRRORS+=("$mirror")
    else
        echo -e "${RED}✗ 不可用${NC}"
    fi
done

echo ""

# 2. 检查 DNS 配置
echo -e "${YELLOW}2. 检查 DNS 配置...${NC}"
echo "当前 DNS 服务器："
cat /etc/resolv.conf | grep nameserver
echo ""

# 3. 修复 DNS（如果需要）
if [ ${#WORKING_MIRRORS[@]} -eq 0 ]; then
    echo -e "${RED}所有镜像源都无法访问！${NC}"
    echo -e "${YELLOW}尝试修复 DNS...${NC}"

    # 备份原有配置
    sudo cp /etc/resolv.conf /etc/resolv.conf.bak

    # 添加公共 DNS
    sudo tee /etc/resolv.conf > /dev/null <<EOF
nameserver 223.5.5.5
nameserver 223.6.6.6
nameserver 114.114.114.114
nameserver 8.8.8.8
EOF

    echo -e "${GREEN}✓ DNS 配置已更新${NC}"
    echo ""

    # 重新测试
    echo -e "${YELLOW}重新测试镜像源...${NC}"
    WORKING_MIRRORS=()
    for mirror in "${MIRRORS[@]}"; do
        echo -n "测试 $mirror ... "
        if ping -c 1 -W 2 "$mirror" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ 可用${NC}"
            WORKING_MIRRORS+=("$mirror")
        else
            echo -e "${RED}✗ 不可用${NC}"
        fi
    done
    echo ""
fi

# 4. 配置 Docker 使用可用的镜像源
if [ ${#WORKING_MIRRORS[@]} -gt 0 ]; then
    echo -e "${GREEN}找到 ${#WORKING_MIRRORS[@]} 个可用镜像源${NC}"
    echo ""

    # 生成 Docker daemon.json
    sudo mkdir -p /etc/docker

    # 构建镜像列表
    MIRROR_JSON="["
    for mirror in "${WORKING_MIRRORS[@]}"; do
        MIRROR_JSON="$MIRROR_JSON\n    \"https://$mirror\","
    done
    # 移除最后一个逗号
    MIRROR_JSON="${MIRROR_JSON%,}"
    MIRROR_JSON="$MIRROR_JSON\n  ]"

    sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "registry-mirrors": [
    "https://docker.nju.edu.cn",
    "https://registry.docker-cn.com"
  ],
  "dns": ["223.5.5.5", "223.6.6.6", "114.114.114.114"],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

    echo -e "${GREEN}✓ Docker 配置已更新${NC}"
    echo ""

    # 重启 Docker
    echo -e "${YELLOW}重启 Docker 服务...${NC}"
    sudo systemctl daemon-reload
    sudo systemctl restart docker
    sleep 2
    echo -e "${GREEN}✓ Docker 已重启${NC}"

else
    echo -e "${RED}警告：没有可用的镜像源！${NC}"
    echo -e "${YELLOW}将配置 Docker 使用官方源（可能较慢）${NC}"

    sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "dns": ["223.5.5.5", "223.6.6.6", "114.114.114.114", "8.8.8.8"],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

    sudo systemctl daemon-reload
    sudo systemctl restart docker
    sleep 2
fi

echo ""
echo -e "${YELLOW}5. 测试 Docker 拉取...${NC}"
if docker pull alpine:latest; then
    echo -e "${GREEN}✓ Docker 可以正常拉取镜像${NC}"
else
    echo -e "${RED}✗ Docker 拉取失败${NC}"
    echo ""
    echo -e "${YELLOW}建议：${NC}"
    echo "1. 检查服务器网络连接"
    echo "2. 检查防火墙设置"
    echo "3. 尝试使用 VPN 或代理"
fi

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}诊断完成${NC}"
echo -e "${GREEN}================================${NC}"
