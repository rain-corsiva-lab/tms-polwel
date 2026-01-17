# Error Handling Improvements

This document summarizes all the error handling improvements made across the application to provide meaningful error messages to users.

## Core Changes

### `/src/lib/errorHandler.ts`
Extended with:
- `getErrorMessage()` - A helper function that extracts error messages from various error formats (axios errors, plain errors, strings, etc.)
- Multiple pre-configured error handlers for different operations

## Files Updated

### Pages

| File | Changes |
|------|---------|
| `VenueForm.tsx` | Uses `errorHandlers.venueLoad` and `errorHandlers.venueCreate/venueUpdate` |
| `Profile.tsx` | Uses `errorHandlers.profileLoad` and `errorHandlers.profileUpdate` |
| `TrainersAndPartners.tsx` | Uses `errorHandlers.trainerDelete/trainerRestore/partnerDelete/partnerRestore` and `getErrorMessage` for resend email |
| `VenueArchive.tsx` | Uses `errorHandlers.venueLoad` and `errorHandlers.venueDelete` |
| `CourseRunForm.tsx` | Uses `getErrorMessage` for all error toasts |
| `BillingReports.tsx` | Uses `getErrorMessage` for load, detail, and download errors |
| `ClientOrganisationDetail.tsx` | Uses `getErrorMessage` for all 10 catch blocks (fetch org, fetch coordinators, fetch learners, save changes, delete coordinator, resend email, password reset, status update) |
| `CourseArchive.tsx` | Uses `getErrorMessage` for load data, delete, and toggle status errors |
| `PostRunDetail.tsx` | Uses `getErrorMessage` for fetch course run and save billing errors |
| `TrainerDashboard.tsx` | Uses `getErrorMessage` for dashboard load errors |
| `OrganizationDashboard.tsx` | Uses `getErrorMessage` for organization and learners load errors |
| `PostRunManagement.tsx` | Uses `getErrorMessage` for billing report generation errors |
| `PolwelUsers.tsx` | Uses `getErrorMessage` for delete user and update status errors |

### Components

| File | Changes |
|------|---------|
| `GenerateCertificatesDialog.tsx` | Uses `getErrorMessage` for certificate data, download, ZIP export, and waiver submit errors |
| `CertificateGenerationDialog.tsx` | Uses `getErrorMessage` for waiver submit, download, and export errors |
| `EditProfileDialog.tsx` | Uses `getErrorMessage` for profile update errors |
| `ViewDetailsDialog.tsx` | Uses `getErrorMessage` for user details load errors |
| `AttendanceListDialog.tsx` | Uses `getErrorMessage` for attendance save errors |
| `TrainerTrainingSummary.tsx` | Uses `getErrorMessage` for training summary load errors |

## How It Works

### Before
```typescript
} catch (error: any) {
  toast({
    title: "Error",
    description: "Failed to save data",
    variant: "destructive",
  });
}
```

### After
```typescript
import { getErrorMessage } from "@/lib/errorHandler";

} catch (error: any) {
  toast({
    title: "Error",
    description: getErrorMessage(error, "Failed to save data"),
    variant: "destructive",
  });
}
```

### Error Message Extraction Priority
The `getErrorMessage()` function extracts messages in this order:
1. `error.response.data.message` (Axios response)
2. `error.response.data.error` (Axios response with error field)
3. `error.data.message` (Direct data response)
4. `error.data.error` (Direct data with error field)
5. `error.message` (Standard Error object)
6. Fallback message provided as second parameter

## Benefits
1. **Consistent error handling** across all components
2. **Meaningful error messages** - Users now see actual error reasons from the backend
3. **Easy to maintain** - Centralized error handling logic
4. **Flexible** - Works with various error formats (Axios, fetch, thrown errors)
5. **Fallback support** - Always has a sensible default message

## Backend Fixes

### Static File Serving for Uploads
Added in `/polwel-backend/src/index.ts`:
```typescript
import path from "path";
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
```

This enables downloading of waiver documents and other uploaded files.
