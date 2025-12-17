# Quick Implementation Reference

## File-by-File Implementation Summary

### 1. PolwelUsers.tsx ✅

**Status**: Requires AJAX search enhancement

**What to add**:
- Search input with 500ms debounce
- Export button with XLSX generation
- API call with search parameter

**Key code pattern**:
```typescript
const [searchQuery, setSearchQuery] = useState("");

useEffect(() => {
  const t = setTimeout(() => {
    setPagination((p) => ({ ...p, page: 1 }));
    fetchUsers();
  }, 500);
  return () => clearTimeout(t);
}, [searchQuery]);

// In fetchUsers:
await polwelUsersApi.getAll({
  page: pagination.page,
  limit: perPage,
  search: searchQuery || undefined,
  status: statusFilter || undefined,
});
```

**Export implementation**:
```typescript
const handleExport = async () => {
  const response = await polwelUsersApi.getAll({
    search: searchQuery || undefined,
    all: true,
  });
  const rows = response.users.map((u) => ({...}));
  XLSX.writeFile(wb, "polwel_users.xlsx");
};
```

**Files to modify**:
- Lines 60-80: Add state for search
- Lines 155-200: Add debounce effect
- Lines 160-180: Update fetchUsers
- Line 300: Add handleExport function
- In render: Add search input card + export button

---

### 2. CourseArchive.tsx ✅

**Status**: Requires AJAX search + filters + export

**What to add**:
- Search input (course title)
- Export button
- API pagination support

**Key changes**:
```typescript
// Add state
const [searchQuery, setSearchQuery] = useState("");
const [pagination, setPagination] = useState({...});

// Debounce
useEffect(() => {
  const t = setTimeout(() => {
    setPagination((p) => ({ ...p, page: 1 }));
    setDebouncedSearch(searchQuery);
  }, 500);
  return () => clearTimeout(t);
}, [searchQuery]);

// Fetch with search
const coursesResponse = await coursesApi.getAll({
  search: debouncedSearch || undefined,
  page: pagination.page,
  limit: perPage,
});
```

**UI additions**:
- Search card before course table
- Export button in header
- Pagination controls below table

**Lines to modify**:
- 1-50: Add imports
- 45-80: Add state
- 50-100: Add debounce effect
- 60-120: Update fetch function
- 150-200: Add export function
- 300-400: Update render with search UI

---

### 3. VenueArchive.tsx ✅

**Status**: Requires AJAX search + status filter + export

**What to add**:
- Search input (venue name)
- Status filter with Popover/Checkbox
- Export button
- Pagination support

**New state to add**:
```typescript
const [searchQuery, setSearchQuery] = useState("");
const [debouncedSearch, setDebouncedSearch] = useState("");
const [pagination, setPagination] = useState({...});
const [filters, setFilters] = useState({status: []});
const [openFilter, setOpenFilter] = useState<string | null>(null);
```

**Key function**:
```typescript
const loadVenues = async () => {
  const response = await venuesApi.getAll({
    page: pagination.page,
    limit: perPage,
    search: debouncedSearch || undefined,
  });
  // ... handle response
};
```

**Filter pattern**:
```typescript
const filteredVenues = venues.filter((venue) => {
  if (filters.status.length > 0 && !filters.status.includes(venue.status)) {
    return false;
  }
  return true;
});
```

**UI additions**:
- Search card
- Status filter in table header (Popover)
- Export button
- Pagination controls

---

### 4. PostRunManagement.tsx ✅

**Status**: Requires AJAX search + venue filter

**What to add**:
- Search input (course title/code)
- Venue filter dropdown
- Load venues on mount

