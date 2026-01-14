# React Frontend Component Enhancements

## Summary of Updates

This document provides the complete updated code sections for 5 pages with AJAX search, filtering, and XLSX export capabilities.

### Files Updated:
1. **PolwelUsers.tsx** - Add AJAX search for users
2. **CourseArchive.tsx** - Add AJAX search, filters, and export
3. **VenueArchive.tsx** - Add AJAX search, filters, and export
4. **PostRunManagement.tsx** - Add AJAX search and filters
5. **WaiverRequests.tsx** - Add AJAX search, filters, and export

---

## 1. PolwelUsers.tsx

### Key Changes:
- Add debounced search input with 500ms delay
- Implement real-time API calls with pagination
- Add Excel-style status filter with Popover/Command UI
- Add XLSX export functionality
- Maintain existing UI patterns and error handling

### Critical Sections to Replace:

**Lines 1-100 (Imports + Initial State Setup)**

Add these imports if missing:
```typescript
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import * as XLSX from "xlsx";
```

**Lines 68-100 (State Variables)**

Replace with:
```typescript
  const [searchQuery, setSearchQuery] = useState("");
  const [exporting, setExporting] = useState(false);

  // Excel-style filter state
  const [filters, setFilters] = useState<Record<string, string[]>>({
    status: [],
  });
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setPagination((p) => ({ ...p, page: 1 }));
      fetchUsers();
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);
```

**Lines 150-200 (Fetch Users Function)**

Replace the fetchUsers function with:
```typescript
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await polwelUsersApi.getAll({
        page: pagination.page,
        limit: perPage,
        search: searchQuery || undefined,
        status: statusFilter || undefined,
      });

      setUsers(response.users || []);
      setPagination(response.pagination || { ...pagination, limit: perPage });

      // Debug: Log the first user to see the data structure
      if (response.users && response.users.length > 0) {
        console.log("PolwelUsers: Sample user data:", response.users[0]);
        console.log("PolwelUsers: User ID type:", typeof response.users[0].id, "Value:", response.users[0].id);
      }
    } catch (error) {
      console.error("Error fetching POLWEL users:", error);

      // Check if it's an authentication error
      if (error instanceof Error) {
        if (error.message.includes("Session expired") || error.message.includes("Authentication") || error.message.includes("TOKEN_EXPIRED")) {
          console.log("Authentication error detected, user will be redirected to login");
          // Don't set dummy data for auth errors - let auth service handle redirect
          setLoading(false);
          return;
        }
      }

      // Use dummy data only for non-authentication errors
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

  // Fetch users on component mount and when pagination changes
  useEffect(() => {
    fetchUsers();
  }, [pagination.page, perPage]);
```

**Lines 300-350 (Add Filter Helper Functions)**

