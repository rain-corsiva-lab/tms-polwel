# Complete Code Implementation Examples

## File 1: PolwelUsers.tsx - Complete Search + Export Implementation

### Add to Imports (Line 1-30)
```typescript
import { Input } from "@/components/ui/input";
import { Search, Loader2, Download } from "lucide-react";
import * as XLSX from "xlsx";
```

### Add State (After line 68)
```typescript
const [searchQuery, setSearchQuery] = useState("");
const [exporting, setExporting] = useState(false);
```

### Add Debounce Effect (After fetchUsers definition)
```typescript
useEffect(() => {
  const t = setTimeout(() => {
    setPagination((p) => ({ ...p, page: 1 }));
    fetchUsers();
  }, 500);
  return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [searchQuery]);
```

### Update fetchUsers Function
```typescript
const fetchUsers = async () => {
  try {
    setLoading(true);
    const response = await polwelUsersApi.getAll({
      page: pagination.page,
      limit: perPage,
      search: searchQuery || undefined,          // ADD THIS LINE
      status: statusFilter || undefined,
    });

    setUsers(response.users || []);
    setPagination(response.pagination || { ...pagination, limit: perPage });

    if (response.users && response.users.length > 0) {
      console.log("PolwelUsers: Sample user data:", response.users[0]);
    }
  } catch (error) {
    console.error("Error fetching POLWEL users:", error);
    
    if (error instanceof Error) {
      if (error.message.includes("Session expired") || error.message.includes("Authentication")) {
        console.log("Authentication error detected");
        setLoading(false);
        return;
      }
    }

    setUsers(dummyUsers);
    setPagination({
      page: 1,
      limit: 10,
      total: dummyUsers.length,
      totalPages: 1,
    });
  } finally {
    setLoading(false);
  }
};
```

### Add Export Function (Before return)
```typescript
const handleExport = async () => {
  try {
    setExporting(true);
    const response = await polwelUsersApi.getAll({
      search: searchQuery || undefined,
      status: statusFilter || undefined,
      all: true,
    });

    const dataset: PolwelUser[] = response.users || [];
    const rows = dataset.map((u) => ({
      Name: u.name,
      Email: u.email,
      Status: u.status,
      LastLogin: u.lastLogin ? formatDate(u.lastLogin) : "Never",
      CreatedAt: formatDate(u.createdAt),
      UpdatedAt: formatDate(u.updatedAt),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "POLWEL_Users");
    XLSX.writeFile(wb, "polwel_users.xlsx");
    
    toast({
      title: "Exported",
      description: `Exported ${rows.length} POLWEL user${rows.length === 1 ? "" : "s"}.`,
    });
  } catch (error) {
    console.error("Error exporting POLWEL users:", error);
    toast({
      title: "Export failed",
      description: "We couldn't export the POLWEL users. Please try again.",
      variant: "destructive",
    });
  } finally {
    setExporting(false);
  }
};
```

### Update Header in Return (Line ~400)
```tsx
<div className="flex justify-between items-center">
  <div>
    <h1 className="text-3xl font-bold tracking-tight">POLWEL Staff Management</h1>
  </div>
  <div className="flex items-center gap-2">
    <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
      {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
      {exporting ? "Exporting..." : "Export"}
    </Button>
    <Button variant="outline" size="sm" onClick={() => setFilterOpen((o) => !o)}>
      <Filter className="h-4 w-4 mr-2" />
      {filterOpen ? "Hide Filters" : "Filter"}
    </Button>
    <AddPolwelUserDialog />
  </div>
</div>
```

### Add Search Card (After header, before stats)
```tsx
<Card>
  <CardContent className="pt-6">
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 py-1 text-sm w-full"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="INACTIVE">Inactive</option>
            <option value="LOCKED">Locked</option>
          </select>
        </div>
      </div>
    </div>
  </CardContent>
</Card>
```

---

## File 2: CourseArchive.tsx - Complete Search + Export Implementation

### Add Imports
```typescript
import { Download, Search } from "lucide-react";
import * as XLSX from "xlsx";
import { Input } from "@/components/ui/input";
```

### Add State Variables
```typescript
const [searchQuery, setSearchQuery] = useState("");
const [debouncedSearch, setDebouncedSearch] = useState("");
const [exporting, setExporting] = useState(false);
const [pagination, setPagination] = useState({
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
});
const [perPage, setPerPage] = useState(10);
```

### Add Debounce Effect
```typescript
useEffect(() => {
  const t = setTimeout(() => {
    setPagination((p) => ({ ...p, page: 1 }));
    setDebouncedSearch(searchQuery);
  }, 500);
  return () => clearTimeout(t);
}, [searchQuery]);
```

