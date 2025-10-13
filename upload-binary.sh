#!/bin/bash

# 上传二进制部署脚本 - 只上传必要文件

set -e

# 配置
SERVER="douyin"
REMOTE_PATH="/root/blog.weykon"
BINARY_PATH="backend/target/x86_64-unknown-linux-musl/release/blog-weykon"

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Blog Weykon Binary Upload${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# 检查二进制文件
if [ ! -f "$BINARY_PATH" ]; then
    echo "错误：二进制文件不存在"
    echo "请先运行: ./build.sh"
    exit 1
fi

# 测试 SSH 连接
echo -e "${YELLOW}测试 SSH 连接到 $SERVER...${NC}"
if ! ssh -o ConnectTimeout=5 "$SERVER" "echo ok" > /dev/null 2>&1; then
    echo "错误：无法连接到服务器 $SERVER"
    exit 1
fi
echo -e "${GREEN}✓ SSH 连接正常${NC}"
echo ""

# 创建远程目录结构
echo -e "${YELLOW}创建远程目录结构...${NC}"
ssh "$SERVER" "mkdir -p $REMOTE_PATH/{backend,templates,static,migrations}"
echo -e "${GREEN}✓ 目录已创建${NC}"
echo ""

# 上传二进制文件
echo -e "${YELLOW}上传二进制文件...${NC}"
rsync -avz --progress "$BINARY_PATH" "$SERVER:$REMOTE_PATH/"
echo -e "${GREEN}✓ 二进制文件已上传${NC}"
echo ""

# 上传必要文件
echo -e "${YELLOW}上传模板、静态文件和迁移...${NC}"
rsync -avz --delete backend/templates/ "$SERVER:$REMOTE_PATH/templates/"
rsync -avz --delete backend/static/ "$SERVER:$REMOTE_PATH/static/"
rsync -avz backend/migrations/ "$SERVER:$REMOTE_PATH/migrations/"
echo -e "${GREEN}✓ 文件已同步${NC}"
echo ""

# 上传 docker-compose 配置（如果存在）
if [ -f "docker-compose.prod.yml" ]; then
    echo -e "${YELLOW}上传 Docker Compose 配置...${NC}"
    rsync -avz docker-compose.prod.yml "$SERVER:$REMOTE_PATH/"
fi

# 上传 .env.production 作为 .env（如果不存在）
if [ -f ".env.production" ]; then
    echo -e "${YELLOW}上传环境变量文件...${NC}"
    rsync -avz .env.production "$SERVER:$REMOTE_PATH/.env"
fi

# 上传 systemd 服务文件（如果存在）
if [ -f "blog-weykon.service" ]; then
    echo -e "${YELLOW}上传 systemd 服务文件...${NC}"
    scp blog-weykon.service "$SERVER:/tmp/"
fi

# 设置可执行权限
echo -e "${YELLOW}设置二进制文件权限...${NC}"
ssh "$SERVER" "chmod +x $REMOTE_PATH/blog-weykon"
echo -e "${GREEN}✓ 权限已设置${NC}"
echo ""

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}上传完成！${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "服务器上的文件："
ssh "$SERVER" "ls -lh $REMOTE_PATH/ | grep -E 'blog-weykon|templates|static|migrations'"
echo ""
echo "下一步："
echo "  ssh $SERVER"
echo "  cd $REMOTE_PATH"
echo ""
echo "选项 A: 使用 Docker Compose 运行"
echo "  docker-compose -f docker-compose.prod.yml up -d"
echo ""
echo "选项 B: 使用 systemd 运行"
echo "  # 首先配置服务（只需一次）"
echo "  sudo mv /tmp/blog-weykon.service /etc/systemd/system/"
echo "  sudo systemctl daemon-reload"
echo "  sudo systemctl enable blog-weykon"
echo "  sudo systemctl start blog-weykon"
echo "  sudo systemctl status blog-weykon"
echo ""
echo "选项 C: 直接运行测试"
echo "  cd $REMOTE_PATH"
echo "  ./blog-weykon"
