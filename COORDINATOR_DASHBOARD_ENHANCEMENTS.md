# Training Coordinator Dashboard Enhancements

## Overview
Major UI/UX enhancements to the **Training Coordinator's Dashboard** (OrganizationDashboard.tsx) with 3 new sections:
1. **Resource Library** - Important Announcements & Resources with preview/download functionality
2. **Course Rankings** - Courses ranked by number of learners  
3. **Division Rankings** - Divisions/departments ranked by learner count and completion rate

**Note**: These features are visible ONLY to Training Coordinators when they access their own dashboard at `/organization-dashboard`.

## Implementation Summary

### Backend API Endpoints

#### 1. Resource Library API
**File**: `/polwel-backend/src/controllers/organizationAnalyticsController.ts`

```typescript
GET /api/client-organizations/:organizationId/resources
```

- Returns published resources targeting training coordinators
- Includes: title, description, fileName, fileUrl, fileSize, mimeType, publishedAt, uploader info
- Filtered by: status='PUBLISHED', targetAudience='TRAINING_COORDINATORS', deletedAt=null
- Ordered by: publishedAt DESC

**Response**:
```json
{
  "success": true,
  "resources": [
    {
      "id": "cuid123",
      "title": "Training Policy Update 2024",
      "description": "New policies for...",
      "fileName": "policy-2024.pdf",
      "fileUrl": "https://...",
      "fileSize": 245678,
      "mimeType": "application/pdf",
      "publishedAt": "2024-01-15T10:00:00Z",
      "uploader": {
        "name": "Admin User",
        "email": "admin@polwel.sg"
      }
    }
  ]
}
```

#### 2. Course Rankings API
**File**: `/polwel-backend/src/controllers/organizationAnalyticsController.ts`

```typescript
GET /api/client-organizations/:organizationId/analytics/courses-by-learners
```

- Aggregates course enrollments by course for the organization
- Counts unique learners enrolled in each course
- Returns top 10 courses sorted by learner count
- Includes: rank, courseName, numberOfLearners, runType (Open Run/Dedicated Run)

**Data Source**: 
- `course_runs` joined with `course_run_learners` joined with `learners`
- Filtered by: organizationId, deletedAt=null
- Grouped by: courseId
- Sorted by: learnerCount DESC

**Response**:
```json
{
  "success": true,
  "rankings": [
    {
      "rank": 1,
      "courseName": "Leadership Development Program",
      "numberOfLearners": 45,
      "runType": "Dedicated Run"
    },
    {
      "rank": 2,
      "courseName": "Project Management Fundamentals",
      "numberOfLearners": 38,
      "runType": "Open Run"
    }
  ]
}
```

#### 3. Division Rankings API
**File**: `/polwel-backend/src/controllers/organizationAnalyticsController.ts`

```typescript
GET /api/client-organizations/:organizationId/analytics/divisions-by-learners
```

- Aggregates learners and completion data by department/division
- Calculates completion rate: (courses with attendanceStatus='PRESENT' / total enrollments) * 100
- Returns top 10 divisions sorted by learner count
- Includes: rank, divisionDepartment, numberOfLearners, completionRate

**Data Source**:
- `learners` joined with `course_run_learners`
- Filtered by: organizationId, enrollmentStatus='ENROLLED', deletedAt=null
- Grouped by: departmentName
- Completion calculated from: attendanceStatus='PRESENT'

**Response**:
```json
{
  "success": true,
  "rankings": [
    {
      "rank": 1,
      "divisionDepartment": "IT Department",
      "numberOfLearners": 25,
      "completionRate": 85
    },
    {
      "rank": 2,
      "divisionDepartment": "HR Department",
      "numberOfLearners": 18,
      "completionRate": 92
    }
  ]
}
```

### Frontend Components

#### 1. Resource Library Section
**File**: `/src/pages/OrganizationDashboard.tsx`

**Location**: Between stats cards and tabs (visible only to TRAINING_COORDINATOR role)

**Features**:
- **Card Layout**: Clean white card with shadow
- **Icon**: Bell icon in blue-100 rounded background
- **Title**: "Important Announcements & Resources"
- **Subtitle**: "Latest updates and resources from POLWEL Training Management"
- **New Badge**: Shows "X New" count for resources published within last 7 days
- **Grid Display**: 2-column responsive grid (1 col mobile, 2 cols desktop)
- **Resource Cards**: Each resource shows:
  - Document icon (FileIcon) in blue-50 background
  - Title (text-lg font-bold)
  - Published date with calendar icon
  - Description (line-clamp-2, HTML tags stripped)
  - "New" badge (green) if published within 7 days
  - Full-width "Download PDF" button (blue-600)
  - Eye icon button for preview
