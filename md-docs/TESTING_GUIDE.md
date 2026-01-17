# Testing Guide - POLWEL Updates

## Quick Start

### 1. Start Services
```bash
# Terminal 1: Start Backend
cd /home/kukuh/webprojects/polwel/polwel-backend
npm run dev

# Terminal 2: Start Frontend  
cd /home/kukuh/webprojects/polwel
npm run dev
```

Access at: `http://localhost:8080`

---

## Test 1: Email Attachment Upload

### Scenario: Send Course Confirmation Email with PDF

**Steps:**
1. Login as POLWEL admin
2. Navigate to **Course Runs**
3. Find a course run in `CONFIRMED_PENDING_CONFIRMATION_EMAILS` status
4. Click **"Send Course Confirmation Email"** button
5. In the dialog:
   - Enter CC email: (optional)
   - Enter additional message: (optional)
   - **Click "Attach File"**
   - Select any PDF or image file
   - Click **"Send Email"**

**Expected Results:**
- ✅ File uploads successfully
- ✅ Dialog shows file name
- ✅ Email sends to all learners
- ✅ Success toast notification appears
- ✅ No 404 errors in console

**Verify in Browser Console:**
```
POST /api/uploads/email-attachments - 200 OK
POST /api/course-runs/{id}/send-course-confirmation-email - 200 OK
```

---

## Test 2: Trainer Assignment Email with Attachment

### Scenario: Send Trainer Assignment Email with Document

**Steps:**
1. Login as POLWEL admin
2. Navigate to **Course Runs**
3. Find a course run in `CONFIRMED_PENDING_TA_APPROVAL` status
4. Click **"Send Training Assignment Email"** (after approving trainer)
5. In the dialog:
   - **Click "Attach File"**
   - Select Word or Excel file
   - (Optional) Add CC emails
   - Click **"Send Email"**

**Expected Results:**
- ✅ File uploads successfully
- ✅ Email sent to all trainers
- ✅ Success message appears
- ✅ File attachment visible in trainer's email

---

## Test 3: Calendar Date Selection

### Scenario: Test Single Date vs Date Range

**Navigate to:** Home Dashboard > Upcoming Runs section

### Test 3a: Single Date Selection
**Steps:**
1. Click on **Calendar**
2. Click **single date** (e.g., December 15)
3. Observe the table

**Expected Result:**
- ✅ Shows courses from **December 16** to **January 14** (30-day window)
- ✅ NOT just December 15

**Verify:** Table title should show the date range

### Test 3b: Date Range Selection
**Steps:**
1. Click **start date** (e.g., December 10)
2. Click **end date** (e.g., December 20)
3. Observe the table

**Expected Result:**
- ✅ Shows courses only in December 10-20 range
- ✅ No expansion to ±1 day

---

## Test 4: Styling & Colors

### Font Check
1. Open **DevTools** (F12)
2. Inspect any text element
3. Check **Computed Styles**

**Expected Result:**
```
font-family: 'Mulish', -apple-system, BlinkMacSystemFont, ...
```

