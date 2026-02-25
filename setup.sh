#!/bin/bash
# ============================================================
# Homeschool Hub — Oracle Cloud Ubuntu Setup & Deploy Script
# Run this from the project root directory
# ============================================================

set -e  # Exit on error

echo ""
echo "🏫 Homeschool Hub — Setup Script"
echo "================================="
echo ""

# ---- Step 1: Install PM2 globally ----
echo "📦 Installing PM2..."
npm install -g pm2

# ---- Step 2: Install Nginx ----
echo "📦 Installing Nginx..."
sudo apt-get update -qq
sudo apt-get install -y nginx

# ---- Step 3: Backend dependencies ----
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# ---- Step 4: Frontend dependencies & build ----
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
echo "🔨 Building frontend..."
npm run build
cd ..

# ---- Step 5: Create data & log directories ----
echo "📁 Creating data directories..."
mkdir -p data logs

# ---- Step 6: Configure Nginx ----
echo "🌐 Configuring Nginx..."
# Replace YOUR_SERVER_IP with actual IP
DETECTED_IP=$(curl -s ifconfig.me 2>/dev/null || echo "localhost")
sed "s/YOUR_SERVER_IP_OR_DOMAIN/$DETECTED_IP/g" nginx.conf > /tmp/homeschool-nginx.conf
sudo cp /tmp/homeschool-nginx.conf /etc/nginx/sites-available/homeschool
sudo ln -sf /etc/nginx/sites-available/homeschool /etc/nginx/sites-enabled/homeschool
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
sudo systemctl enable nginx

# ---- Step 7: Start app with PM2 ----
echo "🚀 Starting app with PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup | tail -1 | sudo bash || true

echo ""
echo "✅ Setup complete!"
echo ""
echo "🌍 Your app is running at: http://$DETECTED_IP"
echo "🔐 Default login: admin / admin123  (CHANGE THIS AFTER FIRST LOGIN)"
echo ""
echo "📋 Useful commands:"
echo "  pm2 logs homeschool-hub    # View live logs"
echo "  pm2 restart homeschool-hub # Restart app"
echo "  pm2 status                 # Check status"
echo ""
