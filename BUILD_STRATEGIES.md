# Rust 项目构建策略

## 当前环境

- **本地**: Mac (arm64 / Apple Silicon)
- **服务器**: Linux x86_64
- **技术栈**: Axum + SQLx + PostgreSQL

## 三种构建方案

### 方案 1: Docker 内构建（当前方案）✅ 推荐

**优点：**
- ✅ 跨平台，无需关心本地架构
- ✅ 构建环境一致，可复现
- ✅ 简单易用，一条命令搞定
- ✅ 适合 CI/CD 流程

**缺点：**
- ⚠️ 首次构建慢（需下载依赖）
- ⚠️ 占用服务器资源

**使用方法：**
```bash
# 服务器上执行
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

**构建时间：** 首次 ~10-15 分钟，后续增量 ~2-5 分钟

---

### 方案 2: 本地交叉编译 ⚡ 最快

**优点：**
- ✅ 本地编译更快（Mac 性能好）
- ✅ 不占用服务器资源
- ✅ 可提前验证编译错误
- ✅ 支持离线开发

**缺点：**
- ⚠️ 需要安装交叉编译工具链
- ⚠️ 某些依赖可能不支持交叉编译
- ⚠️ 需要匹配服务器的 glibc 版本

**使用工具：**
- `cross` - Rust 官方交叉编译工具
- 或 `cargo-zigbuild` - 使用 Zig 作为链接器

**使用方法：**
```bash
# 安装 cross
cargo install cross

# 交叉编译到 Linux x86_64
cross build --release --target x86_64-unknown-linux-musl

# 上传二进制
rsync -avz target/x86_64-unknown-linux-musl/release/blog-weykon \
  douyin:/root/blog.weykon/backend/
```

**构建时间：** ~5-8 分钟

---

### 方案 3: 预编译二进制 + Docker 🚀 生产最优

**优点：**
- ✅ 部署最快（只需复制文件）
- ✅ Docker 镜像最小
- ✅ 适合频繁更新
- ✅ 可以使用 GitHub Actions 构建

**缺点：**
- ⚠️ 需要维护构建流程
- ⚠️ 本地和 CI 都要能构建

**使用方法：**
1. 本地或 CI 编译
2. 上传二进制到服务器
3. 使用简化的 Dockerfile（只包含 runtime）

**构建时间：** 本地 ~5-8 分钟，部署 ~30 秒

---

## 推荐方案

### 开发阶段（现在）
使用 **方案 1: Docker 内构建**
- 简单可靠
- 一条命令部署
- 不需要额外配置

### 成熟阶段（未来）
使用 **方案 3: 预编译 + Docker**
- 配置 GitHub Actions
- 自动构建和发布
- 部署速度快

### 如果经常更新
使用 **方案 2: 本地交叉编译**
- 开发时快速验证
- 减少服务器负载
- 但需要额外工具

## 实施建议

当前保持方案 1，如果需要优化可以：

1. **启用 Docker BuildKit 缓存**
   ```bash
   DOCKER_BUILDKIT=1 docker-compose -f docker-compose.prod.yml build
   ```

2. **使用 cargo-chef 加速 Rust 编译**
   - 优化 Dockerfile，缓存依赖层

3. **增加构建资源**
   ```yaml
   build:
     context: ./backend
     dockerfile: Dockerfile
     args:
       BUILDKIT_INLINE_CACHE: 1
   ```

4. **考虑使用预编译的 SQLx offline 模式**
   - 减少编译时数据库连接需求
