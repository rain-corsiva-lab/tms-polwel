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
import DateInput from "@/components/ui/date-input";

interface CourseRun {
  id: string;
  courseRunCode: string;
  startDate: string;
  endDate: string;
  status: string;
  course: {
    name: string;
  };
  clientOrganization: {
    organizationName: string;
  } | null;
}

interface FilterOptions {
  years: number[];
  months: string[];
  statuses: string[];
}

export default function RunsByPeriod() {
  const [runs, setRuns] = useState<CourseRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ years: [], months: [], statuses: [] });
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
  }, [page, startDate, endDate, status]);

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
      const resolvedStartDate = startDate ? new Date(startDate + "T00:00:00").toISOString() : undefined;
      const resolvedEndDate = endDate ? new Date(endDate + "T23:59:59").toISOString() : undefined;

      const response = await reportingApi.getRunsByPeriod({
        page,
        limit,
        ...(search && { search }),
        ...(resolvedStartDate && { startDate: resolvedStartDate }),
        ...(resolvedEndDate && { endDate: resolvedEndDate }),
        ...(status && { status }),
      });
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
      const resolvedStartDate = startDate ? new Date(startDate + "T00:00:00").toISOString() : undefined;
      const resolvedEndDate = endDate ? new Date(endDate + "T23:59:59").toISOString() : undefined;

      const response = await reportingApi.getRunsByPeriod({
        page: 1,
        limit: 10000,
        ...(search && { search }),
        ...(resolvedStartDate && { startDate: resolvedStartDate }),
        ...(resolvedEndDate && { endDate: resolvedEndDate }),
        ...(status && { status }),
      });
      const allRuns = response.data;

      const exportData = allRuns.map((run: CourseRun) => ({
        "Run Code": run.courseRunCode,
        "Course Name": run.course.name,
        Organization: run.clientOrganization?.organizationName || "N/A",
        "Start Date": formatDate(run.startDate),
        "End Date": formatDate(run.endDate),
        Status: run.status,
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Runs by Period");
      XLSX.writeFile(wb, `Runs_by_Period${startDate ? `_from_${startDate}` : ""}${endDate ? `_to_${endDate}` : ""}.xlsx`);

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

  return (
    <Can I="view" a="Reporting">
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/reporting")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Runs by Period</h1>
              <p className="text-muted-foreground">View course runs filtered by date range</p>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
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
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Start Date</label>
                <DateInput
                  value={startDate}
                  onChange={(iso) => {
                    setStartDate(iso ?? "");
                    setPage(1);
                  }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">End Date</label>
                <DateInput
                  value={endDate}
                  onChange={(iso) => {
                    setEndDate(iso ?? "");
                    setPage(1);
                  }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Status</label>
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
              <p className="text-center text-muted-foreground py-12">No course runs found for the selected period</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Run Code</TableHead>
                      <TableHead>Course Name</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.map((run) => {
                      const period = new Date(run.startDate).toLocaleDateString("en-US", { month: "long", year: "numeric" });
                      return (
                        <TableRow key={run.id}>
                          <TableCell className="font-medium">{period}</TableCell>
                          <TableCell>{run.courseRunCode}</TableCell>
                          <TableCell>{run.course.name}</TableCell>
                          <TableCell>{run.clientOrganization?.organizationName || "N/A"}</TableCell>
                          <TableCell>{formatDate(run.startDate)}</TableCell>
                          <TableCell>{formatDate(run.endDate)}</TableCell>
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
