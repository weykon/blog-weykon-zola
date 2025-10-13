# 中国大陆服务器快速配置指南

## 问题描述

在中国大陆服务器上构建 Docker 镜像时，经常遇到：
- ❌ Docker 镜像拉取慢或超时
- ❌ Rust crates 下载缓慢
- ❌ Alpine APK 包管理器下载慢

## 快速解决方案

### 方案一：一键配置脚本（推荐）

在服务器上执行：

```bash
cd /root/blog.weykon
bash scripts/setup_china_mirrors.sh
```

脚本会自动配置：
1. Docker 镜像加速器
2. Cargo (Rust) 国内源
3. 创建优化的 Dockerfile

### 方案二：手动配置

#### 1. 配置 Docker 镜像加速

```bash
# 创建 Docker daemon 配置
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.ccs.tencentyun.com"
  ]
}
EOF

# 重启 Docker
sudo systemctl daemon-reload
sudo systemctl restart docker
```

#### 2. 配置 Cargo 国内源

```bash
# 全局配置
mkdir -p ~/.cargo
tee ~/.cargo/config.toml > /dev/null <<EOF
[source.crates-io]
replace-with = 'ustc'

[source.ustc]
registry = "sparse+https://mirrors.ustc.edu.cn/crates.io-index/"

[net]
git-fetch-with-cli = true
EOF
```

#### 3. 使用优化的 Dockerfile

修改 `docker-compose.prod.yml`：

```yaml
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile.china  # 改为使用 Dockerfile.china
```

或直接构建：

```bash
docker-compose -f docker-compose.prod.yml build --file backend/Dockerfile.china
```

## 可用的国内镜像源

### Docker 镜像加速器

- 🎓 中科大：`https://docker.mirrors.ustc.edu.cn`
- 📘 网易：`https://hub-mirror.c.163.com`
- ☁️ 腾讯云：`https://mirror.ccs.tencentyun.com`
- 🌏 阿里云（需登录）：`https://你的ID.mirror.aliyuncs.com`

### Cargo 国内源

- 🎓 中科大：`https://mirrors.ustc.edu.cn/crates.io-index/`
- 🗝️ 字节跳动：`https://rsproxy.cn/crates.io-index`
- ☁️ 上海交大：`https://mirrors.sjtug.sjtu.edu.cn/git/crates.io-index/`

### Alpine APK 镜像

- 🌏 阿里云：`mirrors.aliyun.com`
- 🎓 中科大：`mirrors.ustc.edu.cn`
- 🏫 清华：`mirrors.tuna.tsinghua.edu.cn`

## 验证配置

### 测试 Docker 加速

```bash
# 拉取测试镜像
time docker pull alpine:latest

# 查看配置
docker info | grep -A 5 "Registry Mirrors"
```

### 测试 Cargo 构建

```bash
cd backend
cargo build --release
```

### 测试完整构建

```bash
cd /root/blog.weykon
docker-compose -f docker-compose.prod.yml build
```

## 预期效果

配置前：
- Docker 镜像下载：❌ 10+ 分钟或超时
- Rust 依赖下载：❌ 5+ 分钟或失败
- 总构建时间：❌ 15-20 分钟

配置后：
- Docker 镜像下载：✅ 1-2 分钟
- Rust 依赖下载：✅ 2-3 分钟
- 总构建时间：✅ 5-8 分钟

## 故障排查

### Docker 加速不生效

```bash
# 检查配置文件
cat /etc/docker/daemon.json

# 查看 Docker 信息
docker info

# 重启 Docker
sudo systemctl restart docker
```

### Cargo 源无法访问

尝试其他镜像源：

```bash
# 使用字节跳动源
cat > ~/.cargo/config.toml <<EOF
[source.crates-io]
replace-with = 'rsproxy'

[source.rsproxy]
registry = "https://rsproxy.cn/crates.io-index"
EOF
```

### Alpine APK 慢

在 Dockerfile 中添加：

```dockerfile
# 使用清华源
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories
```

## 推荐配置组合

**高可用组合：**
- Docker: 中科大 + 网易 + 腾讯云（多源备份）
- Cargo: 中科大 USTC
- Alpine: 阿里云

**速度优先：**
- Docker: 阿里云（需配置）
- Cargo: 字节跳动 rsproxy
- Alpine: 阿里云

## 其他优化建议

1. **使用 BuildKit 缓存**
   ```bash
   DOCKER_BUILDKIT=1 docker-compose build
   ```

2. **增加 Docker 构建内存**
   ```json
   {
     "registry-mirrors": [...],
     "max-concurrent-downloads": 10,
     "max-concurrent-uploads": 5
   }
   ```

3. **预热依赖缓存**
   ```bash
   # 先拉取基础镜像
   docker pull rust:1.75-alpine
   docker pull alpine:latest
   ```

## 参考链接

- [Rust 官方镜像配置文档](https://rsproxy.cn/)
- [Docker 官方文档](https://docs.docker.com/registry/recipes/mirror/)
- [Cargo Book - 源配置](https://course.rs/cargo/reference/source-replacement.html)
