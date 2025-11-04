import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Download, Search, Calendar } from "lucide-react";
import { billingReportsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface BillingReportData {
  id: string;
  billingMonth: string;
  totalCourseRuns: number;
  totalParticipants: number;
  contractFees: number;
  venueFees: number;
  totalAmount: number;
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

  useEffect(() => {
    loadBillingReports();
  }, []);

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
        // Import XLSX library dynamically
        const XLSX = await import("xlsx");

        const exportData = response.data;

        // Create workbook
        const wb = XLSX.utils.book_new();

        // Summary Sheet
        const summaryData = [
          ["Consolidated Billing Report"],
          ["Month:", exportData.billingMonth],
          ["Status:", exportData.status?.replace(/_/g, " ")],
          [""],
          ["Total Course Runs:", exportData.totalCourseRuns],
          ["Total Participants:", exportData.totalParticipants],
          ["Contract Fees:", exportData.contractFees],
          ["Venue Fees:", exportData.venueFees],
          ["Total Amount:", exportData.totalAmount],
        ];

        const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summaryWS, "Summary");

        // Course Runs Sheet
        const courseRunsData = [
          [
            "Course Run Code",
            "Course Title",
            "Course Code",
            "Start Date",
            "End Date",
            "Venue",
            "Participants",
            "Contract Fees",
            "Venue Fees",
            "Total Amount",
            "Status",
          ],
          ...exportData.courseRuns.map((cr: any) => [
            cr.courseRunCode,
            cr.courseTitle,
            cr.courseCode,
            cr.startDate ? new Date(cr.startDate).toLocaleDateString("en-GB") : "",
            cr.endDate ? new Date(cr.endDate).toLocaleDateString("en-GB") : "",
            cr.venue,
            cr.participants,
            cr.contractFees,
            cr.venueFees,
            cr.totalAmount,
            cr.status,
          ]),
        ];

        const courseRunsWS = XLSX.utils.aoa_to_sheet(courseRunsData);
        XLSX.utils.book_append_sheet(wb, courseRunsWS, "Course Runs");

        // Generate and download file
        const filename = `Consolidated_Billing_Report_${billingMonth.replace(" ", "_")}.xlsx`;
        XLSX.writeFile(wb, filename);

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
                    placeholder="Search by month and hit enter  "
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-9"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="startMonth">From:</Label>
                <div className="relative mt-2">
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                  <Input id="startMonth" type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} className="pr-9" />
                </div>
              </div>

              <div>
                <Label htmlFor="endMonth">To:</Label>
                <div className="relative mt-2">
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                  <Input id="endMonth" type="month" value={endMonth} onChange={(e) => setEndMonth(e.target.value)} className="pr-9" />
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
                    <TableHead className="text-right">Total Amount ($)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
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
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 md:col-span-2">
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
                          <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
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
