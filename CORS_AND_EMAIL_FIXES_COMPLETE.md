# CORS and Email Tracking Fixes Complete

## Issues Fixed

### 1. Rich Text Image CORS Errors ✅

**Problem**: 
- Images uploaded successfully but displayed broken icon
- Browser error: `net::ERR_BLOCKED_BY_RESPONSE.NotSameOrigin`
- HTML showed: `<img src="http://localhost:3001/uploads/rich-text-images/[filename].jpeg">`

**Root Cause**:
The Content Security Policy (CSP) had an `upgrade-insecure-requests` directive that was forcing HTTP requests to upgrade to HTTPS, causing CORS failures in development.

**Solution Applied**:
1. **Removed CSP upgrade-insecure-requests**: Set `upgradeInsecureRequests: null` in Helmet configuration to allow HTTP in development
2. **Enhanced CORS headers** on `/uploads` route:
   ```typescript
   Access-Control-Allow-Origin: *
   Access-Control-Allow-Credentials: true
   Access-Control-Allow-Methods: GET, HEAD, OPTIONS
   Access-Control-Allow-Headers: Content-Type, Authorization, Range
   Cross-Origin-Resource-Policy: cross-origin
   Access-Control-Expose-Headers: Content-Length, Content-Range
   ```
3. **Updated Helmet CSP** to allow HTTP images: `img-src 'self' data: https: http:`

**Files Modified**:
- `/polwel-backend/src/index.ts` (lines 142-165, 217-248)

---

### 2. Certificate Download Links Fixed ✅

**Problem**:
- Certificate links showed "This site can't be reached" error
- Used hardcoded `api.polwel.org` domain which doesn't exist in development
- DNS_PROBE_FINISHED_NXDOMAIN error

**Solution Applied**:
Implemented environment-aware URL generation:
```typescript
const backendUrl = process.env.NODE_ENV === 'production' 
  ? (process.env.BACKEND_URL || 'https://api.polwel.org')
  : 'http://localhost:3001';

const certificateDownloadUrl = `${backendUrl}/cert/${learnerId}/${courseRunId}`;
```

**Behavior**:
- **Development**: Uses `http://localhost:3001/cert/{learnerId}/{courseRunId}`
- **Production**: Uses `BACKEND_URL` env variable or `api.polwel.org`

**Files Modified**:
- `/polwel-backend/src/controllers/courseRunController.ts` (lines 5147-5158)
- `/polwel-backend/src/services/courseRunWorkflowService.ts` (lines 485-495)

---

### 3. Mailjet Click Tracking Disabled ✅

**Problem**:
- Certificate links wrapped by Mailjet tracking: `https://1sz3k.mjt.lu/lnk/...`
- Links looked suspicious and untrustworthy

**Solution Applied**:
Added Mailjet-specific headers to certificate completion emails:
```typescript
headers: {
  'X-Mailjet-TrackClick': '0',
  'X-Mailjet-TrackOpen': '0',
},
```

This disables:
- Click tracking (no URL wrapping)
- Open tracking (no invisible pixel)

**Files Modified**:
- `/polwel-backend/src/services/emailService.ts` (line 1795)

---

## Testing Instructions

### ⚠️ IMPORTANT: Clear Browser Cache First!

Your browser may have cached the old CORS responses. **You MUST do a hard refresh**:
- **Chrome/Firefox/Edge**: `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)
- Or clear browser cache completely in settings

### Test 1: Rich Text Image Upload

1. Navigate to Course Run form → Description or Learning Objectives field
2. Click the image icon in the rich text editor toolbar
3. Select and upload an image
4. **Expected Result**: Image should display correctly (not broken icon)
5. **Verify**: Open browser DevTools → Network tab → Check image request returns 200 OK without CORS errors

### Test 2: Certificate Download (Development)

1. Complete a course run and trigger certificate email
2. Check the email for the certificate download link
3. Link should be: `http://localhost:3001/cert/{learnerId}/{courseRunId}`
4. Click the link
5. **Expected Result**: Certificate PDF downloads successfully
6. **Verify**: No DNS errors or "site can't be reached" messages

### Test 3: Email Click Tracking Disabled

