import React, { useState, useEffect, useMemo } from "react";
import { authService } from "../lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import SafeDropdownMenu from "../components/ui/safe-dropdown-menu";
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { MoreHorizontal, Search, Plus, Calendar, MapPin, Users, BookOpen, Filter } from "lucide-react";

// Raw shape from backend
interface BackendCourseRun {
  id: string;
  serialNumber?: string | null;
  courseRunType?: string | null;
  course: {
    id: string;
    title: string;
    courseCode: string | null;
    category?: string | null;
  };
  startDatetime: string | null;
  endDatetime: string | null;
  venue: {
    id: string;
    name: string;
    address: string | null;
  } | null;
  venueType?: string | null;
  specifiedLocation?: string | null;
  minClassSize?: number | null;
  maxClassSize?: number | null;
  currentParticipants?: number | null; // from _count
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface BackendPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface BackendCourseRunsResponse {
  success: boolean;
  courseRuns: BackendCourseRun[];
  pagination: BackendPagination;
}

// Normalized shape for UI
interface CourseRunUI {
  id: string;
  title: string;
  code: string;
  courseType: string;
  venueName: string;
  venueLocation: string;
  start: Date | null;
  end: Date | null;
  status: string;
  enrolled: number;
  minSize: number | null;
  maxSize: number | null;
  createdAt: Date;
}

const CourseRuns: React.FC = () => {
  const [courseRuns, setCourseRuns] = useState<CourseRunUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination and filtering state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  // local debounced term to avoid firing request on every keystroke
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [statusOptions, setStatusOptions] = useState<string[]>([]);

  // Fetch course runs data
  const fetchCourseRuns = async () => {
    try {
      setLoading(true);
      setError(null);
      // sanitize pagination values to reasonable integers
      const pageNum = Number.isFinite(Number(currentPage)) && Number(currentPage) > 0 ? Math.floor(Number(currentPage)) : 1;
      const limitNum = Number.isFinite(Number(itemsPerPage)) && Number(itemsPerPage) > 0 ? Math.min(1000, Math.floor(Number(itemsPerPage))) : 10;

      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: limitNum.toString(),
      });

      // prefer debouncedSearch (updated after a small delay) to avoid flooding server
      if (debouncedSearch.trim()) {
        params.append("search", debouncedSearch);
      }

      if (statusFilter && statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      const data: BackendCourseRunsResponse = await authService.apiRequest(`/course-runs?${params}`);
      if (!data || data.success === false) {
        throw new Error((data as any)?.error || "Failed to load course runs");
      }

      // Transform backend runs to UI shape
      const transformed: CourseRunUI[] = (data.courseRuns || []).map((run) => {
        const start = run.startDatetime ? new Date(run.startDatetime) : null;
        const end = run.endDatetime ? new Date(run.endDatetime) : null;
        return {
          id: run.id,
          title: run.course?.title || "Untitled Course",
          code: run.course?.courseCode || run.serialNumber || "-",
          courseType: run.courseRunType || run.course?.category || "-",
          venueName: run.venue?.name || "—",
          venueLocation: run.venue?.address || run.specifiedLocation || "—",
          start,
          end,
          status: run.status,
          // backend provides count object already aggregated
          enrolled: run.currentParticipants ?? 0,
          minSize: run.minClassSize ?? null,
          maxSize: run.maxClassSize ?? null,
          createdAt: new Date(run.createdAt),
        };
      });

      setCourseRuns(transformed);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.total || transformed.length);

      // Fetch status options separately if not loaded
      if (statusOptions.length === 0) {
        try {
          const statusResp = await authService.apiRequest(`/course-runs/status-options`);
          if (statusResp?.statusOptions) setStatusOptions(statusResp.statusOptions);
        } catch (e) {
          // silently ignore
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Effects
  useEffect(() => {
    fetchCourseRuns();
  }, [currentPage, itemsPerPage, debouncedSearch, statusFilter]);

  // debounce search input: mirror approach used in ClientOrganisations.tsx
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Handle search
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1); // Reset to first page on search
  };

  // Handle status filter
  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1); // Reset to first page on filter
  };

  // Handle items per page change
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // Reset to first page
  };

  // Format date and time
  const formatRange = (start: Date | null, end: Date | null) => {
    if (!start) return "—";
    const opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" };
    const startStr = start.toLocaleString(undefined, opts);
    if (!end) return startStr;
    const endStr = end.toLocaleString(undefined, opts);
    return `${startStr} → ${endStr}`;
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "secondary";
      case "PUBLISHED":
        return "default";
      case "ONGOING":
        return "default";
      case "COMPLETED":
        return "default";
      case "CANCELLED":
        return "destructive";
      default:
        return "secondary";
    }
  };

  // Action handlers
  const handleView = (courseRun: CourseRunUI) => {
    // Navigate to course run detail page
    console.log("View course run:", courseRun.id);
  };

  const handleEdit = (courseRun: CourseRunUI) => {
    // Navigate to course run edit page
    console.log("Edit course run:", courseRun.id);
  };

  const handleCancel = async (courseRun: CourseRunUI) => {
    if (window.confirm("Are you sure you want to cancel this course run?")) {
      try {
        await authService.apiRequest(`/course-runs/${courseRun.id}/cancel`, { method: "POST" });
        fetchCourseRuns(); // Refresh data
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to cancel course run");
      }
    }
  };

  const handleDelete = async (courseRun: CourseRunUI) => {
    if (window.confirm("Are you sure you want to delete this course run? This action cannot be undone.")) {
      try {
        await authService.apiRequest(`/course-runs/${courseRun.id}`, { method: "DELETE" });
        fetchCourseRuns(); // Refresh data
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete course run");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading course runs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Course Run Management</h1>
          <p className="text-gray-600">Manage and monitor course run schedules and enrollments</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Course Run
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by course title, code, or venue..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter (native select to avoid popup/portal scroll-jump issues) */}
            <div className="w-full sm:w-48">
              <label className="sr-only" htmlFor="statusFilterSelect">
                Status
              </label>
              <select
                id="statusFilterSelect"
                value={statusFilter}
                onChange={(e) => handleStatusFilter(e.target.value)}
                className="h-9 rounded-md border bg-background px-3 py-1 text-sm w-full"
              >
                <option value="all">All Statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0) + status.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Items per page (native select for stability) */}
            <div className="w-full sm:w-32">
              <label className="sr-only" htmlFor="perPageSelect">
                Per page
              </label>
              <select
                id="perPageSelect"
                value={itemsPerPage.toString()}
                onChange={(e) => handleItemsPerPageChange(e.target.value)}
                className="h-9 rounded-md border bg-background px-3 py-1 text-sm w-full"
              >
                <option value="5">5 per page</option>
                <option value="10">10 per page</option>
                <option value="25">25 per page</option>
                <option value="50">50 per page</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-red-600">
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Course Runs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Course Runs ({totalCount})</span>
            <span className="text-sm font-normal text-gray-500">
              Page {currentPage} of {totalPages}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course Details</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Participants</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Course Type</TableHead>
                  <TableHead className="w-[50px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courseRuns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-gray-500">
                        <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">No course runs found</p>
                        <p className="text-sm">
                          {searchQuery || statusFilter !== "all"
                            ? "Try adjusting your search or filter criteria."
                            : "Create your first course run to get started."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  courseRuns.map((courseRun) => (
                    <TableRow key={courseRun.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900">{courseRun.title}</div>
                          <div className="text-sm text-gray-500">Code: {courseRun.code}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium">{formatRange(courseRun.start, courseRun.end)}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium">{courseRun.venueName}</div>
                            <div className="text-sm text-gray-500">{courseRun.venueLocation}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium">
                              {courseRun.enrolled} / {courseRun.minSize ?? "—"}
                            </div>
                            <div className="text-xs text-gray-500">Max: {courseRun.maxSize ?? "—"}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(courseRun.status)}>{courseRun.status.replace(/_/g, " ")}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{courseRun.courseType}</span>
                      </TableCell>
                      <TableCell>
                        <SafeDropdownMenu>
                          <DropdownMenuTrigger asChild>
                            {/* preventDefault on mouseDown to match PolwelUsers pattern and avoid focus/scroll issues */}
                            <Button variant="ghost" size="icon" className="h-8 w-8 p-0" onMouseDown={(e) => e.preventDefault()}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(courseRun as any)}>View Details</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(courseRun as any)}>Edit Course Run</DropdownMenuItem>
                            {courseRun.status !== "CANCELLED" && courseRun.status !== "COMPLETED" && (
                              <DropdownMenuItem onClick={() => handleCancel(courseRun as any)} className="text-orange-600">
                                Cancel Course Run
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleDelete(courseRun as any)} className="text-red-600">
                              Delete Course Run
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </SafeDropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6">
              <div className="text-sm text-gray-500">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} course runs
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
                  Previous
                </Button>
                <div className="flex space-x-1">
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const pageNum = Math.max(1, currentPage - 2) + i;
                    if (pageNum > totalPages) return null;

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CourseRuns;
