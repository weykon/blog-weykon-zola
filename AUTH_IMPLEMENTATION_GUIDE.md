# 认证和隐私保护系统实现指南

## 📋 项目概述

本指南记录了博客系统中认证和隐私保护功能的实现进度和步骤。

## ✅ 已完成的工作

### 1. 数据库层面 (100%)

#### 1.1 迁移文件
- ✅ 创建了 `migrations/20251012184713_add_is_private_field.sql`
- ✅ 添加了 `is_private BOOLEAN DEFAULT false` 字段到 posts 表
- ✅ 创建了索引 `idx_posts_is_private`

#### 1.2 用户初始化脚本
- ✅ 创建了 `scripts/init_user_and_content.sql`
- ✅ 包含添加 Weykon 用户 (weykonkong@gmail.com) 的逻辑
- ✅ 包含关联所有现有内容到 Weykon 账号的逻辑
- ✅ 幂等性设计，可安全重复运行

**运行方法**:
```bash
# 方法1: 通过 psql
psql -U your_username -d blog_weykon -f scripts/init_user_and_content.sql

# 方法2: 通过 Makefile
make psql < scripts/init_user_and_content.sql
```

### 2. JWT 认证系统 (100%)

#### 2.1 JWT 服务模块
- ✅ 创建了 `backend/src/services/jwt.rs`
- ✅ 实现了 `JwtService` 结构体
- ✅ Token 生成：7天有效期
- ✅ Token 验证：检查签名和过期时间
- ✅ Claims 结构包含：user_id, email, username, is_admin, exp, iat

#### 2.2 认证中间件
- ✅ 更新了 `backend/src/middleware/auth.rs`
- ✅ 支持 DEV_MODE 绕过认证（开发环境）
- ✅ 生产环境验证 JWT token from cookie
- ✅ 将 Claims 存入 Request extensions 供后续 handlers 使用

### 3. 登录系统 (100%)

#### 3.1 登录 API
- ✅ 更新了 `backend/src/handlers/auth.rs`
- ✅ 实现了 `login_page()` - 显示登录页面
- ✅ 实现了 `login()` - 处理登录请求
  - 验证用户 email
  - 生成 JWT token
  - 设置 HttpOnly cookie (7天有效期)
- ✅ 实现了 `logout()` - 清除 auth cookie

#### 3.2 登录页面
- ✅ 创建了 `backend/templates/login.html`
- ✅ 简洁美观的渐变背景设计
- ✅ Email 输入表单
- ✅ JavaScript 处理登录请求
- ✅ 成功后自动跳转到首页

#### 3.3 路由配置
- ✅ 添加了 `/auth/login` (GET, POST) 路由
- ✅ 添加了 `/auth/logout` (GET) 路由

### 4. 数据模型更新 (100%)

- ✅ Post 结构体添加了 `is_private: bool` 字段
- ✅ CreatePost 添加了 `is_private: Option<bool>` 字段
- ✅ UpdatePost 添加了 `is_private: Option<bool>` 字段
- ✅ CreateMutter 添加了 `is_private: Option<bool>` 字段

### 5. API 权限控制辅助函数 (100%)

在 `backend/src/handlers/api.rs` 中添加了:
- ✅ `get_user_claims()` - 从 Request 提取 JWT Claims
- ✅ `get_user_id_or_default()` - 获取当前用户 ID
- ✅ `can_modify_post()` - 检查用户是否可以编辑/删除内容
- ✅ `build_privacy_filter()` - 构建隐私过滤 SQL 条件

## 🚧 待完成的工作

### 6. API Handlers 权限控制 (0%)

需要修改以下 API endpoints:

#### 6.1 Posts API

**`create_post()`**:
```rust
// 需要修改的点:
// 1. 添加 req: Request 参数来获取 user claims
// 2. 使用 get_user_id_or_default(&req) 获取 author_id
// 3. 在 INSERT 语句中使用实际的 author_id 而不是硬编码的 1
// 4. 使用 payload.is_private.unwrap_or(false) 设置隐私状态
```

**`update_post()`**:
```rust
// 需要修改的点:
// 1. 添加 req: Request 参数
// 2. 获取当前用户 ID 和 is_admin 状态
// 3. 查询 post 时检查 author_id
// 4. 使用 can_modify_post() 检查权限
// 5. 返回 403 Forbidden 如果没有权限
// 6. 支持更新 is_private 字段
```

