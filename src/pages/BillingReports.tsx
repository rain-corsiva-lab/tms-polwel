import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Download, Search, X } from "lucide-react";
import { MonthInput } from "@/components/ui/month-input";
import { billingReportsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { generateConsolidatedBillingXLSX } from "@/lib/consolidatedBillingExport";

interface BillingReportData {
  id: string;
  billingMonth: string;
  totalCourseRuns: number;
  totalParticipants: number;
  contractFees: number;
  venueFees: number;
  totalAmount: number;
  totalTrainerFees: number;
  totalAdditionalFees: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  courseRunBillings?: any[];
}

export default function BillingReports() {
  const [reports, setReports] = useState<BillingReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [startMonth, setStartMonth] = useState("");
  const [endMonth, setEndMonth] = useState("");
  const [selectedReport, setSelectedReport] = useState<BillingReportData | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const { toast } = useToast();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadBillingReports();
  }, []);

  // Auto-apply filters when month range changes
  useEffect(() => {
    loadBillingReports();
  }, [startMonth, endMonth]);

  // Auto-search with 2-second debounce
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout
    searchTimeoutRef.current = setTimeout(() => {
      loadBillingReports();
    }, 2000);

    // Cleanup on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const loadBillingReports = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (startMonth) params.startMonth = startMonth;
      if (endMonth) params.endMonth = endMonth;

      const response = await billingReportsApi.list(params);

      if (response.success && Array.isArray(response.data)) {
        setReports(response.data);
      } else {
        toast({
          title: "Error",
          description: "Failed to load billing reports",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading billing reports:", error);
      toast({
        title: "Error",
        description: "Failed to load billing reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadBillingReports();
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setTimeout(() => loadBillingReports(), 100);
  };

  const handleClearMonthFilter = () => {
    setStartMonth("");
    setEndMonth("");
  };

  const handleReset = () => {
    setSearchQuery("");
    setStartMonth("");
    setEndMonth("");
    setTimeout(() => loadBillingReports(), 100);
  };

  const handleViewDetails = async (reportId: string) => {
    try {
      setDetailLoading(true);
      const response = await billingReportsApi.detail(reportId);

      if (response.success && response.data) {
        setSelectedReport(response.data);
        setShowDetailDialog(true);
      } else {
        toast({
          title: "Error",
          description: "Failed to load report details",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading report details:", error);
      toast({
        title: "Error",
        description: "Failed to load report details",
        variant: "destructive",
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDownload = async (reportId: string, billingMonth: string) => {
    try {
      toast({
        title: "Downloading...",
        description: "Preparing consolidated billing report",
      });

      const response = await billingReportsApi.exportConsolidated(reportId);

      if (response.success && response.data) {
        // Use the ExcelJS export function for proper formatting
        await generateConsolidatedBillingXLSX(response.data);

        toast({
          title: "Success",
          description: "Billing report downloaded successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to generate export file",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error downloading report:", error);
      toast({
        title: "Error",
        description: "Failed to download billing report",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      ALL_COMPLETED: {
        label: "All Completed",
        className: "bg-blue-100 text-blue-800 hover:bg-blue-200",
      },
      MIXED_STATUS: {
        label: "Mixed Status",
        className: "bg-gray-100 text-gray-800 hover:bg-gray-200",
      },
      ALL_INCOMPLETED: {
        label: "All Incompleted",
        className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
      },
    };

    const config = statusConfig[status] || statusConfig.MIXED_STATUS;

    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (loading && reports.length === 0) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="flex items-center justify-center">
          <p className="text-muted-foreground">Loading billing reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Billing Reports</h1>
            <p className="text-muted-foreground mt-1">Monthly consolidated billing reports for all course runs</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Consolidated Billing Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="md:col-span-2">
                <Label htmlFor="search">Search by month</Label>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by month and hit enter"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-9 pr-9"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      title="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="startMonth">From:</Label>
                <div className="relative mt-2">
                  <MonthInput id="startMonth" value={startMonth} onChange={(value) => setStartMonth(value || "")} />
                  {startMonth && (
                    <button
                      type="button"
                      onClick={() => setStartMonth("")}
                      className="absolute right-10 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10"
                      title="Clear start month"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="endMonth">To:</Label>
                <div className="relative mt-2">
                  <MonthInput id="endMonth" value={endMonth} onChange={(value) => setEndMonth(value || "")} />
                  {endMonth && (
                    <button
                      type="button"
                      onClick={() => setEndMonth("")}
                      className="absolute right-10 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10"
                      title="Clear end month"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* <div className="flex gap-2">
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button onClick={handleReset} variant="outline">
                Reset
              </Button>
            </div> */}

            <div className="rounded-md border mt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Total Runs</TableHead>
                    <TableHead className="text-right">Total Participants</TableHead>
                    <TableHead className="text-right">Contract Fees ($)</TableHead>
                    <TableHead className="text-right">Venue Fees ($)</TableHead>
                    <TableHead className="text-right">Trainer Fees ($)</TableHead>
                    <TableHead className="text-right">Additional Fees ($)</TableHead>
                    <TableHead className="text-right">Total Amount ($)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    // Loading skeleton
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Skeleton className="h-4 w-12 ml-auto" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Skeleton className="h-4 w-12 ml-auto" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Skeleton className="h-4 w-20 ml-auto" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Skeleton className="h-4 w-20 ml-auto" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Skeleton className="h-4 w-20 ml-auto" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Skeleton className="h-4 w-20 ml-auto" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Skeleton className="h-4 w-24 ml-auto" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-28" />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Skeleton className="h-8 w-8 rounded" />
                            <Skeleton className="h-8 w-8 rounded" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : reports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                        No billing reports found
                      </TableCell>
                    </TableRow>
                  ) : (
                    reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">{report.billingMonth}</TableCell>
                        <TableCell className="text-right">{report.totalCourseRuns}</TableCell>
                        <TableCell className="text-right">{report.totalParticipants}</TableCell>
                        <TableCell className="text-right">{formatCurrency(report.contractFees)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(report.venueFees)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(report.totalTrainerFees || 0)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(report.totalAdditionalFees || 0)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(report.totalAmount)}</TableCell>
                        <TableCell>{getStatusBadge(report.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" title="View Details" onClick={() => handleViewDetails(report.id)} disabled={detailLoading}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Download" onClick={() => handleDownload(report.id, report.billingMonth)}>
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Consolidated Billing Report - {selectedReport?.billingMonth}</DialogTitle>
            <DialogDescription>Detailed breakdown of all course runs in this billing period</DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Monthly Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-card border rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Total Course Runs</p>
                    <p className="text-2xl font-bold mt-1">{selectedReport.totalCourseRuns}</p>
                  </div>
                  <div className="bg-card border rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Total Participants</p>
                    <p className="text-2xl font-bold mt-1">{selectedReport.totalParticipants}</p>
                  </div>
                  <div className="bg-card border rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Contract Fees</p>
                    <p className="text-2xl font-bold mt-1">${formatCurrency(selectedReport.contractFees)}</p>
                  </div>
                  <div className="bg-card border rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Venue Fees</p>
                    <p className="text-2xl font-bold mt-1">${formatCurrency(selectedReport.venueFees)}</p>
                  </div>
                  <div className="bg-card border rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Trainer Fees</p>
                    <p className="text-2xl font-bold mt-1">${formatCurrency(selectedReport.totalTrainerFees || 0)}</p>
                  </div>
                  <div className="bg-card border rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Additional Fees</p>
                    <p className="text-2xl font-bold mt-1">${formatCurrency(selectedReport.totalAdditionalFees || 0)}</p>
                  </div>
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 md:col-span-3">
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-2xl font-bold mt-1 text-primary">${formatCurrency(selectedReport.totalAmount)}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Course Run Details</h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course Run Code</TableHead>
                        <TableHead>Course Title</TableHead>
                        <TableHead>Course Code</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Participants</TableHead>
                        <TableHead className="text-right">Contract Fees ($)</TableHead>
                        <TableHead className="text-right">Venue Fees ($)</TableHead>
                        <TableHead className="text-right">Trainer Fees ($)</TableHead>
                        <TableHead className="text-right">Additional Fees ($)</TableHead>
                        <TableHead className="text-right">Total Amount ($)</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedReport.courseRunBillings && selectedReport.courseRunBillings.length > 0 ? (
                        selectedReport.courseRunBillings.map((billing: any) => {
                          const courseRun = billing.courseRun;
                          const contractFee = Number(billing.contractInvoiceAmount) || 0;
                          const venueFee = Number(billing.venueInvoiceAmount) || 0;

                          // Calculate trainer fees
                          const courseRunTrainers = courseRun?.courseRunTrainers || [];
                          const trainerFees = courseRunTrainers.reduce((sum: number, trainer: any) => {
                            const baseAmount = Number(trainer.trainerBaseAmount) || 0;
                            const additionalCost = Number(trainer.additionalCost) || 0;
                            return sum + baseAmount + additionalCost;
                          }, 0);

                          // Calculate additional fees
                          const contingencyFee = Number(courseRun?.contingencyFee) || 0;
                          const adminFee = Number(courseRun?.adminFee) || 0;
                          const otherFee = Number(courseRun?.otherFee) || 0;
                          const additionalFees = contingencyFee + adminFee + otherFee;

                          const total = contractFee + venueFee;

                          return (
                            <TableRow key={billing.id}>
                              <TableCell className="font-medium">{courseRun?.serialNumber || "-"}</TableCell>
                              <TableCell>{courseRun?.course?.title || "-"}</TableCell>
                              <TableCell>{courseRun?.course?.courseCode || "-"}</TableCell>
                              <TableCell>{courseRun?.endDatetime ? formatDate(courseRun.endDatetime) : "-"}</TableCell>
                              <TableCell className="text-right">{courseRun?.courseRunLearners?.length || 0}</TableCell>
                              <TableCell className="text-right">{formatCurrency(contractFee)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(venueFee)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(trainerFees)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(additionalFees)}</TableCell>
                              <TableCell className="text-right font-semibold">{formatCurrency(total)}</TableCell>
                              <TableCell>
                                <Badge className={courseRun?.status === "COMPLETED" ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"}>
                                  {courseRun?.status === "COMPLETED" ? "Completed" : "Incomplete"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                            No course runs found in this billing report
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => handleDownload(selectedReport.id, selectedReport.billingMonth)} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download Consolidated Report
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
