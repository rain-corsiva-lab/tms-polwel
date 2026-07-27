import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Can } from "@/lib/casl/Can";
import api, { reportingApi } from "@/lib/api";
import { ArrowLeft, Download, Loader2, Eye, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { RunDetailsDialog } from "./RunDetailsDialog";
import { formatDate } from "@/lib/date";
import * as XLSX from "xlsx";

interface CourseRun {
  id: string;
  courseRunCode: string;
  startDate: string;
  endDate: string;
  status: string;
  course: {
    name: string;
  };
  venue: {
    id: string;
    name: string;
    location: string | null;
    capacity: number | null;
  } | null;
  _count?: {
    learners: number;
  };
}

interface FilterOptions {
  venues: Array<{ id: string; name: string }>;
  statuses: string[];
}

export default function RunsByVenue() {
  const [runs, setRuns] = useState<CourseRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [venue, setVenue] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ venues: [], statuses: [] });
  const { toast } = useToast();
  const navigate = useNavigate();

  const limit = 20;

  const getStatusChipClass = (status: string): string => {
    const baseClass = "rounded-full px-3 py-1 text-xs font-medium inline-block";
    switch (status) {
      case "PENDING":
        return `${baseClass} bg-amber-100 text-amber-800`;
      case "CONFIRMED_PENDING_TA_APPROVAL":
        return `${baseClass} bg-yellow-100 text-yellow-800`;
      case "CONFIRMED":
        return `${baseClass} bg-green-100 text-green-800`;
      case "CONFIRMED_PENDING_CONFIRMATION_EMAILS":
        return `${baseClass} bg-blue-100 text-blue-800`;
      case "IN_PROGRESS":
        return `${baseClass} bg-blue-600 text-white`;
      case "PENDING_BILLING":
        return `${baseClass} bg-amber-100 text-amber-800`;
      case "COMPLETED":
        return `${baseClass} bg-green-600 text-white`;
      case "CANCELLED":
        return `${baseClass} bg-red-100 text-red-800`;
      case "DRAFT":
        return `${baseClass} bg-gray-100 text-gray-600`;
      case "ACTIVE":
        return `${baseClass} bg-blue-600 text-white`;
      default:
        return `${baseClass} bg-gray-100 text-gray-600`;
    }
  };

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchRuns();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Immediate refetch on filter changes
  useEffect(() => {
    fetchRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, venue, status]);

  const fetchFilterOptions = async () => {
    try {
      const response = await reportingApi.getFilterOptions();
      setFilterOptions(response.data);
    } catch (error) {
      console.error("Failed to fetch filter options:", error);
    }
  };

  const fetchRuns = async () => {
    setLoading(true);
    try {
      console.log("RunsByVenue - Fetching with:", { page, search, venueId: venue, status });
      const response = await reportingApi.getRunsByVenue({
        page,
        limit,
        ...(search && { search }),
        ...(venue && { venueId: venue }),
        ...(status && { status }),
      });
      console.log("RunsByVenue - Response:", response);
      setRuns(response.data);
      setTotal(response.pagination.total);
    } catch (error: any) {
      console.error("Failed to fetch runs:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load runs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (runId: string) => {
    setSelectedRunId(runId);
    setDetailsOpen(true);
  };

  const handleExportToExcel = async () => {
    try {
      const response = await reportingApi.getRunsByVenue({
        page: 1,
        limit: 10000,
        ...(search && { search }),
        ...(venue && { venueId: venue }),
        ...(status && { status }),
      });
      const allRuns = response.data;

      const exportData = allRuns.map((run: CourseRun) => {
        const learners = run._count?.learners || 0;
        const capacity = run.venue?.capacity || 0;
        const utilization = capacity > 0 ? Math.round((learners / capacity) * 100) : 0;

        return {
          "Run Code": run.courseRunCode,
          "Course Name": run.course.name,
          Venue: run.venue?.name || "N/A",
          Location: run.venue?.location || "N/A",
          Capacity: capacity || "N/A",
          Participants: learners,
          "Utilization %": capacity > 0 ? utilization : "N/A",
          "Start Date": formatDate(run.startDate),
          "End Date": formatDate(run.endDate),
          Status: run.status,
        };
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Runs by Venue");
      XLSX.writeFile(wb, "Runs_by_Venue.xlsx");

      toast({
        title: "Success",
        description: "Report exported to Excel",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive",
      });
    }
  };

  const totalPages = Math.ceil(total / limit);

  const calculateUtilization = (run: CourseRun) => {
    const learners = run._count?.learners || 0;
    const capacity = run.venue?.capacity || 0;
    if (capacity === 0) return 0;
    return Math.round((learners / capacity) * 100);
  };

  return (
    <Can I="view" a="Reporting">
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/reporting")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Runs by Venue</h1>
              <p className="text-muted-foreground">View course runs grouped by venue with utilization stats</p>
            </div>
          </div>
          <Button onClick={handleExportToExcel} disabled={runs.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export to Excel
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search run code or course..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>
              <Select
                value={venue || "all"}
                onValueChange={(value) => {
                  setVenue(value === "all" ? "" : value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Venues" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Venues</SelectItem>
                  {filterOptions.venues.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={status || "all"}
                onValueChange={(value) => {
                  setStatus(value === "all" ? "" : value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {filterOptions.statuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : runs.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No course runs found</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Run Code</TableHead>
                      <TableHead>Course Name</TableHead>
                      <TableHead>Venue</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Participants</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.map((run) => {
                      const utilization = calculateUtilization(run);
                      return (
                        <TableRow key={run.id}>
                          <TableCell className="font-medium">{run.courseRunCode}</TableCell>
                          <TableCell>{run.course.name}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{run.venue?.name || "N/A"}</p>
                              {run.venue?.location && <p className="text-xs text-muted-foreground">{run.venue.location}</p>}
                            </div>
                          </TableCell>
                          <TableCell>{run.venue?.capacity || "N/A"}</TableCell>
                          <TableCell>{run._count?.learners || 0}</TableCell>
                          {/* <TableCell>
                            {run.venue?.capacity ? (
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  utilization >= 90
                                    ? "bg-red-100 text-red-700"
                                    : utilization >= 70
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-green-100 text-green-700"
                                }`}
                              >
                                {utilization}%
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">N/A</span>
                            )}
                          </TableCell> */}
                          <TableCell>{formatDate(run.startDate)}</TableCell>
                          <TableCell className="text-center">
                            <span className={getStatusChipClass(run.status || "")}>{run.status ? run.status.replace(/_/g, " ") : "N/A"}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleViewDetails(run.id)}>
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} results
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 1}>
                      Previous
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <RunDetailsDialog runId={selectedRunId} open={detailsOpen} onOpenChange={setDetailsOpen} />
      </div>
    </Can>
  );
}
