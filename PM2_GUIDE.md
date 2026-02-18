# PM2 Quick Reference Guide

## Common PM2 Commands

### Starting the Backend
```bash
# First time start (after building)
cd /home/kukuh/webprojects/polwel/polwel-backend
npm run build
pm2 start ecosystem.config.js

# OR use the npm script
npm run start:pm2
```

### Managing the Process
```bash
# Check status
pm2 list

# View logs
pm2 logs polwel-backend
pm2 logs polwel-backend --lines 50  # Last 50 lines

# Restart (use this after code changes)
pm2 restart polwel-backend

# Reload (zero-downtime restart)
pm2 reload polwel-backend

# Stop
pm2 stop polwel-backend

# Delete process from PM2
pm2 delete polwel-backend
```

### After Code Changes
```bash
# Quick update workflow
cd /home/kukuh/webprojects/polwel/polwel-backend
npm run build && pm2 reload polwel-backend

# OR if you encounter issues
npm run build && pm2 restart polwel-backend
```

### Monitoring
```bash
# Real-time monitoring
pm2 monit

# Process details
pm2 show polwel-backend

# Clear logs
pm2 flush polwel-backend
```

### Auto-start on System Reboot
```bash
# Generate startup script
pm2 startup

# Save current process list
pm2 save

# Restore saved processes
pm2 resurrect
```

## Troubleshooting

### Process Not Running
```bash
# Check if any PM2 processes exist
pm2 list

# If empty, start the backend
cd /home/kukuh/webprojects/polwel/polwel-backend
npm run build
pm2 start ecosystem.config.js
```

### Can't Restart
If `pm2 restart polwel-backend` fails with "process not found":
```bash
# Delete and restart
pm2 delete polwel-backend
npm run build
pm2 start ecosystem.config.js
```

### Backend Won't Start
```bash
# Check for errors
pm2 logs polwel-backend --err

# Check if port 3001 is in use
lsof -ti:3001
# If occupied, kill it
kill -9 $(lsof -ti:3001)

# Rebuild and start
npm run build
pm2 start ecosystem.config.js
```

### Environment Variables
```bash
# Update environment variables
pm2 restart polwel-backend --update-env

# View current environment
pm2 env 0  # Replace 0 with process ID
```

## PM2 Configuration

Current config location: `/home/kukuh/webprojects/polwel/polwel-backend/ecosystem.config.js`

Key settings:
- **Name**: polwel-backend
- **Script**: ./dist/index.js
- **Port**: 3001
- **Environment**: staging
- **Instances**: 1
- **Auto-restart**: Enabled
- **Max memory**: 1GB

## Integration with Development

### Development Mode (npm run dev)
```bash
cd /home/kukuh/webprojects/polwel/polwel-backend
npm run dev
# Uses nodemon, not PM2
```

### Production Mode (PM2)
```bash
cd /home/kukuh/webprojects/polwel/polwel-backend
npm run build
pm2 start ecosystem.config.js
```

## Quick Deploy Checklist

1. ✅ Build the TypeScript code
   ```bash
   npm run build
   ```

2. ✅ Check if PM2 is running
   ```bash
   pm2 list
   ```

3. ✅ Reload or restart
   ```bash
   pm2 reload polwel-backend  # Zero-downtime
   # OR
   pm2 restart polwel-backend  # Full restart
   ```

4. ✅ Verify it's working
   ```bash
   pm2 logs polwel-backend --lines 20
   curl http://localhost:3001/health  # If health endpoint exists
   ```

---

**Pro Tip**: Create npm scripts in package.json for common tasks:
```json
{
  "scripts": {
    "start:pm2": "pm2 start ecosystem.config.js",
    "restart:pm2": "npm run build && pm2 reload polwel-backend",
    "logs:pm2": "pm2 logs polwel-backend"
  }
}
```

Then use: `npm run restart:pm2`