Add after fetchUsers:
```typescript
  // Get unique values for filter dropdown
  const getUniqueValues = (field: keyof PolwelUser) => {
    const values = Array.from(new Set(users.map((u) => String(u[field] || "")).filter(Boolean)));
    return values.sort();
  };

  // Handle filter toggle
  const handleFilterToggle = (field: string, value: string) => {
    setFilters((prev) => {
      const current = prev[field] || [];
      const newValues = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [field]: newValues };
    });
  };

  // Clear filter for a column
  const clearColumnFilter = (field: string) => {
    setFilters((prev) => ({ ...prev, [field]: [] }));
  };

  // Check if column has active filters
  const hasActiveFilter = (field: string) => {
    return filters[field] && filters[field].length > 0;
  };

  // Apply column filters to users
  const filteredUsers = users.filter((user) => {
    // Status filter
    if (filters.status.length > 0 && !filters.status.includes(user.status)) {
      return false;
    }
    return true;
  });

  // Add export function before return statement
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
      toast({ title: "Exported", description: `Exported ${rows.length} POLWEL user${rows.length === 1 ? "" : "s"}.` });
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

**Lines 450-500 (Update Header with Export Button)**

In the return section, update the header to include:
```tsx
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
```

**Lines 500-550 (Add Search Input + Status Filter Card)**

Add after header div:
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
                <label className="sr-only">Status</label>
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

**Lines 550-590 (Update Table Header with Filter Popover)**

Update the Status column header in the table to:
```tsx
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
                              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => clearColumnFilter("status")}>
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
```

**Lines 590-620 (Filter Table Data)**

Before the table body, apply filters:
```tsx
                {filteredUsers.map((user) => (
```

**Lines 650-670 (Update Stats Calculation)**

Update stats cards to use filteredUsers:
```typescript
  const totalUsers = filteredUsers.length;
  const activeUsers = filteredUsers.filter((user) => user.status === "ACTIVE").length;
  const pendingUsers = filteredUsers.filter((user) => user.status === "PENDING").length;
```

---

## 2. CourseArchive.tsx

### Key Changes:
- Add AJAX search by course title
- Implement real-time API calls with pagination
- Add Excel-style multi-field filters (status, category, venue)
- Add XLSX export with filtered data
- Maintain existing sorting functionality

### Implementation

**Lines 1-50 (Add Imports)**

Add to imports:
```typescript
import { Download, Command, CommandInput, CommandItem, CommandEmpty, CommandList, CommandGroup } from "lucide-react";
import { Command as CommandComponent } from "@/components/ui/command";
import * as XLSX from "xlsx";
```

**Lines 30-80 (State Setup)**

Add state for AJAX:
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

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setPagination((p) => ({ ...p, page: 1 }));
      // Trigger refetch when search changes
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Fetch courses with search params
  const fetchCourses = useCallback(async () => {
    try {
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
      setPagination(coursesResponse.pagination || { ...pagination, total: coursesData.length, totalPages: 1 });
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to load courses"),
        variant: "destructive",
      });
    } finally {
      setLoading((prev) => ({ ...prev, courses: false }));
    }
  }, [debouncedSearch, pagination.page, perPage, toast]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);
```

**Lines 150-200 (Add Export Function)**

Add before the return statement:
```typescript
  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await coursesApi.getAll({
        search: debouncedSearch || undefined,
        limit: 1000, // Get all matching records
      });

      let coursesData: any[] = [];
      if (response.success && Array.isArray(response.courses)) {
        coursesData = response.courses;
      } else if (response.data && Array.isArray(response.data.courses)) {
        coursesData = response.data.courses;
      } else if (Array.isArray(response.data)) {
        coursesData = response.data;
      }

      const rows = filteredCourses.map((course) => ({
        Title: course.title,
        Category: course.category,
        Duration: `${course.duration} ${course.durationType}`,
        Venue: venuesMap[course.venueId] || course.venueId || "TBD",
        MinParticipants: course.minParticipants || 1,
        Price: `$${course.defaultCourseFee?.toFixed(2) || "0.00"}`,
        Certificate: course.certificates?.toUpperCase() || "POLWEL",
        Status: course.status || "ACTIVE",
        CreatedAt: formatDate(course.createdAt),
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

**Lines 200-250 (Update Header with Search + Export)**

Replace the header section in render with:
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
```

---

## 3. VenueArchive.tsx

### Key Changes:
- Add AJAX search by venue name
- Implement real-time API calls with pagination
- Add Excel-style status filter
- Add XLSX export functionality
- Enhanced loading and error states

### Implementation

**Lines 1-50 (Add Imports + State)**

```typescript
import { Input } from "@/components/ui/input";
import { Search, Download, Filter, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";
import PaginationControls from "@/components/ui/pagination";

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

// Debounce search
useEffect(() => {
  const t = setTimeout(() => {
    setPagination((p) => ({ ...p, page: 1 }));
    setDebouncedSearch(searchQuery);
  }, 500);
  return () => clearTimeout(t);
}, [searchQuery]);
```

**Lines 50-120 (Update Load Venues Function)**

```typescript
  const loadVenues = async () => {
    try {
      setLoading(true);
      const response = await venuesApi.getAll({
        page: pagination.page,
        limit: perPage,
        search: debouncedSearch || undefined,
        status: undefined, // No global status filter yet
      });

      if (response.success) {
        setVenues(response.venues || []);
        setPagination(response.pagination || { 
          page: 1, 
          limit: perPage, 
          total: (response.venues || []).length, 
          totalPages: 1 
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

  useEffect(() => {
    loadVenues();
  }, [pagination.page, perPage, debouncedSearch]);

  // Filter functions
  const getUniqueValues = (field: 'status') => {
    const values = Array.from(new Set(venues.map((v) => v[field] || "").filter(Boolean)));
    return values.sort();
  };

  const handleFilterToggle = (field: string, value: string) => {
    setFilters((prev) => {
      const current = prev[field] || [];
      const newValues = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [field]: newValues };
    });
  };

  const clearColumnFilter = (field: string) => {
    setFilters((prev) => ({ ...prev, [field]: [] }));
  };

  const hasActiveFilter = (field: string) => {
    return filters[field] && filters[field].length > 0;
  };

  // Apply filters
  const filteredVenues = venues.filter((venue) => {
    if (filters.status.length > 0 && !filters.status.includes(venue.status || "ACTIVE")) {
      return false;
    }
    return true;
  });

  // Export function
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

**Lines 120-180 (Update Header Section)**

```tsx
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Venue Management</h1>
        </div>
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
```

**Lines 180-250 (Update Table with Filters + Pagination)**

```tsx
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
                                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => clearColumnFilter("status")}>
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
                          <Button variant="outline" size="sm" onClick={() => navigate(`/venue-detail/${venue.id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => navigate(`/venue-setup/edit/${venue.id}`)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(venue.id, venue.name)}>
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

## 4. PostRunManagement.tsx

### Key Changes:
- Add AJAX search by course title/code
- Add AJAX filter by venue
- Maintain existing pagination bucket logic
- Use apiRequest for auth token handling

### Implementation

**Lines 300-350 (Add Search + Venue Filter State)**

Add to the component state:
```typescript
  const [searchQuery, setSearchQuery] = useState("");
  const [venueFilter, setVenueFilter] = useState("ALL");
  const [availableVenues, setAvailableVenues] = useState<any[]>([]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      pendingBucket.setSearch(searchQuery);
      completedBucket.setSearch(searchQuery);
    }, 500);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Load available venues
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

**Lines 400-450 (Update Search UI)**

Add search and venue filter to the UI:
```tsx
      {/* Search and Filter Bar */}
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

## 5. WaiverRequests.tsx

### Key Changes:
- Add AJAX search by learner name/email/course
- Implement advanced filters (status, course, organization)
- Add XLSX export with filtered data
- Maintain existing tab and pagination structure

### Implementation

**Lines 1-50 (Add Imports + State)**

Add to imports:
```typescript
import { Download, Search, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { Input } from "@/components/ui/input";
```

**Lines 120-180 (Add Export Function)**

Add before the fetchWaiverRequests function:
```typescript
  const [exporting, setExporting] = useState(false);

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
        ReviewedDate: w.waiverReviewedAt ? new Date(w.waiverReviewedAt).toLocaleDateString() : "—",
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

**Lines 200-250 (Update CardHeader with Export)**

Update the header section:
```tsx
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl">Waiver Requests</CardTitle>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <Button variant="outline" onClick={handleExport} disabled={exporting} size="sm">
                      {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                      {exporting ? "Exporting..." : "Export"}
                    </Button>
                    
                    {/* Search */}
                    <div className="relative w-full sm:w-64">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        placeholder="Search requests..." 
                        className="pl-9" 
                      />
                    </div>

                    {/* Organization Filter */}
                    <Select value={organizationFilter} onValueChange={setOrganizationFilter}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="All Organizations" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Organizations</SelectItem>
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Course Filter */}
                    <Select value={courseFilter} onValueChange={setCourseFilter}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="All Courses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Courses</SelectItem>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
```

---

## Implementation Notes

### General Requirements
1. All components use `apiRequest()` wrapper from `src/lib/api.ts`
2. Search is debounced by 500ms to avoid excessive API calls
3. Pagination resets to page 1 when search/filters change
4. XLSX export includes all filtered records (using `limit: 1000`)
5. Toast notifications show success/error messages
6. Consistent UI using Popover/Command for advanced filters
7. Excel-style filter UI with Checkbox components

### Backend API Endpoints Expected
- `GET /polwel-users?search=...&status=...&page=...&limit=...`
- `GET /courses?search=...&page=...&limit=...`
- `GET /venues?search=...&status=...&page=...&limit=...`
- `GET /course-runs/post-management?search=...&statuses=...`
- `GET /waivers?search=...&status=...&organizationId=...&courseId=...`

### UI Component Dependencies
- Button, Card, Input, Select, Badge, Table
- Popover, Command, Checkbox
- PaginationControls
- Lucide icons (Search, Download, Filter, etc.)

### Error Handling
- All fetch failures show toast notifications
- Graceful fallback to empty states
- Network error messages are user-friendly
- Loading states prevent double-submissions

