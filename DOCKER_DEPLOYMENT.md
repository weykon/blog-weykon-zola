# Docker-Based Deployment Guide

This guide explains how to deploy the blog using Docker Compose with **server-side compilation**. This approach eliminates cross-compilation issues and SQLx offline data problems.

## 🎯 Why Docker Deployment?

**Previous approach (cross-compilation):**
- ❌ Complex cross-compilation setup (Mac arm64 → Linux x86_64)
- ❌ SQLx offline data management required
- ❌ Path resolution issues between dev and production
- ❌ Need for cargo-zigbuild and special tooling

**New approach (Docker server-side build):**
- ✅ Build happens on the server (no cross-compilation)
- ✅ SQLx queries validated at build time (database available)
- ✅ Consistent environment between build and runtime
- ✅ Easy to rebuild and redeploy
- ✅ Chinese mirror support for faster builds

## 📋 Prerequisites

1. **Server Requirements:**
   - Docker and Docker Compose installed
   - Chinese Docker mirrors configured (for faster builds in China)
   - SSH access configured (use alias `douyin` in `~/.ssh/config`)

2. **Local Requirements:**
   - rsync installed
   - SSH access to server

## 🚀 Quick Start

### 1. Configure Environment Variables

On the server, edit `/root/blog.weykon/.env.production`:

```bash
# Database Configuration
POSTGRES_USER=blog_user
POSTGRES_PASSWORD=your-secure-password-here
POSTGRES_DB=blog_db

# Application Configuration  
BASE_URL=http://115.190.29.246
DEV_MODE=true  # Set to false in production

# Session & JWT Secrets (generate with: openssl rand -base64 32)
SESSION_SECRET=your-random-session-secret
JWT_SECRET=your-random-jwt-secret
```

### 2. Deploy to Server

From your local machine:

```bash
# Run the deployment script
./deploy-docker.sh
```

This script will:
1. Upload all project files to the server via rsync
2. Build the Docker image on the server (with database access for SQLx)
3. Start all services (postgres, backend, pgadmin)
4. Show service status and logs

### 3. Verify Deployment

```bash
# Check service status
ssh douyin 'cd /root/blog.weykon && docker-compose ps'

# View backend logs
ssh douyin 'cd /root/blog.weykon && docker-compose logs -f backend'

# Test the endpoint
curl http://115.190.29.246:3000/
```

## 🔧 Common Operations

### View Logs
```bash
# All services
ssh douyin 'cd /root/blog.weykon && docker-compose logs -f'

# Backend only
ssh douyin 'cd /root/blog.weykon && docker-compose logs -f backend'

# Last 50 lines
ssh douyin 'cd /root/blog.weykon && docker-compose logs --tail=50 backend'
```

### Restart Services
```bash
# Restart backend
ssh douyin 'cd /root/blog.weykon && docker-compose restart backend'

# Restart all services
ssh douyin 'cd /root/blog.weykon && docker-compose restart'
```

### Rebuild After Code Changes
```bash
# Option 1: Use deployment script (recommended)
./deploy-docker.sh

# Option 2: Manual rebuild on server
ssh douyin 'cd /root/blog.weykon && docker-compose up -d --build backend'
```

### Stop Services
```bash
# Stop all services
ssh douyin 'cd /root/blog.weykon && docker-compose down'

# Stop and remove volumes (⚠️ deletes database data)
ssh douyin 'cd /root/blog.weykon && docker-compose down -v'
```

### Access Database
```bash
# Via psql
ssh douyin 'docker exec -it blog_postgres psql -U blog_user -d blog_db'

# Via pgAdmin (browser)
# Open: http://115.190.29.246:5050
# Login with credentials from .env.production
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│  Server: 115.190.29.246                             │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │   Nginx      │  │   Backend    │  │ Postgres │ │
│  │   (port 80)  │─▶│  (port 3000) │─▶│ (5432)   │ │
│  └──────────────┘  └──────────────┘  └──────────┘ │
│                           │                         │
│                           ▼                         │
│                    Docker Network                   │
│                    (blog_network)                   │
└─────────────────────────────────────────────────────┘
```

## 📁 Project Structure on Server

