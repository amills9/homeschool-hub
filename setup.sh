#!/bin/bash
# ============================================================
# Homeschool Hub — Oracle Cloud Ubuntu Setup & Deploy Script
# Run this from the project root directory:
#   cd ~/homeschool-hub && chmod +x setup.sh && ./setup.sh
# ============================================================
set -e  # Exit on error

echo ""
echo "🏫 Homeschool Hub — Setup Script"
echo "================================="
echo ""

# ---- Verify we're in the right directory ----
if [ ! -f "backend/src/index.js" ]; then
  echo "❌ ERROR: Run this script from the homeschool-hub project root!"
  echo "   cd ~/homeschool-hub && ./setup.sh"
  exit 1
fi

# ---- Step 1: System update & install Node.js ----
echo "📦 Updating system and installing Node.js..."
sudo apt-get update -qq
sudo apt-get upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git
echo "✅ Node.js $(node -v) ready"

# ---- Step 2: Add swap space (critical for 1GB RAM instances) ----
if [ ! -f /swapfile ]; then
  echo "💾 Adding swap space (required for low RAM instances)..."
  sudo fallocate -l 1G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  echo "✅ 1GB swap file created"
else
  echo "✅ Swap already exists, skipping"
fi

# ---- Step 3: Install PM2 globally ----
echo "📦 Installing PM2..."
sudo npm install -g pm2
echo "✅ PM2 installed"

# ---- Step 4: Install Nginx ----
echo "📦 Installing Nginx..."
sudo apt-get install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
echo "✅ Nginx installed"

# ---- Step 5: Backend dependencies ----
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..
echo "✅ Backend dependencies installed"

# ---- Step 6: Frontend dependencies & build ----
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
echo "🔨 Building frontend..."
npm run build
cd ..
echo "✅ Frontend built"

# ---- Step 7: Create data & log directories ----
echo "📁 Creating data directories..."
mkdir -p data logs
echo "✅ Directories created"

# ---- Step 8: Generate a secure JWT secret ----
echo "🔐 Generating secure JWT secret..."
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Update ecosystem.config.js with the real JWT secret and correct path
PROJECT_DIR=$(pwd)
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'homeschool-hub',
    script: './backend/src/index.js',
    cwd: '${PROJECT_DIR}',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      JWT_SECRET: '${JWT_SECRET}',
      DB_PATH: '${PROJECT_DIR}/data/homeschool.db',
    },
    watch: false,
    max_memory_restart: '300M',
    log_file: '${PROJECT_DIR}/logs/app.log',
    error_file: '${PROJECT_DIR}/logs/error.log',
    time: true,
  }]
};
EOF
echo "✅ ecosystem.config.js updated with secure settings"

# ---- Step 9: Configure Nginx ----
echo "🌐 Configuring Nginx..."
DETECTED_IP=$(curl -s ifconfig.me 2>/dev/null || echo "localhost")
sed "s/YOUR_SERVER_IP_OR_DOMAIN/$DETECTED_IP/g" nginx.conf > /tmp/homeschool-nginx.conf
sudo cp /tmp/homeschool-nginx.conf /etc/nginx/sites-available/homeschool
sudo ln -sf /etc/nginx/sites-available/homeschool /etc/nginx/sites-enabled/homeschool
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
echo "✅ Nginx configured"

# ---- Step 10: Configure Ubuntu firewall ----
echo "🔒 Configuring firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw --force enable
echo "✅ Firewall configured"

# ---- Step 11: Start app with PM2 ----
echo "🚀 Starting app with PM2..."
pm2 start ecosystem.config.js
pm2 save
PM2_CMD=$(pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -1)
sudo $PM2_CMD 2>/dev/null || true
pm2 save

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
echo "  sudo systemctl status nginx # Check Nginx"
echo ""