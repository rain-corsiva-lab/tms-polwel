import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {quarter} {year} - Course Runs & Billing Details
          </DialogTitle>
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
