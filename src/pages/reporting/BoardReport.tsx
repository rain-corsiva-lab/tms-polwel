import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Can } from "@/lib/casl/Can";
import api, { reportingApi } from "@/lib/api";
import { ArrowLeft, Download, Loader2, Eye, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { QuarterDetailsDialog } from "./QuarterDetailsDialog";
import * as XLSX from "xlsx";

interface QuarterlyData {
  quarter: string;
  year: number;
  totalRuns: number;
  completedRuns: number;
  totalLearners: number;
  averageAttendance: number;
  totalRevenue: number;
  topCourse: string;
}

export default function BoardReport() {
  const [data, setData] = useState<QuarterlyData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedQuarter, setSelectedQuarter] = useState<{ quarter: string; year: number } | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchBoardReport();
  }, []);

  const fetchBoardReport = async () => {
    setLoading(true);
    try {
      // Fetch all years data
      const response = await reportingApi.getBoardReportAll();
      setData(response.data || []);
    } catch (error: any) {
      console.error("Failed to fetch board report:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load board report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportToExcel = () => {
    const exportData = data.map((quarter) => ({
      Quarter: quarter.quarter,
      Year: quarter.year,
      "Total Runs": quarter.totalRuns,
      "Completed Runs": quarter.completedRuns,
      "Total Participants": quarter.totalLearners,
      "Avg Attendance": `${quarter.averageAttendance}%`,
      Revenue: `$${quarter.totalRevenue.toFixed(2)}`,
      "Top Course": quarter.topCourse,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Board Report");
    XLSX.writeFile(wb, `Board_Report_All_Years.xlsx`);

    toast({
      title: "Success",
      description: "Board report exported to Excel",
    });
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
              <h1 className="text-3xl font-bold tracking-tight">Board Report</h1>
              <p className="text-muted-foreground">Quarterly performance summary</p>
            </div>
          </div>
          <Button onClick={handleExportToExcel} disabled={data.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export to Excel
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : data.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">No data available</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Quarterly Performance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quarter</TableHead>
                    <TableHead>Total Runs</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Cancelled</TableHead>
                    <TableHead>Total Revenue</TableHead>
                    <TableHead>Participants</TableHead>
                    <TableHead>Avg Attendance</TableHead>
                    <TableHead>Top Course</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((quarter) => (
                    <TableRow key={`${quarter.year}-${quarter.quarter}`}>
                      <TableCell className="font-medium">
                        {quarter.quarter} {quarter.year}
                      </TableCell>
                      <TableCell>{quarter.totalRuns}</TableCell>
                      <TableCell>{quarter.completedRuns}</TableCell>
                      <TableCell>{quarter.totalRuns - quarter.completedRuns}</TableCell>
                      <TableCell>${quarter.totalRevenue.toLocaleString()}</TableCell>
                      <TableCell>{quarter.totalLearners}</TableCell>
                      <TableCell>{quarter.averageAttendance}%</TableCell>
                      <TableCell>{quarter.topCourse || "N/A"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedQuarter({ quarter: quarter.quarter, year: quarter.year });
                            setDetailsOpen(true);
                          }}
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <QuarterDetailsDialog quarter={selectedQuarter?.quarter || ""} year={selectedQuarter?.year || 0} open={detailsOpen} onOpenChange={setDetailsOpen} />
      </div>
    </Can>
  );
}
