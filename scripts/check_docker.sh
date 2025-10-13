#!/bin/bash

echo "Checking Docker status..."
echo ""

# Check if Docker is running
if docker ps > /dev/null 2>&1; then
    echo "✅ Docker is running!"
    echo ""
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
else
    echo "❌ Docker is not running"
    echo ""
    echo "Please start Docker Desktop manually:"
    echo "1. Open Spotlight (Cmd + Space)"
    echo "2. Type 'Docker'"
    echo "3. Press Enter to open Docker.app"
    echo "4. Wait 30-60 seconds for Docker to start"
    echo ""
    echo "Then run this script again to check status"
fi