- **HTML Handling**: Description HTML tags are stripped using `stripHtmlTags()` helper
- **URL Handling**: FileUrl automatically prepended with API base URL if relative path

**Loading State**: Loader2 spinner centered with py-12
**Empty State**: FileText icon with "No resources available at this time"

#### 2. Course Rankings Table
**File**: `/src/pages/OrganizationDashboard.tsx`

**Location**: Inside "Organisation Details" tab, below organization information

**Design**:
- **Theme**: Orange color scheme (border-orange-200, bg-orange-50)
- **Header**: 📚 emoji + "Courses Ranked by Number of Learners"
- **Columns**:
  1. **Rank** (w-16, centered, orange-700 font-semibold)
  2. **Course Name** (font-medium)
  3. **Number of Learners** (w-32, centered, Badge with bg-orange-100)
  4. **Run Type** (w-32, Badge with variant based on type)

**Table Structure**:
- Header row: bg-orange-50/50
- Body rows: hover:bg-orange-50/30
- Badges: Secondary variant for learner count, default/outline for run type

**Loading State**: Loader2 spinner (orange-600)
**Empty State**: "No course enrollment data available"

#### 3. Division Rankings Table
**File**: `/src/pages/OrganizationDashboard.tsx`

**Location**: Inside "Organisation Details" tab, next to Course Rankings (2-column grid)

**Design**:
- **Theme**: Green color scheme (border-green-200, bg-green-50)
- **Header**: 🏢 emoji + "Attending Divisions Ranked by Number of Learners"
- **Columns**:
  1. **Rank** (w-16, centered, green-700 font-semibold)
  2. **Division / Department** (font-medium)
  3. **Number of Learners** (w-32, centered, Badge with bg-green-100)
  4. **Completion Rate** (w-32, centered, color-coded Badge)

**Completion Rate Color Coding**:
- ≥80%: bg-green-600 text-white (excellent)
- 50-79%: bg-yellow-100 text-yellow-900 (average)
- <50%: bg-red-100 text-red-900 (needs improvement)

**Table Structure**:
- Header row: bg-green-50/50
- Body rows: hover:bg-green-50/30
- Badges: Color-coded based on performance

**Loading State**: Loader2 spinner (green-600)
**Empty State**: "No division data available"

#### 4. Resource Preview Dialog
**File**: `/src/pages/OrganizationDashboard.tsx`

**Component**: shadcn/ui Dialog with max-w-4xl and max-h-[90vh]

**Features**:
- **Header**: Resource title and description (HTML stripped)
- **Metadata Section**: 2-column grid showing:
  - File Name
  - Published Date
  - Uploaded By (name)
  - File Size (KB)
- **Download Button**: Full-width blue button with Download icon
- **Preview Area**:
  - **PDF Files**: Embedded iframe (60vh height) showing file content
  - **Other Files**: FileText icon + "Preview not available" message
- **URL Handling**: FileUrl automatically prepended with API base URL if relative path

**Trigger**: Clicking eye icon on any resource card
**Close**: Clicking outside dialog or X button

**Fixes Applied**:
- HTML tags in description are stripped for clean text display
- FileUrl is automatically prefixed with API base URL if it's a relative path
- Download button added inside dialog for easy access
- Preview iframe uses corrected URL

## Technical Details

### State Management
```typescript
const [resources, setResources] = useState<any[]>([]);
const [courseRankings, setCourseRankings] = useState<any[]>([]);
const [divisionRankings, setDivisionRankings] = useState<any[]>([]);
const [resourcesLoading, setResourcesLoading] = useState(false);
const [rankingsLoading, setRankingsLoading] = useState(false);
const [previewResource, setPreviewResource] = useState<any | null>(null);
```

### Data Fetching
```typescript
// Fetch on component mount (only for Training Coordinators)
useEffect(() => {
  if (id && isTCUser) {
    fetchResources();
    fetchRankings();
  }
}, [id]);

// Parallel fetching for rankings
const [coursesResponse, divisionsResponse] = await Promise.all([
  clientOrganizationsApi.getCoursesByLearnersRanking(id),
  clientOrganizationsApi.getDivisionsByLearnersRanking(id),
]);
```

### Route Protection
- All endpoints use `authorizeRoles('TRAINING_COORDINATOR')`
- All endpoints use `authorizeOrganization` middleware
- Frontend components check `isTCUser` flag before rendering

### Database Schema
**ResourceLibrary Model** (already exists):
```prisma
model ResourceLibrary {
  id              String   @id @default(cuid())
  title           String
  description     String?  @db.Text
  fileName        String
  fileUrl         String
  fileSize        Int?
  mimeType        String?
  status          ResourceLibraryStatus @default(DRAFT)
  targetAudience  ResourceLibraryAudience @default(TRAINING_COORDINATORS)
  uploadedBy      String?
  uploader        User?    @relation(...)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  deletedAt       DateTime?
  publishedAt     DateTime?
}
```

