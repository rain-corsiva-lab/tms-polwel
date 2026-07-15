#!/bin/bash
# Script to immediately unblock all IPs by restarting the backend PM2 process and updating the environment variables

echo "🔄 Restarting PM2 process to clear rate limits and unblock all IPs..."

# Try to find PM2 path or use global command
PM2_PATH=$(which pm2 2>/dev/null || echo "pm2")

if $PM2_PATH restart polwel-backend --update-env; then
  echo "✅ PM2 process restarted successfully. All IPs are now unblocked!"
else
  echo "❌ Failed to restart PM2 process 'polwel-backend'. Please check your PM2 process name."
fi
