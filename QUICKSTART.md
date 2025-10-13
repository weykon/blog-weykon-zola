# 快速启动指南

## 第一步：复制环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，按需修改配置（默认配置已经可以本地运行）。

## 第二步：启动数据库

```bash
# 使用 docker-compose 启动 PostgreSQL
docker-compose up -d

# 查看数据库是否正常启动
docker-compose logs -f postgres
```

等待数据库初始化完成（看到 "database system is ready to accept connections"）。

## 第三步：导入 Supabase 备份数据

```bash
# 激活 Python 虚拟环境（如果还没有）
python3 -m venv .venv
source .venv/bin/activate  # macOS/Linux

# 安装 Python 依赖
pip install -r scripts/requirements.txt

# 导入你的 Supabase 备份
python scripts/import_supabase_backup.py dev/db_cluster-01-10-2024@03-15-46.backup
```

这个脚本会：
- 解析 Supabase 备份文件
- 提取 `mutters` 表中的公开文章（跳过 `is_private=true` 的）
- 生成 slug 和 excerpt
- 导入到新的 PostgreSQL 数据库

## 第四步：启动 Rust 后端

```bash
cd backend

# 编译并运行（首次会比较慢）
cargo run

# 或者使用 make 命令
cd ..
make dev
```

服务器启动后访问：
- 主页：http://localhost:3000
- 文章列表：http://localhost:3000/posts
- 管理后台：http://localhost:3000/admin
- API 文档：http://localhost:3000/api/posts

## 第五步：创建第一篇文章

1. 访问 http://localhost:3000/admin/editor
2. 填写标题和内容（支持 Markdown）
3. 点击 "Create Post"

## 其他命令

### 使用 Makefile

```bash
make help        # 查看所有命令
make setup       # 初始化项目
make db-up       # 启动数据库
make dev         # 启动开发服务器
make migrate     # 运行数据迁移（从 Zola Markdown 文件）
make psql        # 连接到 PostgreSQL
```

### 手动操作

```bash
# 访问数据库
docker exec -it blog_postgres psql -U blog_user -d blog_db

# 查看所有文章
SELECT id, title, slug, created_at FROM posts ORDER BY created_at DESC;

# 停止数据库
docker-compose down

# 重新构建 Rust 项目
cd backend && cargo clean && cargo build
```

## 导入其他数据源

### 从 Zola Markdown 文件导入

```bash
source .venv/bin/activate
python scripts/migrate_posts.py content/blog
```

### 从 CSV 导入

CSV 格式：`title, slug, content, tags, created_at, is_ai_generated`

```bash
python scripts/import_csv.py your_data.csv
```

### 从 JSON 导入

JSON 格式：数组，每个对象包含 `title, slug, content, tags, created_at, is_ai_generated`

```bash
python scripts/import_json.py your_data.json
```

## 故障排除

### 数据库连接失败

```bash
# 检查 PostgreSQL 是否运行
docker ps

# 重启数据库
docker-compose restart postgres

# 查看数据库日志
docker-compose logs postgres
```

### Rust 编译错误

```bash
# 清理并重新编译
cd backend
cargo clean
cargo build
```

### Python 脚本错误

```bash
# 确保虚拟环境激活
source .venv/bin/activate

# 重新安装依赖
pip install --upgrade -r scripts/requirements.txt
```

## 下一步

- 配置 OAuth 登录（Google/微信）
- 添加图片上传功能
- 部署到服务器
- 配置 Nginx 反向代理

详见 `README_NEW.md`