## Files Modified

### Backend
1. `/polwel-backend/src/controllers/organizationAnalyticsController.ts` - **NEW FILE**
   - `getCoordinatorResources()` - 53 lines
   - `getCoursesByLearnersRanking()` - 107 lines
   - `getDivisionsByLearnersRanking()` - 120 lines

2. `/polwel-backend/src/routes/clientOrganizations.ts` - **MODIFIED**
   - Added import for analytics controller
   - Added 3 new routes:
     - `GET /:organizationId/resources`
     - `GET /:organizationId/analytics/courses-by-learners`
     - `GET /:organizationId/analytics/divisions-by-learners`

### Frontend
1. `/src/lib/api.ts` - **MODIFIED**
   - Added `getResources()` method to clientOrganizationsApi
   - Added `getCoursesByLearnersRanking()` method
   - Added `getDivisionsByLearnersRanking()` method

2. `/src/pages/OrganizationDashboard.tsx` - **MODIFIED** (Training Coordinator Dashboard)
   - Added imports: Dialog components, Download, FileText icons
   - Added 6 new state variables (resources, rankings, loading, preview)
   - Added 2 fetch functions: `fetchResources()`, `fetchRankings()`
   - Added Resource Library section (78 lines)
   - Added Course Rankings table (60 lines)
   - Added Division Rankings table (65 lines)
   - Added Resource Preview Dialog (68 lines)
   - Total additions: ~270 lines

3. `/src/pages/ClientOrganisationDetail.tsx` - **NO CHANGES**
   - This file remains unchanged (admin view of organization details)

## UI/UX Match

### Resource Library
✅ Matches design with:
- Blue color scheme
- Card-based layout with grid
- Eye icon for preview
- Download icon for file download
- Published date display
- Responsive 3-column grid

### Course Rankings
✅ Matches design with:
- Orange header background
- 4-column table (Rank, Course Name, Number of Learners, Run Type)
- Rank displayed as number
- Learner count in badge
- Run type differentiation (Dedicated vs Open)

### Division Rankings
✅ Matches design with:
- Green header background
- 4-column table (Rank, Division, Number of Learners, Completion Rate)
- Completion rate percentage
- Color-coded completion badges (green/yellow/red)

## Testing Checklist

### Backend API Testing
- [ ] Test resource library API returns correct data
- [ ] Test course rankings API with multiple courses
- [ ] Test division rankings API with multiple departments
- [ ] Test authorization (only TRAINING_COORDINATOR can access)
- [ ] Test with organization having no data (empty arrays)
- [ ] Test with organization having lots of data (top 10 limit)

### Frontend UI Testing
- [ ] Verify Resource Library section appears for TC users only
- [ ] Test resource card click → preview dialog opens
- [ ] Test PDF preview renders correctly in iframe
- [ ] Test non-PDF files show download option
- [ ] Test download button opens file in new tab
- [ ] Verify Course Rankings table displays in Organization Details tab
- [ ] Verify Division Rankings table displays next to Course Rankings
- [ ] Test ranking tables show correct data
- [ ] Test loading states show spinners
- [ ] Test empty states show correct messages
- [ ] Verify color schemes match design (blue, orange, green)
- [ ] Test responsive layout (mobile, tablet, desktop)

### Integration Testing
- [ ] Test with real training coordinator account
- [ ] Test with POLWEL admin account (sections should NOT appear)
- [ ] Test with organization having published resources
- [ ] Test with organization having course enrollments
- [ ] Test with organization having multiple divisions
- [ ] Test completion rate calculations are accurate

## Build Status
✅ Backend builds successfully (TypeScript compilation passed)
✅ Frontend builds successfully (Vite build completed)
✅ No TypeScript errors
✅ No linting errors

## Deployment Notes

1. **Database**: No schema changes required (ResourceLibrary table already exists)
2. **Environment**: No new environment variables needed
3. **Dependencies**: No new packages required
4. **Backwards Compatibility**: Changes are additive, won't break existing functionality
5. **Role-Based**: All new features are TC-only, won't affect POLWEL users

## Future Enhancements

1. **Pagination**: Add pagination for rankings if more than 10 items
2. **Filtering**: Add date range filters for rankings
3. **Export**: Add Excel export for ranking tables
4. **Search**: Add search/filter for resources
5. **Categories**: Add category filtering for resources
6. **Notifications**: Add "New Resource" badge for recently published items
7. **Analytics**: Add trend charts (learner growth over time)
8. **Drill-Down**: Make ranking rows clickable to show details
