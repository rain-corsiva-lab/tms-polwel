import React, { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import SafeDropdownMenu from "@/components/ui/safe-dropdown-menu";
import PaginationControls from "@/components/ui/pagination";
import { courseRunsApi } from "@/lib/api";
import { generateBillingXLSX } from "@/lib/billingExport";
import { GenerateCertificatesDialog } from "@/components/GenerateCertificatesDialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MoreHorizontal, Search, FileSpreadsheet, Award } from "lucide-react";

interface CourseRunApiRecord {
  id: string;
  serialNumber?: string | null;
  courseRunType?: string | null;
  course?: {
    id: string;
    title: string;
    courseCode: string | null;
    category?: string | null;
  } | null;
  startDatetime: string | null;
  endDatetime: string | null;
  venue?: {
    id: string;
    name: string;
    address: string | null;
  } | null;
  specifiedLocation?: string | null;
  minClassSize?: number | null;
  maxClassSize?: number | null;
  currentParticipants?: number | null;
  status: string;
}

interface CourseRunRow {
  id: string;
  courseTitle: string;
  courseCode: string;
  courseType: string;
  start: Date | null;
  end: Date | null;
  venueName: string;
  venueLocation: string;
  enrolled: number;
  minSize: number | null;
  maxSize: number | null;
  status: string;
}

type StateSetter<T> = Dispatch<SetStateAction<T>>;

interface CourseRunBucketState {
  runs: CourseRunRow[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  perPage: number;
  search: string;
  setSearch: StateSetter<string>;
  setPage: StateSetter<number>;
  setPerPage: StateSetter<number>;
  refetch: () => void;
}

const statusChipClassMap: Record<string, string> = {
  PENDING_BILLING: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-emerald-600 text-white",
};

const statusChipBaseClass = "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold";

const formatStatusLabel = (status: string): string => {
  if (!status) return "Unknown";
  return status
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
};

const formatDateRange = (start: Date | null, end: Date | null): string => {
  if (!start && !end) return "—";
  if (start && !end) {
    return start.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (!start && end) {
    return end.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const sameDay = start?.toDateString() === end?.toDateString();

  if (sameDay) {
    const dateLabel = start!.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const startTime = start!.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
    const endTime = end!.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${dateLabel} • ${startTime} - ${endTime}`;
  }

  const startLabel = start!.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const endLabel = end!.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${startLabel} → ${endLabel}`;
};

const mapCourseRun = (run: CourseRunApiRecord): CourseRunRow => {
  const start = run.startDatetime ? new Date(run.startDatetime) : null;
  const end = run.endDatetime ? new Date(run.endDatetime) : null;

  return {
    id: run.id,
    courseTitle: run.course?.title ?? "Untitled Course",
    courseCode: run.course?.courseCode ?? run.serialNumber ?? "—",
    courseType: run.courseRunType ?? run.course?.category ?? "—",
    start,
    end,
    venueName: run.venue?.name ?? "—",
    venueLocation: run.venue?.address ?? run.specifiedLocation ?? "—",
    enrolled: typeof run.currentParticipants === "number" ? run.currentParticipants : 0,
    minSize: typeof run.minClassSize === "number" ? run.minClassSize : null,
    maxSize: typeof run.maxClassSize === "number" ? run.maxClassSize : null,
    status: run.status,
  };
};

function useCourseRunBucket(status: string): CourseRunBucketState {
  const { toast } = useToast();
  const [runs, setRuns] = useState<CourseRunRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => window.clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await courseRunsApi.getAll({
          page,
          limit: perPage,
          search: debouncedSearch || undefined,
          status,
        });

        if (!response || response.success !== true) {
          throw new Error(response?.error || response?.message || "Failed to load course runs");
        }

        const rawRuns: CourseRunApiRecord[] = Array.isArray(response.courseRuns)
          ? response.courseRuns
          : Array.isArray((response as any)?.data?.courseRuns)
          ? (response as any).data.courseRuns
          : [];

        const mapped = rawRuns.map(mapCourseRun);
        const filtered = status ? mapped.filter((run) => run.status === status) : mapped;
        const filteredOut = filtered.length !== mapped.length;

        if (!isActive) return;

        setRuns(filtered);

        const pagination = response.pagination;
        if (pagination) {
          const totalItems = typeof pagination.total === "number" ? pagination.total : filtered.length;
          setTotal(filteredOut ? filtered.length : totalItems);

          if (typeof pagination.limit === "number" && pagination.limit !== perPage) {
            setPerPage(pagination.limit);
          }

          if (typeof pagination.page === "number" && pagination.page !== page) {
            setPage(pagination.page);
          }
        } else {
          setTotal(filtered.length);
        }
      } catch (err: any) {
        if (!isActive) return;
        const message = err?.message || "Failed to load course runs";
        setRuns([]);
        setTotal(0);
        setError(message);
        toast({
          title: "Unable to load course runs",
          description: message,
          variant: "destructive",
        });
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isActive = false;
    };
  }, [page, perPage, debouncedSearch, status, refreshToken, toast]);

  const refetch = useCallback(() => {
    setRefreshToken((token) => token + 1);
  }, []);

  return {
    runs,
    loading,
    error,
    total,
    page,
    perPage,
    search,
    setSearch,
    setPage,
    setPerPage,
    refetch,
  };
}

const PostRunManagement: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const pendingBucket = useCourseRunBucket("PENDING_BILLING");
  const completedBucket = useCourseRunBucket("COMPLETED");

  const { refetch: refetchPending, setPerPage: setPendingPerPage, setPage: setPendingPage } = pendingBucket;
  const { refetch: refetchCompleted, setPerPage: setCompletedPerPage, setPage: setCompletedPage } = completedBucket;

  const handleViewDetails = useCallback(
    (run: CourseRunRow) => {
      navigate(`/post-run/${run.id}`);
    },
    [navigate]
  );

  const handleViewAdministrative = useCallback(
    (run: CourseRunRow) => {
      navigate(`/course-runs/${run.id}`, { state: { focusSection: "administrative" } });
    },
    [navigate]
  );

  const handleGenerateBillingReport = useCallback(
    async (run: CourseRunRow) => {
      try {
        toast({
          title: "Generating Billing Report",
          description: `Preparing XLSX export for ${run.courseTitle}...`,
        });

        await generateBillingXLSX(run.id, run.courseCode);

        toast({
          title: "Report Downloaded",
          description: `Billing report for ${run.courseTitle} has been downloaded`,
        });
      } catch (error: any) {
        console.error("Error generating billing report:", error);
        toast({
          title: "Export Failed",
          description: error.message || "Failed to generate billing report",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const handleGenerateBilling = useCallback(
    (run: CourseRunRow) => {
      toast({
        title: "Generate billing",
        description: `Launching billing workflow for ${run.courseTitle}.`,
      });
      navigate(`/course-runs/${run.id}`, { state: { focusSection: "billing" } });
      refetchCompleted();
      refetchPending();
    },
    [navigate, refetchCompleted, refetchPending, toast]
  );

  const renderStatus = (status: string) => {
    const key = status?.toUpperCase?.() ?? "";
    const className = statusChipClassMap[key] ?? "bg-gray-100 text-gray-700";
    return <span className={`${statusChipBaseClass} ${className}`}>{formatStatusLabel(status)}</span>;
  };

  const renderTable = (bucket: CourseRunBucketState, emptyMessage: string, showGenerateBilling = false) => {
    if (bucket.loading && bucket.runs.length === 0) {
      return (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading course runs...
        </div>
      );
    }

    if (bucket.error && bucket.runs.length === 0) {
      return <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{bucket.error}</div>;
    }

    if (bucket.runs.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-muted-foreground">
          <p>{emptyMessage}</p>
          {bucket.search && (
            <Button variant="outline" onClick={() => bucket.setSearch("")}>
              Clear search
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[220px]">Course Run</TableHead>
              <TableHead className="min-w-[180px]">Schedule</TableHead>
              <TableHead className="min-w-[160px]">Venue</TableHead>
              <TableHead className="min-w-[100px]">Participants</TableHead>
              <TableHead className="min-w-[120px]">Status</TableHead>
              <TableHead className="w-[60px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bucket.runs.map((run) => (
              <TableRow key={run.id}>
                <TableCell>
                  <div className="font-medium text-foreground">{run.courseTitle}</div>
                  <div className="text-xs text-muted-foreground">{run.courseCode}</div>
                  <div className="text-xs text-muted-foreground">{run.courseType}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-foreground">{formatDateRange(run.start, run.end)}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-foreground">{run.venueName}</div>
                  <div className="text-xs text-muted-foreground">{run.venueLocation}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium text-foreground">{run.enrolled}</div>
                  <div className="text-xs text-muted-foreground">{run.maxSize ? `Capacity ${run.maxSize}` : "Capacity TBD"}</div>
                </TableCell>
                <TableCell>{renderStatus(run.status)}</TableCell>
                <TableCell className="text-right">
                  <SafeDropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewDetails(run)}>View Details</DropdownMenuItem>
                      <DropdownMenuItem>
                        <GenerateCertificatesDialog
                          courseRunId={run.id}
                          courseRunCode={run.courseCode}
                          trigger={
                            <div className="flex items-center w-full">
                              <Award className="h-4 w-4 mr-2" />
                              Administrative Matters
                            </div>
                          }
                        />
                      </DropdownMenuItem>
                      {showGenerateBilling && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleGenerateBillingReport(run)}>
                            <FileSpreadsheet className="h-4 w-4 mr-2" />
                            Generate Billing Report
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </SafeDropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const handlePendingPerPageChange = useCallback(
    (value: number) => {
      setPendingPerPage(value);
      setPendingPage(1);
    },
    [setPendingPerPage, setPendingPage]
  );

  const handleCompletedPerPageChange = useCallback(
    (value: number) => {
      setCompletedPerPage(value);
      setCompletedPage(1);
    },
    [setCompletedPerPage, setCompletedPage]
  );

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Post Run Management</h1>
          <p className="text-muted-foreground">Track pending billing runs and review recently completed courses.</p>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader className="gap-4 md:flex md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="text-xl">Pending Billing Runs</CardTitle>
              <CardDescription>
                {pendingBucket.total} run{pendingBucket.total === 1 ? "" : "s"} awaiting billing actions.
              </CardDescription>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={pendingBucket.search}
                  onChange={(event) => pendingBucket.setSearch(event.target.value)}
                  placeholder="Search course runs"
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderTable(pendingBucket, "No pending billing runs match your filters.")}
            <PaginationControls
              page={pendingBucket.page}
              perPage={pendingBucket.perPage}
              total={pendingBucket.total}
              onPageChange={(page) => setPendingPage(page)}
              onPerPageChange={handlePendingPerPageChange}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-4 md:flex md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="text-xl">Completed Course Runs</CardTitle>
              <CardDescription>
                {completedBucket.total} run{completedBucket.total === 1 ? "" : "s"} marked as completed.
              </CardDescription>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={completedBucket.search}
                  onChange={(event) => completedBucket.setSearch(event.target.value)}
                  placeholder="Search completed runs"
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderTable(completedBucket, "No completed course runs match your filters.", true)}
            <PaginationControls
              page={completedBucket.page}
              perPage={completedBucket.perPage}
              total={completedBucket.total}
              onPageChange={(page) => setCompletedPage(page)}
              onPerPageChange={handleCompletedPerPageChange}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PostRunManagement;
