# Email Attachment Support Implementation

## Overview
This update adds support for attaching files to learner course confirmation emails. Users can now upload and attach documents (PDFs, Word files, Excel sheets, etc.) to course confirmation emails sent to learners.

## Changes Made

### Backend

#### 1. Email Service Enhancement
**File:** `polwel-backend/src/services/emailService.ts`

- Added `attachment` parameter to `sendLearnerCourseConfirmationEmail()` method
- Updated parameters interface to include optional `attachment` object with:
  - `path`: Full path to the attachment file
  - `originalName`: Original filename to display in email
  - `filename`: Stored filename on disk
- Added file existence check before attaching
- Gracefully handles attachment errors with warning logs

**Updated signature:**
```typescript
sendLearnerCourseConfirmationEmail(params: {
  email: string;
  learnerName: string;
  courseTitle: string;
  courseCode?: string;
  serialNumber?: string;
  startDate?: Date;
  endDate?: Date;
  venueName?: string;
  additionalNotes?: string;
  cc?: string[] | string | null;
  attachment?: any | null;  // NEW: Optional attachment
}): Promise<boolean>
```

#### 2. New Upload Route
**File:** `polwel-backend/src/routes/uploads.ts` (NEW)

- Created dedicated endpoint for email attachment uploads
- Route: `POST /api/uploads/email-attachments`
- Uses multer for file handling with:
  - 10MB file size limit
  - Supported file types: PDF, Word, Excel, text, JPEG, PNG, GIF
  - Automatic directory creation for email attachments
  - File metadata stored in database (Media table)
- Returns file ID for reference in email sending

**Features:**
- Authentication required (via `authenticateToken` middleware)
- Files stored in: `uploads/email-attachments/`
- Database tracking of all uploads
- Automatic cleanup of failed uploads

#### 3. Backend Server Update
**File:** `polwel-backend/src/index.ts`

- Added import for new uploads route
- Registered route: `app.use('/api/uploads', uploadsRoutes);`

#### 4. Existing Controller Enhancement
**File:** `polwel-backend/src/controllers/courseRunController.ts`

- `sendCourseConfirmationEmail()` method already supports attachments
- Now handles:
  - Retrieving attachment from Media table using `attachmentId`
  - Validation of attachment existence
  - Passing attachment to email service
  - Error handling for missing attachments

**Key flow:**
1. Frontend uploads file → returns `fileId`
2. Frontend sends `attachmentId` in email request
3. Backend retrieves attachment from Media table
4. Backend passes full attachment object to email service
5. Email service attaches file to SMTP message

### Frontend

#### 1. API Enhancement
**File:** `src/lib/api.ts`

- Updated `sendCourseConfirmationEmail()` API method signature
- Added optional `attachmentId` parameter

```typescript
sendCourseConfirmationEmail: async (
  courseRunId: string, 
  payload: { 
    cc?: string; 
    additionalBodyContent?: string; 
    attachmentId?: string;  // NEW
  }
)
```

#### 2. Course Runs Page Enhancement
**File:** `src/pages/CourseRuns.tsx`

- Enhanced email dialog state (already had attachment support structure)
- Updated `handleSendCourseConfirmationEmail()` handler to:
  - Detect file selection in attachment field
  - Upload file to `/api/uploads/email-attachments`
  - Extract returned `fileId`
  - Include `attachmentId` in email API call
  - Provide user feedback during upload
  - Handle upload errors gracefully

**Key improvements:**
- File upload happens BEFORE email sending
- Clean error handling with toast notifications
- File size validation (10MB limit) with user feedback
- Attachment display shows filename
- Remove button to clear selection

## User Flow

### For Course Coordinators

1. Navigate to CourseRuns page
2. Click "Send Course Confirmation Email" button
3. In email dialog:
   - Add optional CC emails
   - Add optional additional message
   - **NEW**: Click "Attach File" to upload document
   - Select file (PDF, Word, Excel, image, text)
   - File shows in dialog with option to remove
   - Click "Send Email" to send with attachment

4. Email is sent to all enrolled learners with the attachment

### Email Recipients

- Learners receive course confirmation email
- If attachment was included, it appears in their email client
- Attachment is properly formatted for SMTP delivery

## File Storage

- **Location:** `uploads/email-attachments/`
- **Naming:** UUID + timestamp + extension (e.g., `a1b2c3d4-1234567890.pdf`)
- **Database:** Metadata stored in `media` table
- **Permissions:** System maintains records for audit trail

## Database