### Replace useEffect for Loading Data
```typescript
useEffect(() => {
  const loadData = async () => {
    try {
      setLoading((prev) => ({ ...prev, categories: true }));
      const categoriesResponse = await referencesApi.getCategories();
      setCategories(
        categoriesResponse.success && categoriesResponse.data && Array.isArray(categoriesResponse.data.categories)
          ? categoriesResponse.data.categories
          : []
      );

      setLoading((prev) => ({ ...prev, courses: true }));
      const coursesResponse = await coursesApi.getAll({
        search: debouncedSearch || undefined,
        page: pagination.page,
        limit: perPage,
      });

      let coursesData = [];
      if (coursesResponse.success && Array.isArray(coursesResponse.courses)) {
        coursesData = coursesResponse.courses;
      } else if (coursesResponse.data && Array.isArray(coursesResponse.data.courses)) {
        coursesData = coursesResponse.data.courses;
      } else if (Array.isArray(coursesResponse.data)) {
        coursesData = coursesResponse.data;
      } else if (Array.isArray(coursesResponse)) {
        coursesData = coursesResponse;
      }

      setCourses(coursesData);
      setPagination(coursesResponse.pagination || {
        page: pagination.page,
        limit: perPage,
        total: coursesData.length,
        totalPages: Math.ceil(coursesData.length / perPage),
      });

      const vData = Array.isArray(venuesResponse?.data?.venues)
        ? venuesResponse.data.venues
        : Array.isArray(venuesResponse?.data)
        ? venuesResponse.data
        : [];

      const map: Record<string, string> = {};
      for (const v of vData) {
        if (v && v.id) map[v.id] = v.name || v.title || v.address || String(v.id);
      }
      setVenuesMap(map);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to load courses data"),
        variant: "destructive",
      });
    } finally {
      setLoading((prev) => ({ ...prev, courses: false, categories: false }));
    }
  };

  loadData();
}, [debouncedSearch, pagination.page, perPage]);
```

### Add Export Function
```typescript
const handleExport = async () => {
  try {
    setExporting(true);
    const response = await coursesApi.getAll({
      search: debouncedSearch || undefined,
      limit: 1000,
    });

    let coursesData: any[] = [];
    if (response.success && Array.isArray(response.courses)) {
      coursesData = response.courses;
    } else if (response.data && Array.isArray(response.data.courses)) {
      coursesData = response.data.courses;
    } else if (Array.isArray(response.data)) {
      coursesData = response.data;
    }

    const rows = coursesData.map((course) => ({
      Title: course.title,
      Category: course.category,
      Duration: `${course.duration} ${course.durationType}`,
      Venue: venuesMap[course.venueId] || course.venueId || "TBD",
      MinParticipants: course.minParticipants || 1,
      Price: `$${course.defaultCourseFee?.toFixed(2) || "0.00"}`,
      Certificate: course.certificates?.toUpperCase() || "POLWEL",
      Status: course.status || "ACTIVE",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Courses");
    XLSX.writeFile(wb, "courses_export.xlsx");

    toast({
      title: "Exported",
      description: `Exported ${rows.length} course${rows.length === 1 ? "" : "s"}.`,
    });
  } catch (error) {
    console.error("Error exporting courses:", error);
    toast({
      title: "Export failed",
      description: "We couldn't export the courses. Please try again.",
      variant: "destructive",
    });
  } finally {
    setExporting(false);
  }
};
```

### Update Header in Return
```tsx
<div className="container mx-auto py-6 px-4">
  <div className="flex justify-between items-center mb-6">
    <div>
      <h1 className="text-3xl font-bold tracking-tight">List of Courses</h1>
    </div>
    <div className="flex gap-2">
      <Button variant="outline" onClick={handleExport} disabled={exporting}>
        {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
        {exporting ? "Exporting..." : "Export"}
      </Button>
      <Button onClick={() => navigate("/courses/new")}>
        <Plus className="mr-2 h-4 w-4" />
        Add New Course
      </Button>
    </div>
  </div>

  {/* Search Card */}
  <Card className="mb-6">
    <CardContent className="pt-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search courses by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</div>
```

---

## File 3: VenueArchive.tsx - Complete Implementation

### Add Imports
```typescript
import { Input } from "@/components/ui/input";
import { Search, Download, Filter, Loader2, Plus, Eye, Edit, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";
import PaginationControls from "@/components/ui/pagination";
```

### Add State
```typescript
const [searchQuery, setSearchQuery] = useState("");
const [debouncedSearch, setDebouncedSearch] = useState("");
const [exporting, setExporting] = useState(false);
const [pagination, setPagination] = useState({
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
});
const [perPage, setPerPage] = useState(10);

const [filters, setFilters] = useState<Record<string, string[]>>({
  status: [],
});
const [openFilter, setOpenFilter] = useState<string | null>(null);
```

