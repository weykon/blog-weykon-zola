# Weykon's Blog - Rust 全栈版本

基于 Rust (Axum) + PostgreSQL 构建的现代化博客系统，支持 Markdown 编辑、OAuth 登录、标签分类等功能。

## 技术栈

### 后端
- **Axum** - 高性能 Web 框架
- **SQLx** - 类型安全的 PostgreSQL 驱动
- **Tera** - 模板引擎（SSR）
- **OAuth2** - Google/微信登录
- **Pulldown-cmark** - Markdown 渲染

### 数据库
- **PostgreSQL 16** - 关系型数据库
- **Docker Compose** - 容器化部署

### 前端
- **Tera Templates** - 服务端渲染
- **EasyMDE** - Markdown 编辑器
- **HTMX** (计划) - 动态交互

## 快速开始

### 1. 环境准备

确保已安装：
- Rust (1.75+)
- Docker & Docker Compose
- Python 3.10+ (用于数据迁移脚本)

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入你的配置
# 特别是 OAuth 的 Client ID 和 Secret
```

### 3. 启动数据库

```bash
# 启动 PostgreSQL 和 pgAdmin
docker-compose up -d

# 查看数据库日志
docker-compose logs -f postgres
```

数据库连接信息：
- PostgreSQL: `localhost:5432`
- pgAdmin: `http://localhost:5050`
  - Email: admin@blog.com
  - Password: admin

### 4. 编译运行后端

```bash
cd backend

# 安装依赖并编译
cargo build

# 运行数据库迁移（自动执行）
# 或手动执行: sqlx migrate run

# 启动开发服务器
cargo run
```

服务器将在 `http://localhost:3000` 启动。

### 5. 迁移现有博客数据

```bash
# 创建 Python 虚拟环境
python3 -m venv .venv
source .venv/bin/activate

# 安装依赖
pip install -r scripts/requirements.txt

# 从 Zola Markdown 文件迁移
cd scripts
python migrate_posts.py ../content/blog

# 或从 CSV 导入
python import_csv.py your_data.csv

# 或从 JSON 导入
python import_json.py your_data.json
```

## 项目结构

```
blog.weykon/
├── backend/                    # Rust 后端
│   ├── src/
│   │   ├── main.rs            # 入口
│   │   ├── config.rs          # 配置
│   │   ├── db.rs              # 数据库连接
│   │   ├── models/            # 数据模型
│   │   ├── handlers/          # 路由处理器
│   │   ├── services/          # 业务逻辑
│   │   └── middleware/        # 中间件
│   ├── migrations/            # 数据库迁移
│   ├── templates/             # Tera 模板
│   ├── static/                # 静态资源
│   └── Cargo.toml
├── scripts/                   # Python 迁移脚本
│   ├── migrate_posts.py
│   ├── import_csv.py
│   └── import_json.py
├── docker-compose.yml
├── .env.example
└── README.md
```

## 主要功能

### ✅ 已实现
- [x] PostgreSQL 数据库设计
- [x] Axum 路由框架
- [x] 文章 CRUD API
- [x] Markdown 渲染
- [x] 标签系统
- [x] 全文搜索（PostgreSQL）
- [x] Web Markdown 编辑器
- [x] 数据迁移脚本
- [x] Docker 部署配置

### 🚧 待实现
- [ ] Google OAuth 登录
- [ ] 微信 OAuth 登录
- [ ] 用户认证中间件
- [ ] 图片上传功能
- [ ] Workspace 管理
- [ ] Book 系列文章
- [ ] 评论系统
- [ ] RSS 订阅

## 开发指南

### 数据库管理

```bash
# 访问 pgAdmin
open http://localhost:5050

# 或使用 psql 命令行
docker exec -it blog_postgres psql -U blog_user -d blog_db
```

### 常用命令

```bash
# 开发模式（自动重载）
cargo watch -x run

# 运行测试
cargo test

# 格式化代码
cargo fmt

# 代码检查
cargo clippy

# 清理并重新构建
cargo clean && cargo build
```

### API 端点

**公开路由**
- `GET /` - 首页
- `GET /posts` - 文章列表
- `GET /posts/:slug` - 文章详情
- `GET /tags/:tag` - 按标签筛选

**管理路由（需认证）**
- `GET /admin` - 管理后台
- `GET /admin/editor` - 新建文章
- `GET /admin/editor/:id` - 编辑文章

**API 路由**
- `GET /api/posts` - 获取文章列表（JSON）
- `POST /api/posts` - 创建文章
- `PUT /api/posts/:id` - 更新文章
- `DELETE /api/posts/:id` - 删除文章
- `GET /api/tags` - 获取标签列表

## OAuth 配置

### Google OAuth

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建项目 -> API和服务 -> 凭据
3. 创建 OAuth 2.0 客户端 ID
4. 授权重定向 URI: `http://localhost:3000/auth/google/callback`
5. 将 Client ID 和 Secret 填入 `.env`

### 微信 OAuth

1. 前往 [微信开放平台](https://open.weixin.qq.com/)
2. 创建网站应用
3. 获取 AppID 和 AppSecret
4. 配置授权回调域名
5. 将配置填入 `.env`

## 部署

### Docker 生产环境

```bash
# 构建生产镜像
docker build -t blog-weykon:latest ./backend

# 使用 docker-compose 部署
docker-compose -f docker-compose.prod.yml up -d
```

### 传统部署

1. 编译 Release 版本：`cargo build --release`
2. 上传二进制文件到服务器
3. 配置 Nginx 反向代理
4. 配置 systemd 服务
5. 设置 HTTPS 证书

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可

MIT License

---

Built with ❤️ by Weykon using Rust & Axum