No schema changes required. Uses existing `Media` table with:
- `id`: Unique identifier
- `filename`: Stored filename
- `originalName`: Original filename for display
- `mimeType`: File MIME type
- `size`: File size in bytes
- `path`: Relative path to file
- `createdAt`, `updatedAt`, `deletedAt`: Audit fields

## Supported File Types

- **Documents:** PDF, DOC, DOCX, XLS, XLSX
- **Text:** Plain text (.txt)
- **Images:** JPEG, PNG, GIF

## Limitations

- Maximum file size: 10MB
- File types strictly validated by MIME type
- One file per email batch (can be changed if needed)
- Files stored indefinitely (can be cleaned up manually)

## Error Handling

### Upload Errors
- File not provided → "No file provided" error
- File too large → Caught by multer, user receives error
- Invalid file type → "File type not allowed" error
- Upload failure → Error logged, file cleaned up

### Email Sending Errors
- Missing attachment → Error returned, user notified
- File no longer exists → Error logged, email sent without attachment
- Database errors → Transaction rolled back, user notified

## Security Considerations

1. **Authentication:** Upload endpoint requires authentication
2. **File Validation:** MIME type and size checked on upload
3. **Path Security:** UUIDs prevent filename guessing
4. **No Execution:** Files served as static assets, never executed
5. **Database Tracking:** All uploads logged for audit trail

## Testing Recommendations

1. **Unit Tests**
   - Test attachment parameter in email service
   - Test file upload validation
   - Test attachment metadata storage

2. **Integration Tests**
   - Upload file → get fileId → send email with attachment
   - Try uploading oversized file
   - Try uploading unsupported file type
   - Verify email with attachment sends to all learners

3. **Manual Testing**
   - Upload PDF and verify email includes it
   - Upload image and verify displays correctly
   - Test with various file types
   - Test with maximum file size
   - Verify file cleanup on upload errors

## API Endpoints

### Upload Attachment
```
POST /api/uploads/email-attachments
Authorization: Bearer <token>
Content-Type: multipart/form-data

Body: FormData with 'file' field

Response:
{
  "success": true,
  "fileId": "uuid-here",
  "id": "uuid-here",
  "originalName": "document.pdf",
  "filename": "uuid-timestamp.pdf",
  "path": "/uploads/email-attachments/uuid-timestamp.pdf"
}
```

### Send Course Confirmation Email (Enhanced)
```
POST /api/course-runs/:id/send-course-confirmation-email
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "cc": "user@example.com",
  "additionalBodyContent": "Optional message",
  "attachmentId": "uuid-from-upload"  // NEW - optional
}

Response:
{
  "success": true,
  "message": "Course confirmation emails processed. Success: 42, Failed: 0",
  "emailsSent": 42,
  "failures": 0
}
```

## Future Enhancements

1. **Multiple Attachments:** Support multiple files per email batch
2. **Attachment Management:** UI to manage uploaded files
3. **Automatic Cleanup:** Background job to clean up old attachments
4. **Preview:** Show attachment details before sending
5. **Compression:** Auto-compress large images
6. **S3 Storage:** Move to cloud storage for scalability

## Deployment Notes

1. Ensure `uploads/email-attachments/` directory permissions allow write access
2. Multer configuration persists across requests
3. Static file serving configured for `/uploads` path
4. No database migrations needed
5. Backward compatible - existing code works without attachments

## Configuration

### Multer Settings (in `uploads.ts`)
- Storage: Disk-based with UUID naming
- Destination: `uploads/email-attachments/`
- File size limit: 10MB (can be increased if needed)
- Allowed MIME types: Document, image formats

### Email Service (in `emailService.ts`)
- Uses `nodemailer` for SMTP delivery
- Attachments appended to mail options
- File existence validated before attaching

## Maintenance

### Disk Space
Monitor `uploads/email-attachments/` directory:
```bash
du -sh /path/to/uploads/email-attachments/
```

### Database Cleanup
Delete old attachment records (if needed):
```sql
DELETE FROM media WHERE category = 'EMAIL_ATTACHMENT' AND createdAt < DATE_SUB(NOW(), INTERVAL 90 DAY);
```

### Log Monitoring
Check logs for attachment errors:
```bash
grep "attachment" /path/to/app.log
```

## Rollback

If issues occur, rollback is straightforward:

1. Remove `/api/uploads` route from `index.ts`
2. Remove `attachmentId` from email request payload
3. Revert changes to email service
4. Existing attachment records remain in database (no harm)

No database migrations to revert, no schema changes.