### Add Debounce & Effects
```typescript
useEffect(() => {
  const t = setTimeout(() => {
    setPagination((p) => ({ ...p, page: 1 }));
    setDebouncedSearch(searchQuery);
  }, 500);
  return () => clearTimeout(t);
}, [searchQuery]);

useEffect(() => {
  loadVenues();
}, [pagination.page, perPage, debouncedSearch]);
```

### Update loadVenues
```typescript
const loadVenues = async () => {
  try {
    setLoading(true);
    const response = await venuesApi.getAll({
      page: pagination.page,
      limit: perPage,
      search: debouncedSearch || undefined,
    });

    if (response.success) {
      setVenues(response.venues || []);
      setPagination(response.pagination || {
        page: 1,
        limit: perPage,
        total: (response.venues || []).length,
        totalPages: 1,
      });
    } else {
      toast({
        title: "Error",
        description: getErrorMessage(response, "Failed to load venues"),
        variant: "destructive",
      });
    }
  } catch (error: any) {
    console.error("Error loading venues:", error);
    errorHandlers.venueLoad(error, toast);
    setVenues([]);
  } finally {
    setLoading(false);
  }
};
```

### Add Filter Functions
```typescript
const getUniqueValues = (field: 'status') => {
  const values = Array.from(new Set(venues.map((v) => v[field] || "").filter(Boolean)));
  return values.sort();
};

const handleFilterToggle = (field: string, value: string) => {
  setFilters((prev) => {
    const current = prev[field] || [];
    const newValues = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    return { ...prev, [field]: newValues };
  });
};

const clearColumnFilter = (field: string) => {
  setFilters((prev) => ({ ...prev, [field]: [] }));
};

const hasActiveFilter = (field: string) => {
  return filters[field] && filters[field].length > 0;
};

const filteredVenues = venues.filter((venue) => {
  if (filters.status.length > 0 && !filters.status.includes(venue.status || "ACTIVE")) {
    return false;
  }
  return true;
});
```

### Add Export Function
```typescript
const handleExport = async () => {
  try {
    setExporting(true);
    const response = await venuesApi.getAll({
      search: debouncedSearch || undefined,
      limit: 1000,
    });

    const venuesData = response.venues || [];
    const rows = venuesData.map((v: any) => ({
      Name: v.name,
      Capacity: v.capacity || "—",
      Fee: `$${v.fee || 0}`,
      Status: v.status || "ACTIVE",
      CreatedAt: v.createdAt ? new Date(v.createdAt).toLocaleDateString() : "—",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Venues");
    XLSX.writeFile(wb, "venues_export.xlsx");

    toast({
      title: "Exported",
      description: `Exported ${rows.length} venue${rows.length === 1 ? "" : "s"}.`,
    });
  } catch (error) {
    console.error("Error exporting venues:", error);
    toast({
      title: "Export failed",
      description: "We couldn't export the venues. Please try again.",
      variant: "destructive",
    });
  } finally {
    setExporting(false);
  }
};
```

### Replace Entire Return Section
```tsx
return (
  <div className="container mx-auto p-6 space-y-6">
    <div className="flex items-center justify-between">
      <h1 className="text-3xl font-bold tracking-tight">Venue Management</h1>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={handleExport} disabled={exporting}>
          {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          {exporting ? "Exporting..." : "Export"}
        </Button>
        <Button onClick={() => navigate("/venue-setup/new")}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Venue
        </Button>
      </div>
    </div>

    {/* Search Card */}
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search venues by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Venues Table */}
    <Card>
      <CardHeader>
        <CardTitle>All Training Venues</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading venues...</span>
          </div>
        ) : filteredVenues.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No venues found</p>
            <Button onClick={() => navigate("/venue-setup/new")}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Venue
            </Button>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Venue Name</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Fee Amount</TableHead>
                  <TableHead>
                    <div className="flex items-center justify-between gap-2">
                      <span>Status</span>
                      <Popover open={openFilter === "status"} onOpenChange={(open) => setOpenFilter(open ? "status" : null)}>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className={cn("h-7 w-7 p-0", hasActiveFilter("status") && "text-primary")}>
                            <Filter className="h-3.5 w-3.5" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-0" align="start">
                          <div className="p-3 border-b">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Filter by Status</span>
                              {hasActiveFilter("status") && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => clearColumnFilter("status")}
                                >
                                  Clear
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="max-h-64 overflow-y-auto p-2">
                            {getUniqueValues("status").map((value) => (
                              <div
                                key={value}
                                className="flex items-center space-x-2 py-1.5 px-2 hover:bg-muted rounded-sm cursor-pointer"
                                onClick={() => handleFilterToggle("status", value)}
                              >
                                <Checkbox checked={filters.status?.includes(value)} />
                                <span className="text-sm">{value}</span>
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVenues.map((venue) => (
                  <TableRow key={venue.id}>
                    <TableCell className="font-medium">{venue.name}</TableCell>
                    <TableCell>{venue.capacity || "Not specified"}</TableCell>
                    <TableCell>${venue.fee}</TableCell>
                    <TableCell>{getStatusBadge(venue.status || "ACTIVE")}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/venue-detail/${venue.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/venue-setup/edit/${venue.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(venue.id, venue.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="border-t mt-4 pt-4">
              <PaginationControls
                page={pagination.page}
                perPage={perPage}
                total={pagination.total}
                onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
                onPerPageChange={(pp) => setPerPage(pp)}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  </div>
);
```

