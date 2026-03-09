#!/bin/bash
# ============================================================
# Homeschool Hub — Update Script
# Run from ~/homeschool-hub after pulling latest code
# Usage: chmod +x update.sh && ./update.sh
# ============================================================
set -e

echo ""
echo "🔄 Homeschool Hub — Applying Updates"
echo "====================================="
echo ""

# Verify we're in the right place
if [ ! -f "backend/src/index.js" ]; then
  echo "❌ ERROR: Run this script from the homeschool-hub project root!"
  exit 1
fi

# Pull latest from GitHub
echo "📥 Pulling latest code from GitHub..."
git pull origin main
echo "✅ Code updated"

# Rebuild frontend
echo "🔨 Rebuilding frontend..."
cd frontend
npm install
npm run build
cd ..
echo "✅ Frontend rebuilt"

# Install any new backend dependencies
echo "📦 Checking backend dependencies..."
cd backend
npm install
cd ..
echo "✅ Backend dependencies up to date"

# Restart app
echo "🚀 Restarting app..."
pm2 restart homeschool-hub
pm2 save

echo ""
echo "✅ Update complete!"
echo "🌍 App is live and running"
echo ""
pm2 status
