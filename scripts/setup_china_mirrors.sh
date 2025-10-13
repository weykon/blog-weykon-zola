#!/bin/bash

# 中国大陆服务器镜像加速配置脚本
# 配置 Docker、Cargo、Alpine APK 镜像源

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}配置中国大陆镜像加速${NC}"
echo -e "${GREEN}================================${NC}"
echo ""

# 1. 配置 Docker 镜像加速
echo -e "${YELLOW}1. 配置 Docker 镜像加速...${NC}"

# 创建 Docker daemon 配置目录
sudo mkdir -p /etc/docker

# 配置 Docker 镜像加速（使用多个镜像源以提高可用性）
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.ccs.tencentyun.com"
  ],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

echo -e "${GREEN}✓ Docker 镜像加速配置完成${NC}"

# 重启 Docker 服务
echo -e "${YELLOW}重启 Docker 服务...${NC}"
sudo systemctl daemon-reload
sudo systemctl restart docker
echo -e "${GREEN}✓ Docker 服务已重启${NC}"
echo ""

# 2. 配置 Cargo 国内镜像源
echo -e "${YELLOW}2. 配置 Cargo (Rust) 镜像源...${NC}"

# 创建 Cargo 配置目录
mkdir -p ~/.cargo

# 配置使用中国科技大学镜像源
tee ~/.cargo/config.toml > /dev/null <<EOF
[source.crates-io]
replace-with = 'ustc'

[source.ustc]
registry = "sparse+https://mirrors.ustc.edu.cn/crates.io-index/"

[net]
git-fetch-with-cli = true
EOF

echo -e "${GREEN}✓ Cargo 镜像源配置完成${NC}"
echo ""

# 3. 配置项目的 Cargo 配置（在项目目录中）
echo -e "${YELLOW}3. 配置项目 Cargo 源...${NC}"

if [ -d "$(pwd)/backend" ]; then
    mkdir -p "$(pwd)/backend/.cargo"
    tee "$(pwd)/backend/.cargo/config.toml" > /dev/null <<EOF
[source.crates-io]
replace-with = 'ustc'

[source.ustc]
registry = "sparse+https://mirrors.ustc.edu.cn/crates.io-index/"

[net]
git-fetch-with-cli = true
EOF
    echo -e "${GREEN}✓ 项目 Cargo 配置完成${NC}"
else
    echo -e "${YELLOW}⚠ backend 目录不存在，跳过项目配置${NC}"
fi
echo ""

# 4. 配置 Alpine APK 镜像源（在 Dockerfile 中使用）
echo -e "${YELLOW}4. 创建优化的 Dockerfile...${NC}"

cat > Dockerfile.china <<'EOF'
# 优化的 Dockerfile - 使用中国镜像源
FROM rust:1.75-alpine AS builder

# 使用阿里云 Alpine 镜像源
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 安装构建依赖
RUN apk add --no-cache musl-dev openssl-dev openssl-libs-static pkgconfig

WORKDIR /app

# 配置 Cargo 使用中国镜像源
RUN mkdir -p /usr/local/cargo && \
    echo '[source.crates-io]' > /usr/local/cargo/config.toml && \
    echo 'replace-with = "ustc"' >> /usr/local/cargo/config.toml && \
    echo '' >> /usr/local/cargo/config.toml && \
    echo '[source.ustc]' >> /usr/local/cargo/config.toml && \
    echo 'registry = "sparse+https://mirrors.ustc.edu.cn/crates.io-index/"' >> /usr/local/cargo/config.toml

# Copy manifests
COPY Cargo.toml ./
COPY Cargo.lock ./

# Copy source code
COPY src ./src
COPY migrations ./migrations
COPY templates ./templates
COPY static ./static

# Build for release
RUN cargo build --release

# Runtime stage
FROM alpine:latest

# 使用阿里云 Alpine 镜像源
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# Install runtime dependencies
RUN apk add --no-cache libgcc openssl ca-certificates curl

WORKDIR /app

# Copy the binary from builder
COPY --from=builder /app/target/release/blog-weykon /app/blog-weykon

# Copy necessary files
COPY --from=builder /app/templates /app/templates
COPY --from=builder /app/static /app/static
COPY --from=builder /app/migrations /app/migrations

# Create uploads directory
RUN mkdir -p /app/static/uploads && chmod 755 /app/static/uploads

# Expose port
EXPOSE 3000

# Run the binary
CMD ["/app/blog-weykon"]
EOF

echo -e "${GREEN}✓ Dockerfile.china 已创建${NC}"
echo ""

# 5. 验证配置
echo -e "${YELLOW}5. 验证配置...${NC}"

# 检查 Docker 配置
if docker info | grep -q "Registry Mirrors" 2>/dev/null; then
    echo -e "${GREEN}✓ Docker 镜像加速已生效${NC}"
else
    echo -e "${YELLOW}⚠ Docker 镜像加速可能未生效，请检查 /etc/docker/daemon.json${NC}"
fi

# 检查 Cargo 配置
if [ -f ~/.cargo/config.toml ]; then
    echo -e "${GREEN}✓ Cargo 配置文件存在${NC}"
else
    echo -e "${RED}✗ Cargo 配置文件不存在${NC}"
fi

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}配置完成！${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${YELLOW}下一步操作：${NC}"
echo ""
echo "1. 使用优化的 Dockerfile 构建："
echo -e "   ${GREEN}docker-compose -f docker-compose.prod.yml build --file backend/Dockerfile.china${NC}"
echo ""
echo "2. 或者修改 docker-compose.prod.yml 使用 Dockerfile.china："
echo -e "   ${GREEN}sed -i 's/dockerfile: Dockerfile/dockerfile: Dockerfile.china/' docker-compose.prod.yml${NC}"
echo ""
echo "3. 测试 Docker 拉取速度："
echo -e "   ${GREEN}docker pull alpine:latest${NC}"
echo ""
echo "4. 测试 Cargo 构建（在 backend 目录）："
echo -e "   ${GREEN}cd backend && cargo build${NC}"
echo ""
