import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { reportingApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface QuarterDetailsDialogProps {
  quarter: string;
  year: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CourseRunDetail {
  id: string;
  courseRunCode: string;
  courseName: string;
  startDate: string;
  endDate: string;
  status: string;
  organization: string;
  learners: number;
  revenue: number;
}

export function QuarterDetailsDialog({ quarter, year, open, onOpenChange }: QuarterDetailsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [runs, setRuns] = useState<CourseRunDetail[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (open && quarter && year) {
      fetchQuarterDetails();
    }
  }, [open, quarter, year]);

  const fetchQuarterDetails = async () => {
    setLoading(true);
    try {
      const response = await reportingApi.getQuarterDetails(quarter, year);
      setRuns(response.data || []);
    } catch (error: any) {
      console.error("Failed to fetch quarter details:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load quarter details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = runs.reduce((sum, run) => sum + run.revenue, 0);
  const totalLearners = runs.reduce((sum, run) => sum + run.learners, 0);

  const handleExportExcel = () => {
    try {
      if (!runs || runs.length === 0) {
        toast({
          title: "No data to export",
          description: "There are no course runs to export.",
          variant: "destructive",
        });
        return;
      }

      // Import XLSX dynamically
      import("xlsx").then((XLSX) => {
        // Prepare data for export
        const exportData = runs.map((run) => ({
          "Run Code": run.courseRunCode || "",
          "Course Name": run.courseName || "",
          "Organization": run.organization || "N/A",
          "Start Date": run.startDate ? new Date(run.startDate).toLocaleDateString("en-GB") : "",
          "End Date": run.endDate ? new Date(run.endDate).toLocaleDateString("en-GB") : "",
          "Status": run.status ? run.status.replace(/_/g, " ") : "N/A",
          "Participants": run.learners || 0,
          "Revenue": `$${(run.revenue || 0).toFixed(2)}`,
        }));

        // Add summary row - TOTAL nằm dưới cột Status
        exportData.push({
          "Run Code": "",
          "Course Name": "",
          "Organization": "",
          "Start Date": "",
          "End Date": "",
          "Status": "TOTAL",
          "Participants": totalLearners,
          "Revenue": `$${totalRevenue.toFixed(2)}`,
        });

        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(exportData);

        // Set column widths
        const colWidths = [
          { wch: 15 }, // Run Code
          { wch: 30 }, // Course Name
          { wch: 25 }, // Organization
          { wch: 12 }, // Start Date
          { wch: 12 }, // End Date
          { wch: 20 }, // Status
          { wch: 12 }, // Participants
          { wch: 15 }, // Revenue
        ];
        ws["!cols"] = colWidths;

        // Create workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Quarter Details");

        // Generate filename
        const filename = `${quarter}_${year}_Course_Runs_Details.xlsx`;

        // Save file
        XLSX.writeFile(wb, filename);

        toast({
          title: "Export successful",
          description: `Quarter details exported to ${filename}`,
        });
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export failed",
        description: "Failed to export quarter details. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {quarter} {year} - Course Runs & Billing Details
            </DialogTitle>
            {!loading && runs.length > 0 && (
              <Button onClick={handleExportExcel} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export to Excel
              </Button>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : runs.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">No course runs found for this quarter</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Runs</p>
                <p className="text-2xl font-bold">{runs.length}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Participants</p>
                <p className="text-2xl font-bold">{totalLearners}</p>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Run Code</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Participants</TableHead>
                  <TableHead>Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-medium">{run.courseRunCode}</TableCell>
                    <TableCell>{run.courseName}</TableCell>
                    <TableCell>{run.organization || "N/A"}</TableCell>
                    <TableCell>{new Date(run.startDate).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(run.endDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">{run.status ? run.status.replace("_", " ") : "N/A"}</span>
                    </TableCell>
                    <TableCell>{run.learners}</TableCell>
                    <TableCell>${run.revenue.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
