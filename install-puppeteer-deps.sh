#!/bin/bash
set -e

echo "🔍 Detecting OS packaging system..."
if command -v apt-get &> /dev/null; then
  echo "📦 Debian/Ubuntu detected. Installing Chromium shared libraries..."
  sudo apt-get update -y
  sudo apt-get install -y ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils
elif command -v yum &> /dev/null; then
  echo "📦 CentOS/RHEL detected. Installing Chromium shared libraries..."
  sudo yum install -y alsa-lib atk cups-libs gtk3 libXcomposite libXcursor libXdamage libXext libXi libXrandr libXrender libXtst libXxf86vm pango libdrm libgbm
elif command -v dnf &> /dev/null; then
  echo "📦 CentOS/RHEL/Fedora detected. Installing Chromium shared libraries..."
  sudo dnf install -y alsa-lib atk cups-libs gtk3 libXcomposite libXcursor libXdamage libXext libXi libXrandr libXrender libXtst libXxf86vm pango libdrm libgbm
else
  echo "⚠️  Unsupported package manager. Please install Chromium dependencies manually."
fi
echo "✅ Shared libraries installation checked/completed!"
