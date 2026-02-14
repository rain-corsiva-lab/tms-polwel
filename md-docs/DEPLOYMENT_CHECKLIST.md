# Deployment Checklist for Staging/Production

## ✅ Pre-Deployment Verification

### 1. Permission System
- [x] Backend permission mappings updated with `resource-library` and `waiver`
- [x] Frontend `EditPolwelUserDialog.tsx` has correct `moduleMapping`
- [x] Database migration script `upsertMissingPermissions.ts` uses correct format
- [x] All permissions use hyphens in module names (e.g., `resource-library.view`, not `resource.library.view`)
- [x] Permission refresh system working without logout/login

### 2. File Upload System
- [x] Backend `/api/uploads/media/upload` endpoint created
- [x] Frontend uses correct `VITE_API_URL` environment variable
- [x] Upload directory `/uploads/resource-library` created
- [x] File size limit: 50MB for PDFs
- [x] Only PDF files allowed for Resource Library

### 3. Resource Library Module
- [x] Database schema includes ResourceLibrary model
- [x] Backend API endpoints (6 endpoints: list, get, create, update, delete, publish)
- [x] Frontend component with upload form and data table
- [x] Permission-based UI rendering
- [x] Soft delete functionality

---

## 🚀 Deployment Steps

### Step 1: Database Migration (Run on staging/production)

```bash
# Connect to staging/production server
ssh your-server

# Navigate to backend directory
cd /path/to/polwel-backend

# Run permission migration
npm run db:permissions:upsert

# Expected output:
# 🔧 Syncing permissions...
# 🗑️ Removing obsolete permissions: [...]
# ✅ Upserted 41 permissions.
```

### Step 2: Verify Permissions in Database

```bash
# Run verification script
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  const resourcePerms = await prisma.permission.findMany({
    where: { name: { startsWith: 'resource' } }
  });
  
  const waiverPerms = await prisma.permission.findMany({
    where: { name: { startsWith: 'waiver' } }
  });
  
  console.log('Resource Library Permissions:');
  resourcePerms.forEach(p => console.log('  ✓', p.name));
  
  console.log('\nWaiver Permissions:');
  waiverPerms.forEach(p => console.log('  ✓', p.name));
  
  // Check for malformed permissions
  const badPerms = await prisma.permission.findMany({
    where: { 
      OR: [
        { name: { contains: 'resource.library' } },
        { name: { contains: 'post.course.run' } }
      ]
    }
  });
  
  if (badPerms.length > 0) {
    console.log('\n❌ Found malformed permissions:');
    badPerms.forEach(p => console.log('  !', p.name));
  } else {
    console.log('\n✅ No malformed permissions found');
  }
  
  await prisma.\$disconnect();
}

verify();
"
```

### Step 3: Grant Permissions to Admin Users

```bash
# Run the grant script for each admin user
npm run db:seed:grant-kukuh  # Or your admin username

# Expected output:
# 🔧 Granting all permissions to user: kukuh@polwel.org
# ✅ Granted 41 permissions
```

### Step 4: Create Upload Directories

```bash
# Ensure upload directories exist with correct permissions
mkdir -p uploads/resource-library
mkdir -p uploads/email-attachments
chmod 755 uploads/resource-library
chmod 755 uploads/email-attachments
```

### Step 5: Deploy Backend

```bash
# Build backend
npm run build

# Restart PM2 or your process manager
pm2 restart polwel-backend

# Verify server is running
curl http://localhost:3001/health
```

### Step 6: Deploy Frontend

```bash
# Navigate to frontend directory
cd /path/to/polwel-frontend

# Update environment variables for production
cat > .env <<EOF
VITE_API_URL=https://your-domain.com/api
VITE_API_TIMEOUT=15000
EOF

# Build frontend
npm run build

# Copy dist/ to your web server
# (Apache, Nginx, etc.)
```

### Step 7: Verify Deployment

**Test Checklist:**

1. **Login** as admin user
2. **Go to POLWEL Users** → Edit a user
3. **Verify** all permission checkboxes display correctly (including Resource Library)
4. **Check/uncheck** some permissions → Save
5. **Reopen** same user → Verify checkboxes persist
6. **Go to Resource Library** page
7. **Upload** a PDF file → Should succeed
8. **Verify** file appears in list
9. **Download** the file → Should work
10. **Edit** the resource → Should work
11. **Delete** the resource → Should soft delete (not appear in list)

---

## 🔧 Configuration Files

### Backend `.env` (Production)
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=mysql://user:pass@host:port/dbname
FRONTEND_URL=https://your-domain.com
CORS_ORIGINS=https://your-domain.com
JWT_SECRET=your-production-secret
JWT_EXPIRES_IN=24h
```

### Frontend `.env` (Production)
```env
VITE_API_URL=https://your-domain.com/api
VITE_API_TIMEOUT=15000
```

---

## 🐛 Troubleshooting

### Issue: "File upload failed" 404 error

**Cause:** Frontend using `VITE_API_BASE_URL` instead of `VITE_API_URL`

**Solution:**
1. Check `.env` file has `VITE_API_URL` (not `VITE_API_BASE_URL`)
2. Rebuild frontend: `npm run build`

### Issue: Resource Library checkboxes not persisting

**Cause:** Database has malformed `resource.library.*` permissions (with dots instead of hyphens)

**Solution:**
```bash
cd polwel-backend
node fix-resource-library-permissions.js
```

### Issue: Permissions require logout/login to take effect

**Cause:** Frontend not calling `refreshUser()` after permission changes

**Solution:** Already fixed in `EditPolwelUserDialog.tsx` - ensure you're using latest code

### Issue: Upload directory not writable

**Cause:** Incorrect permissions on uploads folder

**Solution:**
```bash
chmod 755 uploads
chmod 755 uploads/resource-library
chown www-data:www-data uploads -R  # Adjust user/group for your server
```

---

## 📋 Database Schema Changes

The following tables/fields are used by the Resource Library:

### ResourceLibrary Table
- `id` - Primary key
- `title` - Resource title
- `description` - Rich text description (optional)
- `fileName` - Original filename
- `fileUrl` - URL path to file
- `fileSize` - File size in bytes
- `mimeType` - application/pdf
- `status` - DRAFT | PUBLISHED | DELETED
- `targetAudience` - TRAINING_COORDINATORS | ALL_USERS
- `uploadedBy` - FK to User
- `createdAt` - Timestamp
- `updatedAt` - Timestamp
- `publishedAt` - Timestamp (nullable)

### Permission Table (New Entries)
- `resource-library.view`
- `resource-library.create`
- `resource-library.edit`
- `resource-library.delete`
- `waiver.view`
- `waiver.create`
- `waiver.edit`
- `waiver.delete`

---

## ✅ Success Criteria

- [ ] All 41 permissions in database (no duplicates, correct format)
- [ ] Admin users can see all permission checkboxes in Edit User dialog
- [ ] Resource Library menu item visible to users with `resource-library.view`
- [ ] Upload form visible to users with `resource-library.create`
- [ ] File uploads succeed (PDFs only, up to 50MB)
- [ ] Downloaded files open correctly
- [ ] Permission changes apply immediately without logout
- [ ] No console errors in browser
- [ ] Backend logs show no errors

---

## 📞 Support

If issues persist after following this checklist:
1. Check backend logs: `pm2 logs polwel-backend`
2. Check browser console for errors
3. Verify database connection
4. Ensure all migrations ran successfully
5. Test with a fresh browser session (clear cache)
