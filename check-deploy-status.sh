#!/bin/bash

echo "🔍 Checking deployment status on server..."
echo ""

ssh douyin << 'ENDSSH'
cd /root/blog.weykon

echo "📦 Docker Containers:"
docker compose ps
echo ""

echo "🏗️  Docker Images:"
docker images | grep -E "(blog-weykon|rust|debian)" | head -10
echo ""

echo "💾 Database Status:"
docker compose exec -T postgres pg_isready -U blog_user 2>/dev/null || echo "Database not ready"
echo ""

echo "📋 Backend Logs (last 20 lines):"
docker compose logs --tail=20 backend 2>/dev/null || echo "Backend not running yet"
echo ""

echo "🌐 Network Test:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3000 2>/dev/null || echo "Backend not accessible"

ENDSSH

echo ""
echo "✅ Status check complete!"
