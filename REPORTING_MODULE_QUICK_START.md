# Reporting Module - Quick Start Guide

## Setup & Testing (5 Minutes)

### 1. Database Setup (Backend)
```bash
cd polwel-backend
npm run db:permissions:upsert
```
**Expected Output:** "✅ Upserted 41 permissions"

### 2. Start Backend Server
```bash
cd polwel-backend
npm run dev
```
**Expected:** Server running on http://localhost:3001

### 3. Start Frontend Server
```bash
cd polwel  # root directory
npm run dev
```
**Expected:** Frontend running on http://localhost:5173

### 4. Grant Permissions
1. Login to application (e.g., john@polwel.com / Password123!)
2. Navigate to **POLWEL Users** menu
3. Click **Edit** on admin user
4. Scroll to **Reporting** module
5. Check ✓ **View** permission
6. Click **Save**
7. **Logout and Login again** (to refresh permissions)

### 5. Access Reporting Module
1. Click **Reporting** in sidebar (should now be visible)
2. You'll see 6 report cards
3. Click any card to view detailed report
4. Test filters, search, pagination
5. Click "Export to Excel" to download data
6. Click "View" button on any row to see detailed popup

---

## Reporting Pages

### Main Dashboard
**URL:** `/reporting`
- 6 report cards linking to detailed pages

### Board Report
**URL:** `/reporting/board-report`
- Quarterly performance summary (Q1, Q2, Q3, Q4)
- Year selector
- Aggregated metrics per quarter

### Runs by Organisation
**URL:** `/reporting/runs-by-organisation`
- Filter by organization, status
- Search by run code or course name
- Pagination

### Runs by Trainer
**URL:** `/reporting/runs-by-trainer`
- Filter by trainer, status
- Search functionality
- Shows multiple trainers per run

### Runs by Status
**URL:** `/reporting/runs-by-status`
- Filter by status, organization
- Status badges with color coding
- Search and pagination

### Runs by Period
**URL:** `/reporting/runs-by-period`
- Filter by year, month, status
- Date-based filtering
- Defaults to current year

### Runs by Venue
**URL:** `/reporting/runs-by-venue`
- Filter by venue, status
- Capacity utilization calculation
- Color-coded utilization badges

---

## Testing Checklist

### Quick Smoke Test (2 minutes):
- [ ] Login successful
- [ ] "Reporting" menu appears in sidebar
- [ ] Click Reporting → 6 cards displayed
- [ ] Click "Board Report" → table loads
- [ ] Click "View" on a run → popup opens
- [ ] Close popup → returns to table
- [ ] Click "Export to Excel" → file downloads
- [ ] Back to main → click "Runs by Organisation" → filters work

### Full Test (10 minutes):
- [ ] Test all 6 report detail pages
- [ ] Test search on each page
- [ ] Test filters on each page
- [ ] Test pagination (Next/Previous)
- [ ] Test "View Details" popup on each page
- [ ] Test Excel export on each page
- [ ] Test without permission (menu should hide)
- [ ] Test responsive design (resize browser)

---

## API Endpoints Reference

```
GET /api/reporting/board-report?year=2024
GET /api/reporting/runs-by-organisation?page=1&limit=20&organization={id}&status={status}
GET /api/reporting/runs-by-trainer?page=1&limit=20&trainer={id}&status={status}
GET /api/reporting/runs-by-status?page=1&limit=20&status={status}&organization={id}
GET /api/reporting/runs-by-period?page=1&limit=20&year=2024&month=1&status={status}
GET /api/reporting/runs-by-venue?page=1&limit=20&venue={id}&status={status}
GET /api/reporting/run-details/{runId}
GET /api/reporting/filter-options
```

All endpoints require `Authorization: Bearer {token}` header.

---

## Permissions

| Permission | Description | Required For |
|------------|-------------|--------------|
| `reporting.view` | View reports | Menu access + all pages |
| `reporting.create` | Create reports | Future feature |
| `reporting.edit` | Edit reports | Future feature |
| `reporting.delete` | Delete reports | Future feature |

Currently only `reporting.view` is actively used. Others reserved for future enhancements.

---

## Troubleshooting

### Menu Not Showing
**Problem:** "Reporting" menu item not visible  
**Solution:**
1. Check user has `reporting.view` permission
2. Logout and login again to refresh permissions
3. Check browser console for CASL errors

### 404 Errors on API
**Problem:** GET /api/reporting/* returns 404  
**Solution:**
1. Check backend is running
2. Verify backend URL in .env: `VITE_API_URL=http://localhost:3001/api`
3. Check backend logs for errors
4. Verify routes registered in polwel-backend/src/index.ts

### Empty Data
**Problem:** Reports show "No data available"  
**Solution:**
1. Create test course runs in database
2. Ensure course runs have required relationships (course, venue, organization)
3. Check browser console network tab for API errors
4. Verify filters are not too restrictive

### Excel Export Not Working
**Problem:** "Export to Excel" button doesn't download file  
**Solution:**
1. Check browser console for errors
2. Verify `xlsx` package installed: `npm list xlsx`
3. Check browser allows downloads (not blocking pop-ups)
4. Try different browser

### Permission Denied
**Problem:** 403 Forbidden error when accessing reports  
**Solution:**
1. Verify token in localStorage: `polwel_access_token`
2. Check token not expired (logout/login)
3. Verify user has `reporting.view` permission in database
4. Check backend logs for authentication errors

---

## Production Deployment

### Pre-deployment Checklist:
- [ ] Run `npm run db:permissions:upsert` on production database
- [ ] Test backend API endpoints with production data
- [ ] Run `npm run build` - should complete without errors
- [ ] Configure CORS for production domain
- [ ] Set production `VITE_API_URL` in .env
- [ ] Test permission system with multiple users
- [ ] Backup database before deployment
- [ ] Test Excel export with large datasets

### Environment Variables:
```env
# Frontend (.env)
VITE_API_URL=https://api.yoursite.com/api

# Backend (.env)
DATABASE_URL=mysql://user:password@host:3306/polwel_production
JWT_SECRET=your-production-secret-key
CORS_ORIGIN=https://yoursite.com
```

---

## Support

**Documentation:** See `REPORTING_MODULE_IMPLEMENTATION_COMPLETE.md` for full technical details

**Common Commands:**
```bash
# Backend
cd polwel-backend
npm run dev              # Start backend dev server
npm run db:permissions:upsert  # Seed permissions
npm run build            # Build for production
npm start                # Start production server

# Frontend
cd polwel
npm run dev              # Start frontend dev server
npm run build            # Build for production
npm run preview          # Preview production build
```

---

**Version:** 1.0  
**Last Updated:** December 2024  
**Status:** ✅ Production Ready
