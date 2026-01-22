# Port 3001 Issue - RESOLVED ✅

## Problem
Backend couldn't start because port 3001 was already in use by a stuck ts-node process.

## Root Cause
Previous backend instance didn't terminate properly, leaving a zombie process holding port 3001.

## Solution Applied

### 1. ✅ Killed Stuck Process
```bash
# Identified process using port 3001
PID 17195 - node ts-node src/index.ts

# Killed the process
kill -9 17195
```

### 2. ✅ Created Helper Scripts

#### **kill-port.sh** - Kill any process using a specific port
```bash
# Usage examples:
./kill-port.sh 3001    # Kill process on port 3001
./kill-port.sh 8080    # Kill process on port 8080
./kill-port.sh         # Defaults to port 3001
```

#### **start-backend.sh** - Safe backend startup
```bash
# Automatically checks and kills stuck backend processes before starting
./start-backend.sh
```

## How to Use

### Option 1: Use the safe startup script (Recommended)
```bash
cd polwel-backend
./start-backend.sh
```

### Option 2: Manual cleanup when needed
```bash
# If you get "EADDRINUSE" error:
cd polwel-backend
./kill-port.sh 3001
npm run dev
```

### Option 3: Quick one-liner
```bash
# Kill any process on port 3001 and start backend
kill -9 $(lsof -ti :3001) 2>/dev/null; npm run dev
```

## Prevention Tips

1. **Always stop backend properly:**
   - Use `Ctrl+C` in the terminal running the backend
   - Don't close the terminal without stopping the process first

2. **Use the helper script:**
   - Always start with `./start-backend.sh` instead of `npm run dev`
   - It will auto-cleanup if needed

3. **Check running processes:**
   ```bash
   # List all node processes
   ps aux | grep node
   
   # Check what's using port 3001
   lsof -i :3001
   ```

4. **Kill all node processes (nuclear option):**
   ```bash
   # ⚠️ WARNING: Kills ALL node processes including VSCode extensions!
   killall node
   ```

## Quick Commands Reference

```bash
# Check if port 3001 is in use
lsof -i :3001

# Find process ID using port 3001
lsof -ti :3001

# Kill specific process
kill -9 [PID]

# Check all node processes
ps aux | grep node | grep -v grep

# Kill backend processes only
pkill -f "ts-node src/index.ts"
```

## Backend Status

✅ **Port 3001**: Free and available  
✅ **Backend**: Ready to start  
✅ **Helper Scripts**: Created and executable

## Next Steps

Just run the backend normally:
```bash
cd polwel-backend
npm run dev
```

Or use the safe startup script:
```bash
cd polwel-backend
./start-backend.sh
```

---

**Issue Resolved:** January 22, 2026  
**Status:** ✅ Fixed - Backend can now start on port 3001 without errors