**`delete_post()`**:
```rust
// 需要修改的点:
// 1. 添加 req: Request 参数
// 2. 先查询 post 获取 author_id
// 3. 使用 can_modify_post() 检查权限
// 4. 返回 403 Forbidden 如果没有权限
```

**`list_posts()` 和 `get_post()`**:
```rust
// 需要修改的点:
// 1. 添加 req: Request 参数
// 2. 使用 build_privacy_filter() 构建隐私过滤条件
// 3. 在 SQL 查询中添加隐私过滤:
//    - 未登录: 只显示 is_private = false 的内容
//    - 普通用户: 显示 public 内容 + 自己的 private 内容
//    - 管理员: 显示所有内容
```

#### 6.2 Mutters API

同样的修改模式应用于:
- `create_mutter()` - 设置 author_id 和 is_private
- `update_mutter()` - 检查权限
- `delete_mutter()` - 检查权限
- `list_mutters()` - 添加隐私过滤
- `get_mutter()` - 添加隐私过滤

### 7. UI 更新 (0%)

#### 7.1 Header 导航栏

需要修改 `backend/templates/base.html` (或相关模板):

```html
<!-- 在导航栏右侧添加登录/登出按钮 -->
<div class="auth-buttons">
    {% if user %}
        <span class="user-info">Welcome, {{ user.username }}!</span>
        <a href="/admin" class="btn-admin">Admin</a>
        <a href="/auth/logout" class="btn-logout">Logout</a>
    {% else %}
        <a href="/auth/login" class="btn-login">Login</a>
    {% endif %}
</div>
```

需要在 handlers 中传递 user 信息到模板 context。

#### 7.2 编辑器隐私选项

**Post 编辑器** (`backend/templates/editor.html`):

```html
<!-- 在表单中添加 Private 复选框 -->
<div class="form-group">
    <label>
        <input type="checkbox" id="is-private" name="is_private">
        <span>Private Post (only visible to you)</span>
    </label>
    <p class="help-text">
        Private posts won't appear in public lists and can only be viewed by you.
    </p>
</div>
```

JavaScript 中保存时包含 is_private:
```javascript
const postData = {
    title: titleInput.value,
    slug: slugInput.value,
    content: easyMDE.value(),
    is_private: document.getElementById('is-private').checked,
    // ... 其他字段
};
```

**Mutter 创建表单** (`backend/templates/mutters-list.html`):

```html
<!-- 在 create mutter 表单中添加 -->
<label class="inline-checkbox">
    <input type="checkbox" id="mutter-private">
    Private (只有你可见)
</label>
```

更新 JavaScript:
```javascript
const data = {
    content: contentTextarea.value.trim(),
    is_private: document.getElementById('mutter-private').checked,
    // ...
};
```

### 8. 前端 Handlers 更新 (0%)

需要修改:
- `backend/src/handlers/posts.rs` - list, detail handlers
- `backend/src/handlers/mutters.rs` - list, detail handlers
- `backend/src/handlers/admin.rs` - dashboard, editor handlers

每个 handler 都需要:
1. 检查用户认证状态（从 Request extensions 获取 Claims）
2. 传递用户信息到模板 context
3. 根据用户权限过滤显示内容

## 📝 实施步骤建议

### 阶段 1: 数据库初始化（最优先）

```bash
# 1. 启动数据库
docker-compose up -d

# 2. 运行迁移（应该会自动执行）
cd backend && cargo run

# 3. 运行用户初始化脚本
psql -U postgres -d blog_weykon -f scripts/init_user_and_content.sql

# 4. 验证
psql -U postgres -d blog_weykon -c "SELECT * FROM users WHERE email = 'weykonkong@gmail.com';"
```

### 阶段 2: 测试登录功能

1. 启动服务器: `cd backend && cargo run`
2. 访问: http://localhost:3000/auth/login
3. 输入: weykonkong@gmail.com
4. 检查是否成功登录并设置 cookie

### 阶段 3: 逐步实现 API 权限控制

建议按以下顺序实现:

1. **先实现 create endpoints**:
   - `create_post` - 使用实际 author_id
   - `create_mutter` - 使用实际 author_id

2. **再实现查询过滤**:
   - `list_posts` - 添加隐私过滤
   - `list_mutters` - 添加隐私过滤

3. **最后实现修改/删除权限**:
   - `update_post` / `delete_post` - 检查权限
   - `update_mutter` / `delete_mutter` - 检查权限

