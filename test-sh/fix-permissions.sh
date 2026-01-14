#!/bin/bash

# Permanent fix for Vite permission errors in polwel project
# This script should be run once to fix permission issues

PROJECT_DIR="/media/kukuh/7aa48e4a-0345-4928-bb19-a622aa1561691/webprojects/polwel"

echo "🔧 Fixing polwel project permissions..."

# 1. Fix ownership of entire project
echo "1. Fixing directory ownership..."
sudo chown -R $(whoami):$(whoami) "$PROJECT_DIR"

# 2. Clean Vite cache
echo "2. Cleaning Vite cache..."
rm -rf "$PROJECT_DIR/node_modules/.vite"

# 3. Clean npm cache
echo "3. Cleaning npm cache..."
npm cache clean --force

# 4. Reinstall dependencies with correct permissions
echo "4. Reinstalling dependencies..."
cd "$PROJECT_DIR"
npm install

# 5. Fix permissions on node_modules specifically
echo "5. Final permission fix on node_modules..."
chmod -R u+rwX,g+rX,o+rX "$PROJECT_DIR/node_modules"

echo "✅ All fixes applied successfully!"
echo ""
echo "You can now run: npm run dev"