**Implementation**:
```typescript
const [searchQuery, setSearchQuery] = useState("");
const [venueFilter, setVenueFilter] = useState("ALL");
const [availableVenues, setAvailableVenues] = useState<any[]>([]);

// Load venues
useEffect(() => {
  const loadVenues = async () => {
    const response = await venuesApi.getAll();
    if (response.success) {
      setAvailableVenues(response.venues || []);
    }
  };
  loadVenues();
}, []);

// Debounce search
useEffect(() => {
  const t = setTimeout(() => {
    pendingBucket.setSearch(searchQuery);
    completedBucket.setSearch(searchQuery);
  }, 500);
  return () => clearTimeout(t);
}, [searchQuery]);
```

**UI additions**:
- Search + venue filter card before tables

---

### 5. WaiverRequests.tsx ✅

**Status**: Already has search/filters, needs export

**What to add**:
- Export button
- Export functionality

**Implementation**:
```typescript
const [exporting, setExporting] = useState(false);

const handleExport = async () => {
  const response = await waiversApi.getAll({
    search: debouncedSearch || undefined,
    status: activeTab !== "ALL" ? activeTab : undefined,
    organizationId: organizationFilter !== "ALL" ? organizationFilter : undefined,
    courseId: courseFilter !== "ALL" ? courseFilter : undefined,
    limit: 1000,
  });

  const rows = response.waiverRequests.map((w) => ({...}));
  XLSX.writeFile(wb, "waiver_requests_export.xlsx");
};
```

**UI additions**:
- Export button in CardHeader

---

## Common Implementation Checklist

For each file, follow these steps:

- [ ] Add imports (Input, Search, Download, XLSX, Popover, Checkbox)
- [ ] Add state variables (searchQuery, exporting, filters, pagination)
- [ ] Add debounce effect for search (500ms)
- [ ] Update API calls to include search/filter params
- [ ] Add filter helper functions (getUniqueValues, handleFilterToggle, etc.)
- [ ] Add export function with XLSX generation
- [ ] Update render: Add search input card
- [ ] Update render: Add filter UI (if applicable)
- [ ] Update render: Add export button
- [ ] Update render: Use filtered/paginated data
- [ ] Add pagination controls (if applicable)
- [ ] Test search functionality
- [ ] Test export functionality
- [ ] Test filter functionality

---

## API Endpoint Parameters

### polwelUsersApi.getAll()
```typescript
{
  page?: number;
  limit?: number;
  search?: string;    // Searches name, email
  status?: string;    // ACTIVE, INACTIVE, PENDING, LOCKED
  all?: boolean;      // Get all records (for export)
}
```

### coursesApi.getAll()
```typescript
{
  page?: number;
  limit?: number;
  search?: string;    // Searches title
  category?: string;
  status?: string;
  certificates?: string;
  sortBy?: string;
  sortOrder?: string;
}
```

### venuesApi.getAll()
```typescript
{
  page?: number;
  limit?: number;
  search?: string;    // Searches name
  status?: string;    // ACTIVE, INACTIVE, MAINTENANCE
}
```

### courseRunsApi.getPostCourseRuns()
```typescript
{
  statuses?: string;  // Comma-separated statuses
  search?: string;    // Searches course title/code
  limit?: number;
}
```

### waiversApi.getAll()
```typescript
{
  page?: number;
  limit?: number;
  search?: string;           // Searches learner name/email/course
  status?: string;           // PENDING, APPROVED, REJECTED
  organizationId?: string;
  courseId?: string;
}
```

---

## Export Pattern (Reusable)

```typescript
const handleExport = async () => {
  try {
    setExporting(true);
    
    // 1. Fetch all matching records
    const response = await apiObject.getAll({
      search: searchQuery || undefined,
      limit: 1000,  // Important: Get all records
      // ... other filters ...
    });

    // 2. Extract data
    const data = response.items || [];

    // 3. Map to export format
    const rows = data.map((item) => ({
      ColumnName1: item.field1,
      ColumnName2: item.field2,
      // ...
    }));

    // 4. Create workbook
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SheetName");

    // 5. Download
    XLSX.writeFile(wb, "filename_export.xlsx");

    // 6. Show success
    toast({
      title: "Exported",
      description: `Exported ${rows.length} record${rows.length === 1 ? "" : "s"}.`,
    });
  } catch (error) {
    console.error("Error exporting:", error);
    toast({
      title: "Export failed",
      description: "We couldn't export the data. Please try again.",
      variant: "destructive",
    });
  } finally {
    setExporting(false);
  }
};
```

