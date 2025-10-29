#!/bin/bash
set -e

echo "🚀 Setting up Playwright Hedgehog Bots on Ubuntu..."

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Playwright + dependencies
npx playwright install --with-deps chromium

# Install SQLite
sudo apt-get install -y sqlite3

# Install npm dependencies
npm install

# Initialize database
npm run db:init

echo "✅ Setup complete! Edit .env file with your configuration."
echo "Then run: sudo systemctl start hedgehog-bots"
