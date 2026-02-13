#!/bin/bash

# Docker-based deployment script for blog.weykon
# This script uploads files to server and builds/runs with Docker Compose

set -e

SERVER="douyin"
REMOTE_DIR="/root/blog.weykon"
EXCLUDE_FILE="/tmp/rsync-exclude-$$"

echo "🚀 Starting Docker-based deployment to $SERVER..."

echo ""
echo "🧱 Step 0: Building frontend (Vite -> backend/static/app)..."
if command -v npm >/dev/null 2>&1; then
  (
    cd frontend
    if [ -f package-lock.json ]; then
      npm ci
    else
      npm install
    fi
    npm run build
  )
else
  echo "⚠️  npm not found, skipping frontend build. (This may deploy stale frontend assets.)"
fi

# Create exclusion list
cat > "$EXCLUDE_FILE" << 'EXCLUDE'
.git/
.venv/
target/
node_modules/
*.log
.DS_Store
dev/
*.backup
.env
content/
EXCLUDE

echo ""
echo "📦 Step 1: Uploading project files to server..."
rsync -avz \
  --exclude-from="$EXCLUDE_FILE" \
  --delete \
  --progress \
  ./ "$SERVER:$REMOTE_DIR/"

# Clean up exclusion file
rm -f "$EXCLUDE_FILE"

echo ""
echo "🐳 Step 2: Building and starting services on server..."
ssh "$SERVER" << 'ENDSSH'
cd /root/blog.weykon

# Ensure .env.production exists
if [ ! -f .env.production ]; then
    echo "⚠️  Warning: .env.production not found! Using defaults..."
    cp .env.example .env.production 2>/dev/null || true
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker compose down || true

# Remove old backend image to force rebuild
echo "🗑️  Removing old backend image..."
docker rmi blog-weykon-backend 2>/dev/null || true

# Build and start services
echo "🏗️  Building backend (this may take a while on first run)..."
docker compose build --no-cache backend

echo "▶️  Starting services..."
docker compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service status
echo ""
echo "📊 Service Status:"
docker compose ps

echo ""
echo "📋 Backend Logs (last 20 lines):"
docker compose logs --tail=20 backend

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Access your blog at:"
echo "   - Backend: http://115.190.29.246:3000"
echo "   - With Nginx: http://115.190.29.246/"
echo ""
echo "💡 Useful commands:"
echo "   - View logs: ssh douyin 'cd /root/blog.weykon && docker compose logs -f backend'"
echo "   - Restart:   ssh douyin 'cd /root/blog.weykon && docker compose restart backend'"
echo "   - Stop all:  ssh douyin 'cd /root/blog.weykon && docker compose down'"
echo "   - Rebuild:   ssh douyin 'cd /root/blog.weykon && docker compose up -d --build backend'"
ENDSSH

echo ""
echo "✨ Deployment finished successfully!"