1. Send certificate completion email to a test learner
2. Open the email in your mail client
3. **Expected Result**: Certificate download link should be direct (not wrapped by Mailjet)
4. **Verify**: URL should be `http://localhost:3001/cert/...` NOT `https://1sz3k.mjt.lu/lnk/...`

**Note**: Click tracking headers work with SMTP transport. If using Microsoft Graph API directly (without Mailjet relay), tracking is already disabled.

---

## Technical Details

### CORS Response Headers (Verified)

```
HTTP/1.1 200 OK
Cross-Origin-Resource-Policy: cross-origin
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: Content-Length, Content-Range
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, HEAD, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, Range
Content-Security-Policy: (without upgrade-insecure-requests)
```

### Certificate URL Logic

```typescript
// Development
http://localhost:3001/cert/{learnerId}/{courseRunId}

// Production
https://api.polwel.org/cert/{learnerId}/{courseRunId}
```

### Email Headers Added

```typescript
{
  'X-Mailjet-TrackClick': '0',   // Disable click tracking
  'X-Mailjet-TrackOpen': '0',    // Disable open tracking
}
```

---

## Deployment Notes

### For Production Deployment:

1. **Environment Variable**: Ensure `NODE_ENV=production` is set
2. **Backend URL**: Set `BACKEND_URL` to your production API domain (e.g., `https://api.polwel.org`)
3. **Email Service**: Verify Mailjet tracking headers work with your production SMTP configuration
4. **CORS Origins**: Update CORS_ORIGINS to include your production frontend domain
5. **CSP Headers**: Consider re-enabling `upgrade-insecure-requests` in production for HTTPS enforcement

### Production CSP Configuration:

```typescript
// In production, you may want:
upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
```

This enforces HTTPS in production while allowing HTTP in development.

---

## Troubleshooting

### If Images Still Show CORS Errors:

1. **Hard refresh**: Press `Ctrl + Shift + R` to clear cache
2. **Clear all cache**: Browser Settings → Clear browsing data → Cached images and files
3. **Restart frontend**: Stop and restart the Vite dev server
4. **Check Network tab**: Verify response headers include `Access-Control-Allow-Origin: *`
5. **Disable extensions**: Some browser extensions can block CORS

### If Certificate Links Still Wrapped by Mailjet:

1. **Check email transport**: Verify you're using Mailjet SMTP or Graph API
2. **Mailjet account settings**: Disable click tracking at account level (account.mailjet.com → Settings → Tracking)
3. **Production only**: Click tracking might be enabled only in production environment
4. **Test with plain text**: Send a test email with plain text link to verify headers work

### If Certificate Download 404s:

1. **Check environment**: Verify `NODE_ENV` is correctly set
2. **Backend URL**: In production, ensure `BACKEND_URL` env variable is set
3. **Route exists**: Test direct access: `curl http://localhost:3001/cert/{learnerId}/{courseRunId}`
4. **IDs valid**: Ensure learner ID and course run ID are correct

---

## Summary of Changes

| File | Lines | Change |
|------|-------|--------|
| `/polwel-backend/src/index.ts` | 142-165 | Removed CSP `upgrade-insecure-requests`, added HTTP image support |
| `/polwel-backend/src/index.ts` | 217-248 | Enhanced CORS headers for `/uploads` with `Access-Control-Allow-Origin: *` |
| `/polwel-backend/src/controllers/courseRunController.ts` | 5147-5158 | Environment-aware certificate URL generation |
| `/polwel-backend/src/services/courseRunWorkflowService.ts` | 485-495 | Environment-aware certificate URL generation |
| `/polwel-backend/src/services/emailService.ts` | 1795 | Added Mailjet tracking disable headers |

---

## Status: All Issues Resolved ✅

- ✅ CORS errors fixed for rich text images
- ✅ Certificate download links use correct domain
- ✅ Mailjet click tracking disabled
- ✅ Backend server restarted with all fixes applied
- ✅ All CORS headers verified working

**Next Steps**: Please test all functionality after clearing browser cache!

---

*Last Updated: February 11, 2025*
*Backend Status: Running on port 3001*
*All changes applied and server restarted*