### 阶段 4: UI 集成

1. 先添加 header 的登录/登出按钮
2. 再添加编辑器的 private 选项
3. 测试完整流程

## 🔧 环境变量配置

确保 `.env` 文件包含:

```env
# JWT 配置
JWT_SECRET=your_strong_secret_key_here_minimum_32_chars

# 开发模式（生产环境设为 false）
DEV_MODE=true

# 数据库
DATABASE_URL=postgresql://postgres:password@localhost:5432/blog_weykon
```

## 🧪 测试场景

### 测试登录流程
1. 访问 `/auth/login`
2. 输入 weykonkong@gmail.com
3. 验证成功跳转并设置 cookie
4. 访问 `/admin` 验证可以访问

### 测试隐私保护（完成 API 修改后）

**场景 1: 未登录用户**
- 访问 `/posts` 应该只看到 public posts
- 访问 private post 的直接 URL 应该返回 404 或 403

**场景 2: 登录用户**
- 访问 `/posts` 可以看到自己的 private posts
- 不能看到别人的 private posts
- 可以创建 private post
- 可以编辑/删除自己的 posts
- 不能编辑/删除别人的 posts

**场景 3: 管理员**
- 可以看到所有内容（包括所有人的 private posts）
- 可以编辑/删除任何内容

## 📚 相关文件清单

### 已修改的文件
- `backend/Cargo.toml` - 添加 jsonwebtoken 依赖
- `backend/src/services/mod.rs` - 注册 jwt 模块
- `backend/src/services/jwt.rs` - JWT 服务实现 ⭐
- `backend/src/middleware/auth.rs` - 认证中间件 ⭐
- `backend/src/handlers/auth.rs` - 登录 handlers ⭐
- `backend/src/handlers/api.rs` - 添加辅助函数
- `backend/src/models/post.rs` - 添加 is_private 字段
- `backend/src/main.rs` - 添加登录路由
- `backend/templates/login.html` - 登录页面 ⭐

### 新创建的文件
- `backend/migrations/20251012184713_add_is_private_field.sql` ⭐
- `scripts/init_user_and_content.sql` ⭐

### 待修改的文件
- `backend/src/handlers/api.rs` - 完成所有 API 权限控制
- `backend/src/handlers/posts.rs` - 添加用户 context
- `backend/src/handlers/mutters.rs` - 添加用户 context
- `backend/templates/base.html` - 添加登录/登出UI
- `backend/templates/editor.html` - 添加 private 选项
- `backend/templates/mutters-list.html` - 添加 private 选项

## 🎯 优先级总结

**P0 (必须立即完成)**:
1. 运行数据库迁移
2. 运行用户初始化脚本
3. 测试登录功能

**P1 (核心功能)**:
4. 实现 create_post 和 create_mutter 的 author_id 设置
5. 实现 list 查询的隐私过滤
6. 实现 update/delete 的权限检查

**P2 (用户体验)**:
7. 添加 header 登录/登出 UI
8. 添加编辑器 private 选项

## 💡 实现提示

### 修改 API handler 的通用模式

```rust
// 之前:
pub async fn some_handler(
    State(state): State<AppState>,
    // ...
) -> Response {
    // ...
}

// 之后:
pub async fn some_handler(
    State(state): State<AppState>,
    req: Request,  // 添加这个
    // ...
) -> Response {
    // 1. 获取用户信息
    let user_claims = get_user_claims(&req);
    let user_id = get_user_id_or_default(&req).await?;

    // 2. 在 SQL 中使用
    let privacy_filter = build_privacy_filter(user_claims.as_ref());
    let query = format!("SELECT * FROM posts WHERE ... {}", privacy_filter);

    // 3. 检查权限
    if !can_modify_post(&user_id, &post.author_id, user_claims.is_admin).await {
        return (StatusCode::FORBIDDEN, Json(ApiResponse { ... }));
    }

    // ...
}
```

### 模板中使用用户信息

```rust
// In handler:
let mut context = tera::Context::new();

// Get user from request
if let Some(claims) = get_user_claims(&req) {
    context.insert("user", &serde_json::json!({
        "id": claims.sub,
        "username": claims.username,
        "email": claims.email,
        "is_admin": claims.is_admin,
    }));
}

let html = state.templates.render("page.html", &context)?;
```

---

**最后更新**: 2025-01-12
**状态**: 核心基础设施完成，待集成到 API 和 UI