---

## Filter UI Pattern (Excel-style)

```tsx
<Popover open={openFilter === "fieldName"} onOpenChange={(open) => setOpenFilter(open ? "fieldName" : null)}>
  <PopoverTrigger asChild>
    <Button variant="ghost" size="sm" className={cn("h-7 w-7 p-0", hasActiveFilter("fieldName") && "text-primary")}>
      <Filter className="h-3.5 w-3.5" />
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-56 p-0" align="start">
    <div className="p-3 border-b">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Filter by Field</span>
        {hasActiveFilter("fieldName") && (
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => clearColumnFilter("fieldName")}>
            Clear
          </Button>
        )}
      </div>
    </div>
    <div className="max-h-64 overflow-y-auto p-2">
      {getUniqueValues("fieldName").map((value) => (
        <div
          key={value}
          className="flex items-center space-x-2 py-1.5 px-2 hover:bg-muted rounded-sm cursor-pointer"
          onClick={() => handleFilterToggle("fieldName", value)}
        >
          <Checkbox checked={filters.fieldName?.includes(value)} />
          <span className="text-sm">{value}</span>
        </div>
      ))}
    </div>
  </PopoverContent>
</Popover>
```

---

## Search Input Pattern

```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
  <Input
    placeholder="Search by..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="pl-10"
  />
</div>
```

---

## Debounce Effect Pattern

```typescript
useEffect(() => {
  const t = setTimeout(() => {
    // Reset pagination
    setPagination((p) => ({ ...p, page: 1 }));
    // Trigger fetch
    fetchData();
  }, 500);
  return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [searchQuery]);
```

---

## Import Checklist

Add these imports to each file:

```typescript
// UI Components
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Icons
import { Search, Download, Filter, Loader2, Plus, X } from "lucide-react";

// Utilities
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

// APIs
import { polwelUsersApi, coursesApi, venuesApi, waiversApi } from "@/lib/api";

// Hooks
import { useToast } from "@/hooks/use-toast";

// Components
import PaginationControls from "@/components/ui/pagination";
```

---

## Production Checklist

Before deploying:

- [ ] All searches have 500ms debounce
- [ ] Pagination resets to page 1 on search/filter change
- [ ] Export gets all records (limit: 1000 or higher)
- [ ] Export filename is descriptive
- [ ] Error messages shown in toast
- [ ] Loading states visible
- [ ] API calls use apiRequest wrapper (NOT raw fetch)
- [ ] Token handling automatic (via apiRequest)
- [ ] All filter toggles work correctly
- [ ] Pagination controls visible when > 10 items
- [ ] No console errors
- [ ] Mobile responsive (flex-col sm:flex-row)
- [ ] Tests pass

---

## Troubleshooting

### Search not working
- Check debounce delay is 500ms
- Verify search parameter passed to API
- Check API endpoint supports search param
- Verify API response contains data

### Export is empty
- Check API returns all records with `limit: 1000`
- Verify data mapping in rows
- Check XLSX sheet name is correct
- Verify rows are being created

### Filters not showing
- Check filter state is initialized
- Verify getUniqueValues function works
- Check Popover is visible
- Verify handleFilterToggle updates state

### Pagination not working
- Check pagination state initialized
- Verify onPageChange handler updates state
- Check API includes page/limit params
- Verify pagination controls visible when needed

---

## Notes

- All components follow TrainersAndPartners.tsx pattern
- Debounce delay is 500ms (not 300ms) per requirements
- Export uses XLSX (not ExcelJS) per existing pattern
- Filters use Popover + Checkbox for Excel-style UI
- All API calls go through apiRequest wrapper for auth
- Pagination is client-side or server-side depending on API support