---

## File 4: PostRunManagement.tsx - Add Search + Venue Filter

### Add Imports
```typescript
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
```

### Add State (After existing bucket setup ~Line 300)
```typescript
const [searchQuery, setSearchQuery] = useState("");
const [venueFilter, setVenueFilter] = useState("ALL");
const [availableVenues, setAvailableVenues] = useState<any[]>([]);
```

### Add Load Venues Effect
```typescript
useEffect(() => {
  const loadVenues = async () => {
    try {
      const response = await venuesApi.getAll();
      if (response.success) {
        setAvailableVenues(response.venues || []);
      }
    } catch (error) {
      console.error("Error loading venues:", error);
    }
  };
  loadVenues();
}, []);
```

### Add Search Debounce
```typescript
useEffect(() => {
  const t = setTimeout(() => {
    pendingBucket.setSearch(searchQuery);
    completedBucket.setSearch(searchQuery);
  }, 500);
  return () => clearTimeout(t);
}, [searchQuery, pendingBucket, completedBucket]);
```

### Add Search + Filter Card Before Tables
```tsx
<Card className="mb-6">
  <CardContent className="pt-6">
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by course title or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      <div className="w-full sm:w-48">
        <select
          value={venueFilter}
          onChange={(e) => setVenueFilter(e.target.value)}
          className="h-9 rounded-md border bg-background px-3 py-1 text-sm w-full"
        >
          <option value="ALL">All Venues</option>
          {availableVenues.map((venue) => (
            <option key={venue.id} value={venue.id}>{venue.name}</option>
          ))}
        </select>
      </div>
    </div>
  </CardContent>
</Card>
```

---

## File 5: WaiverRequests.tsx - Add Export

### Add Imports
```typescript
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
```

### Add Export State
```typescript
const [exporting, setExporting] = useState(false);
```

### Add Export Function (Before return)
```typescript
const handleExport = async () => {
  try {
    setExporting(true);
    const response = await waiversApi.getAll({
      search: debouncedSearch || undefined,
      status: activeTab !== "ALL" ? activeTab : undefined,
      organizationId: organizationFilter !== "ALL" ? organizationFilter : undefined,
      courseId: courseFilter !== "ALL" ? courseFilter : undefined,
      limit: 1000,
    });

    const waivers = response.waiverRequests || [];
    const rows = waivers.map((w: any) => ({
      CourseRunID: w.id.slice(-4).toUpperCase(),
      LearnerName: w.learnerName,
      LearnerEmail: w.learnerEmail,
      Organization: w.organization?.name || "—",
      Course: w.courseName,
      CourseCode: w.courseCode || "—",
      WaiverReason: w.waiverReason,
      Status: w.waiverStatus,
      SubmittedDate: new Date(w.waiverSubmittedAt).toLocaleDateString(),
      ReviewedDate: w.waiverReviewedAt
        ? new Date(w.waiverReviewedAt).toLocaleDateString()
        : "—",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Waivers");
    XLSX.writeFile(wb, "waiver_requests_export.xlsx");

    toast({
      title: "Exported",
      description: `Exported ${rows.length} waiver${rows.length === 1 ? "" : "s"}.`,
    });
  } catch (error) {
    console.error("Error exporting waivers:", error);
    toast({
      title: "Export failed",
      description: "We couldn't export the waiver requests. Please try again.",
      variant: "destructive",
    });
  } finally {
    setExporting(false);
  }
};
```

### Add Export Button to CardHeader (In the flex container)
```tsx
<Button
  variant="outline"
  onClick={handleExport}
  disabled={exporting}
  size="sm"
>
  {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
  {exporting ? "Exporting..." : "Export"}
</Button>
```

---

## Complete Integration Checklist

After implementing all changes, verify:

- [ ] All imports added correctly
- [ ] All state variables declared
- [ ] All effects added
- [ ] All functions created
- [ ] Search debounce working (500ms)
- [ ] Export buttons visible
- [ ] Filters display correctly
- [ ] Pagination visible when > 10 items
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Toast notifications working
- [ ] API calls use proper parameters
- [ ] Loading states visible
- [ ] Tests pass locally

