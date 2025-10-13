#!/bin/bash

# 交叉编译脚本 - 在 Mac 上构建 Linux x86_64 二进制

set -e

echo "================================"
echo "Blog Weykon Cross-Compilation"
echo "================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查依赖
echo -e "${YELLOW}1. 检查构建依赖...${NC}"
if ! command -v cargo-zigbuild &> /dev/null; then
    echo "cargo-zigbuild not found, installing..."
    cargo install cargo-zigbuild
fi

if ! command -v zig &> /dev/null; then
    echo "zig not found, installing..."
    brew install zig
fi

# 添加目标
echo -e "${YELLOW}2. 添加交叉编译目标...${NC}"
rustup target add x86_64-unknown-linux-musl

# 生成 SQLx 离线数据（如果需要）
if [ ! -d "backend/.sqlx" ] || [ "$1" == "--prepare-sqlx" ]; then
    echo -e "${YELLOW}3. 生成 SQLx 离线查询数据...${NC}"
    cd backend
    DATABASE_URL="${DATABASE_URL:-postgres://blog_user:blog_password@localhost:5435/blog_db}" cargo sqlx prepare
    cd ..
    echo -e "${GREEN}✓ SQLx 数据已生成${NC}"
else
    echo -e "${GREEN}✓ SQLx 数据已存在，跳过生成${NC}"
fi

# 构建
echo -e "${YELLOW}4. 开始交叉编译...${NC}"
cd backend
SQLX_OFFLINE=true cargo zigbuild --release --target x86_64-unknown-linux-musl
cd ..

# 验证二进制
if [ -f "backend/target/x86_64-unknown-linux-musl/release/blog-weykon" ]; then
    echo ""
    echo -e "${GREEN}✓ 构建成功！${NC}"
    echo ""
    echo "二进制文件信息："
    ls -lh backend/target/x86_64-unknown-linux-musl/release/blog-weykon
    file backend/target/x86_64-unknown-linux-musl/release/blog-weykon
    echo ""
    echo "下一步："
    echo "  ./upload-binary.sh    # 上传到服务器"
else
    echo -e "${RED}✗ 构建失败${NC}"
    exit 1
fi