```
/root/blog.weykon/
├── docker-compose.yml          # Service orchestration
├── .env.production            # Environment variables (symlinked to .env)
├── backend/
│   ├── Dockerfile             # Multi-stage build with Chinese mirrors
│   ├── src/                   # Rust source code
│   ├── migrations/            # Database migrations
│   ├── templates/             # Tera HTML templates
│   └── static/                # CSS/JS/images
└── scripts/                   # Python migration scripts
```

## 🐞 Troubleshooting

### Build Fails with "no cached data for this query"
This should not happen anymore! The Dockerfile sets `SQLX_OFFLINE=false` and connects to the database during build.

If you see this error:
```bash
# Check that postgres is running
ssh douyin 'cd /root/blog.weykon && docker-compose up -d postgres'

# Wait for postgres to be ready
ssh douyin 'cd /root/blog.weykon && docker-compose exec postgres pg_isready'

# Rebuild backend
ssh douyin 'cd /root/blog.weykon && docker-compose up -d --build backend'
```

### Template Not Found
Templates are copied into the Docker image at `/app/templates/`. The code uses `std::env::current_dir()` which resolves to `/app` inside the container.

Verify templates are present:
```bash
ssh douyin 'docker exec blog_backend ls -la /app/templates/'
```

### Database Connection Issues
```bash
# Check postgres is running
ssh douyin 'cd /root/blog.weykon && docker-compose ps postgres'

# Check connection from backend
ssh douyin 'cd /root/blog.weykon && docker-compose exec backend env | grep DATABASE_URL'

# Test connection manually
ssh douyin 'cd /root/blog.weykon && docker-compose exec postgres psql -U blog_user -d blog_db -c "SELECT 1"'
```

### Build is Slow in China
The Dockerfile uses USTC mirrors for Cargo. If builds are still slow, you can try other mirrors:

Edit `backend/Dockerfile` and change line 16:
```dockerfile
# Option 1: USTC (current)
echo 'registry = "sparse+https://mirrors.ustc.edu.cn/crates.io-index/"' >> /usr/local/cargo/config.toml

# Option 2: TUNA
echo 'registry = "sparse+https://mirrors.tuna.tsinghua.edu.cn/crates.io-index/"' >> /usr/local/cargo/config.toml

# Option 3: SJTU
echo 'registry = "sparse+https://mirrors.sjtug.sjtu.edu.cn/crates.io-index/"' >> /usr/local/cargo/config.toml
```

## 🔐 Security Notes

1. **Change default passwords** in `.env.production`
2. **Generate secure secrets**:
   ```bash
   openssl rand -base64 32
   ```
3. **Set DEV_MODE=false** in production
4. **Configure OAuth** if using Google/WeChat login
5. **Use HTTPS** with proper SSL certificates (configure Nginx)

## 📊 Monitoring

### Check Resource Usage
```bash
# Container stats
ssh douyin 'docker stats --no-stream'

# Disk usage
ssh douyin 'docker system df'
```

### Database Backup
```bash
# Create backup
ssh douyin 'cd /root/blog.weykon && docker-compose exec -T postgres pg_dump -U blog_user blog_db > backup_$(date +%Y%m%d_%H%M%S).sql'

# Restore from backup
ssh douyin 'cd /root/blog.weykon && docker-compose exec -T postgres psql -U blog_user -d blog_db < backup_file.sql'
```

## 🎓 Migration from Binary Deployment

If you were using the old binary deployment approach:

1. Stop the systemd service:
   ```bash
   ssh douyin 'systemctl stop blog-weykon'
   ssh douyin 'systemctl disable blog-weykon'
   ```

2. Backup your database if needed

3. Run the new Docker deployment:
   ```bash
   ./deploy-docker.sh
   ```

4. The Docker setup will create a fresh database or you can restore from backup

## 📚 Related Files

- `backend/Dockerfile` - Multi-stage build configuration
- `docker-compose.yml` - Service definitions
- `deploy-docker.sh` - Automated deployment script
- `.env.production` - Production environment variables
- `scripts/quick_fix_docker.sh` - Docker DNS/mirror fixes for China

## 🤝 Support

For issues or questions, check:
1. Backend logs: `docker-compose logs backend`
2. Postgres logs: `docker-compose logs postgres`
3. Service status: `docker-compose ps`