### Color Check
1. Click on any **link** (e.g., "View Details")
2. Should be **Orange (#F7941D)**
3. On hover: should darken to **#d87a16**

### Sidebar Check
1. Open sidebar (if visible)
2. Should be **Navy (#001A45)**
3. Accents should be **Orange (#F7941D)**

### Page Title
1. Check browser tab title
2. Should read: **"POLWEL Training Management System"**

---

## Test 5: Error Scenarios

### Scenario 1: Upload File Without Authentication
**Steps:**
1. Open browser DevTools > Console
2. Run: `fetch('/api/uploads/email-attachments', {method: 'POST'})`

**Expected Result:**
- ✅ 401 Unauthorized error
- ✅ NOT 404

### Scenario 2: Upload File Exceeding 10MB
**Steps:**
1. Try to attach a file larger than 10MB
2. Observe dialog

**Expected Result:**
- ✅ Error toast: "File size must be less than 10MB"
- ✅ File not selected

### Scenario 3: Invalid File Type
**Steps:**
1. Try to attach a `.exe` or `.zip` file
2. Attempt to upload

**Expected Result:**
- ✅ Error from backend
- ✅ Message: "File type not allowed"

---

## Test 6: Database Verification

### Check File Upload Records
```sql
-- Connect to your database
SELECT id, originalName, filename, mimeType, size, createdAt 
FROM media 
WHERE category = 'EMAIL_ATTACHMENT' 
ORDER BY createdAt DESC LIMIT 10;
```

**Expected Result:**
- ✅ Records show uploaded files
- ✅ `path` contains absolute file system path
- ✅ `filename` is UUID-based (e.g., `a1b2c3d4-1234567890.pdf`)

### Check Confirmation Email History
```sql
SELECT courseRunLearnersId, courseRunId, remarks, attachmentId, createdAt
FROM confirmationEmailHistory
WHERE attachmentId IS NOT NULL
ORDER BY createdAt DESC LIMIT 10;
```

**Expected Result:**
- ✅ Records show sent emails with attachments
- ✅ `attachmentId` references valid media records

---

## Test 7: Email Reception (If Email Configured)

### Manual Test with Real Email
**Steps:**
1. Configure real SMTP in `.env`
2. Send test email with attachment
3. Check inbox

**Expected Result:**
- ✅ Email received
- ✅ Attachment appears as downloadable file
- ✅ Email content displays correctly
- ✅ Links are Orange color

---

## Test 8: Browser Console Checks

### Check for Errors
1. Open DevTools (F12)
2. Go to **Console** tab
3. Perform all above tests

**Expected Result:**
- ✅ No red errors
- ✅ Only yellow warnings (non-critical)
- ✅ Auth header logged: `Authorization: Bearer ...`
- ✅ File upload logged: `Upload successful: {fileId}`

### Check Network Tab
1. Go to **Network** tab
2. Perform file upload
3. Look for `/api/uploads/email-attachments` request

**Expected Result:**
```
Method: POST
Status: 200 OK
Headers Include:
  - Authorization: Bearer {token}
  - Content-Type: multipart/form-data
Response:
  {
    "success": true,
    "fileId": "...",
    "path": "..."
  }
```

---

## Test 9: Responsive Design

### Mobile View
1. Open DevTools (F12)
2. Click **Toggle Device Toolbar** (Ctrl+Shift+M)
3. Select iPhone SE / Mobile device
4. Test all features

**Expected Result:**
- ✅ Calendar responsive
- ✅ Email dialog responsive
- ✅ File input works
- ✅ Colors consistent

---

## Rollback Procedure (If Issues Found)

### If Email Attachments Not Working:
```bash
cd /home/kukuh/webprojects/polwel

# Remove uploads route from index.ts
# Remove attachment logic from CourseRuns.tsx
# Rebuild
npm run build
```

### If Styling Issues:
```bash
# Clear cache
rm -rf dist node_modules/.cache
npm run build
# Hard refresh browser: Ctrl+Shift+R
```

### If Calendar Issues:
```javascript
// In browser console, check localStorage
localStorage.getItem('courseRuns_sortBy')
// Should show current sort settings
```

---

## Performance Checks

### Check Build Size
```bash
npm run build
# Look at dist/ size - should be ~3.3MB gzipped
```

### Check Load Time
1. Open DevTools > Performance tab
2. Reload page
3. Check metrics:
   - First Contentful Paint: < 2s
   - Largest Contentful Paint: < 3s

---

## Accessibility Tests

### Keyboard Navigation
1. Press **Tab** to navigate all interactive elements
2. Test email dialog with keyboard only
3. Test calendar with keyboard

**Expected Result:**
- ✅ All buttons/inputs reachable
- ✅ Focus indicators visible (Orange outline)
- ✅ Enter key submits forms

### Screen Reader Test
1. Use VoiceOver (Mac) or NVDA (Windows)
2. Navigate page
3. Verify buttons/labels read correctly

---

## Final Checklist

- [ ] Email attachments upload successfully
- [ ] Calendar single date logic works (+1 to +30)
- [ ] Calendar date range logic works (as-is)
- [ ] All links are Orange color
- [ ] Font is Mulish
- [ ] Sidebar is Navy
- [ ] Page title correct
- [ ] No console errors
- [ ] No 404 errors
- [ ] Emails received with attachments
- [ ] Database records created
- [ ] Mobile responsive
- [ ] Keyboard accessible
- [ ] Build successful
- [ ] No breaking changes

---

## Contact & Support

If any test fails:
1. Check browser console for errors
2. Check backend logs: `pm2 logs polwel-backend-local`
3. Verify file exists: `ls -la uploads/email-attachments/`
4. Check `.env` configuration
5. Verify database connection

---

**All tests passing? 🎉 Ready for deployment!**
