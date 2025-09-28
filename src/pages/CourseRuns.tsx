import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import SafeDropdownMenu from "../components/ui/safe-dropdown-menu";
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import PaginationControls from "../components/ui/pagination";
import { courseRunsApi } from "../lib/api";
import { MoreHorizontal, Search, Plus, Calendar, MapPin, Users, BookOpen } from "lucide-react";

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
  error?: string;
  message?: string;
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

interface PaginationState {
  page: number;
  total: number;
  totalPages: number;
  limit?: number;
}

const CourseRuns: React.FC = () => {
  const navigate = useNavigate();
  const [courseRuns, setCourseRuns] = useState<CourseRunUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [statusOptions, setStatusOptions] = useState<string[]>([]);

  const [perPage, setPerPage] = useState(10);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    total: 0,
    totalPages: 1,
    limit: 10,
  });

  const totalCount = pagination.total || courseRuns.length;

  // Fetch course runs data mirroring client organisation list behaviour
  const fetchCourseRuns = async (pageArg?: number, limitArg?: number) => {
    try {
      setLoading(true);
      setError(null);

      const pageToUse = pageArg ?? pagination.page;
      const limitToUse = Math.max(1, Math.min(1000, limitArg ?? perPage));

      const response: BackendCourseRunsResponse = await courseRunsApi.getAll({
        page: pageToUse,
        limit: limitToUse,
        search: searchTerm.trim() || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
      });

      if (!response.success) {
        throw new Error(response.error || response.message || "Failed to load course runs");
      }

      const transformed: CourseRunUI[] = (response.courseRuns || []).map((run) => {
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
          enrolled: run.currentParticipants ?? 0,
          minSize: run.minClassSize ?? null,
          maxSize: run.maxClassSize ?? null,
          createdAt: new Date(run.createdAt),
        };
      });

      setCourseRuns(transformed);

      if (response.pagination) {
        setPagination(response.pagination);
        if (typeof response.pagination.limit === "number") {
          setPerPage(Math.max(1, Math.min(1000, response.pagination.limit)));
        }
      } else {
        const total = transformed.length;
        setPagination({
          page: pageToUse,
          total,
          totalPages: Math.max(1, Math.ceil(total / limitToUse)),
        });
      }

      // Fetch status options once
      if (statusOptions.length === 0) {
        try {
          const statusResp = await courseRunsApi.getStatusOptions();
          if (Array.isArray(statusResp?.statusOptions)) {
            setStatusOptions(statusResp.statusOptions);
          }
        } catch (e) {
          // Ignore status option failures to avoid blocking list rendering
        }
      }
    } catch (err) {
      console.error("Error fetching course runs:", err);
      setCourseRuns([]);
      setError(err instanceof Error ? err.message : "Failed to load course runs");
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

  // Effects
  useEffect(() => {
    fetchCourseRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, statusFilter, perPage]);

  // Debounced search mirroring client organisation page
  useEffect(() => {
    const t = setTimeout(() => {
      setPagination((p) => ({ ...p, page: 1 }));
      fetchCourseRuns(1);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // Handle search
  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination((p) => ({ ...p, page }));
  };

  const handlePerPageChange = (value: number) => {
    setPerPage(value);
    setPagination((p) => ({ ...p, page: 1 }));
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
        await courseRunsApi.cancel(courseRun.id);
        fetchCourseRuns();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to cancel course run");
      }
    }
  };

  const handleDelete = async (courseRun: CourseRunUI) => {
    if (window.confirm("Are you sure you want to delete this course run? This action cannot be undone.")) {
      try {
        await courseRunsApi.delete(courseRun.id);
        fetchCourseRuns();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete course run");
      }
    }
  };

  if (isInitialLoad && loading) {
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
        <Button onClick={() => navigate("/course-runs/new")}>
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
                  value={searchTerm}
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
                <option value="ALL">All Statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status.replace(/_/g, " ")}
                  </option>
                ))}
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
              Page {pagination.page} of {Math.max(1, pagination.totalPages || Math.ceil(Math.max(1, totalCount) / perPage))}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-x-auto">
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
                          {searchTerm || statusFilter !== "ALL"
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
                            <DropdownMenuItem onClick={() => handleView(courseRun)}>View Details</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(courseRun)}>Edit Course Run</DropdownMenuItem>
                            {courseRun.status !== "CANCELLED" && courseRun.status !== "COMPLETED" && (
                              <DropdownMenuItem onClick={() => handleCancel(courseRun)} className="text-orange-600">
                                Cancel Course Run
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleDelete(courseRun)} className="text-red-600">
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
            {loading && !isInitialLoad && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                <p className="text-sm text-gray-600">Refreshing course runs&hellip;</p>
              </div>
            )}
          </div>

          <PaginationControls
            page={pagination.page}
            perPage={perPage}
            total={totalCount}
            onPageChange={handlePageChange}
            onPerPageChange={handlePerPageChange}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default CourseRuns;
