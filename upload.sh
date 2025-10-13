#!/bin/bash

# Upload script for blog.weykon to production server
# Uses rsync for incremental sync with diff functionality

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER="douyin"
REMOTE_PATH="/root/blog.weykon"
LOCAL_PATH="$(pwd)"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Blog Weykon Upload Script${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.prod.yml" ]; then
    echo -e "${RED}Error: docker-compose.prod.yml not found!${NC}"
    echo -e "${RED}Please run this script from the project root directory.${NC}"
    exit 1
fi

# Test SSH connection
echo -e "${YELLOW}Testing SSH connection to ${SERVER}...${NC}"
if ! ssh -o ConnectTimeout=5 ${SERVER} "echo 'Connection successful'" > /dev/null 2>&1; then
    echo -e "${RED}Error: Cannot connect to ${SERVER}${NC}"
    echo -e "${RED}Please check your SSH configuration.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ SSH connection OK${NC}"
echo ""

# Show what will be synced
echo -e "${YELLOW}Dry run - showing files that will be synced:${NC}"
rsync -avzn --delete \
    --exclude '.git' \
    --exclude 'target' \
    --exclude '.venv' \
    --exclude '__pycache__' \
    --exclude '*.pyc' \
    --exclude '.env' \
    --exclude 'dev/' \
    --exclude 'backend/static/uploads/' \
    --exclude '.DS_Store' \
    --exclude 'node_modules' \
    "${LOCAL_PATH}/" "${SERVER}:${REMOTE_PATH}/" | tail -20

echo ""
echo -e "${YELLOW}This will sync the following directories:${NC}"
echo "  - backend/    (Rust source, templates, static files)"
echo "  - scripts/    (Python migration scripts)"
echo "  - content/    (Blog content)"
echo "  - docker-compose files"
echo "  - Configuration files"
echo ""

# Ask for confirmation
read -p "Do you want to proceed with the upload? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Upload cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${GREEN}Starting upload...${NC}"

# Perform the actual sync
rsync -avz --delete --progress \
    --exclude '.git' \
    --exclude 'target' \
    --exclude '.venv' \
    --exclude '__pycache__' \
    --exclude '*.pyc' \
    --exclude '.env' \
    --exclude 'dev/' \
    --exclude 'backend/static/uploads/' \
    --exclude '.DS_Store' \
    --exclude 'node_modules' \
    "${LOCAL_PATH}/" "${SERVER}:${REMOTE_PATH}/"

echo ""
echo -e "${GREEN}✓ Upload completed successfully!${NC}"
echo ""

# Show next steps
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Next Steps on Server:${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo "1. SSH into the server:"
echo -e "   ${YELLOW}ssh ${SERVER}${NC}"
echo ""
echo "2. Navigate to the project directory:"
echo -e "   ${YELLOW}cd ${REMOTE_PATH}${NC}"
echo ""
echo "3. Copy and configure environment file:"
echo -e "   ${YELLOW}cp .env.production .env${NC}"
echo -e "   ${YELLOW}nano .env  # Edit with your production values${NC}"
echo ""
echo "4. Build and start services:"
echo -e "   ${YELLOW}docker-compose -f docker-compose.prod.yml build${NC}"
echo -e "   ${YELLOW}docker-compose -f docker-compose.prod.yml up -d${NC}"
echo ""
echo "5. Check logs:"
echo -e "   ${YELLOW}docker-compose -f docker-compose.prod.yml logs -f${NC}"
echo ""
echo "6. Import data (if needed):"
echo -e "   ${YELLOW}source .venv/bin/activate${NC}"
echo -e "   ${YELLOW}python scripts/import_supabase_backup.py dev/backup.sql${NC}"
echo ""
echo -e "${GREEN}All done! 🚀${NC}"
