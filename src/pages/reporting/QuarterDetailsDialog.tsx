import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Download, ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { reportingApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/date";

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
  courseRunType: string | null;
}

interface CourseBreakdownItem {
  courseName: string;
  learners: number;
  org: string;
}

interface MonthCoursesByType {
  OPEN: CourseBreakdownItem[];
  DEDICATED: CourseBreakdownItem[];
  CUSTOMIZED: CourseBreakdownItem[];
  TALKS: CourseBreakdownItem[];
}

interface MonthSummaryRow {
  month: string;
  monthIndex: number;
  openRuns: number;
  dedicatedRuns: number;
  customizedRuns: number;
  talks: number;
  coursesByType: MonthCoursesByType;
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getRunTypeLabel(courseRunType: string | null, org: string): string {
  switch (courseRunType) {
    case "OPEN":
      return "";
    case "DEDICATED":
      return org && org !== "N/A" ? `Dedicated-${org}` : "Dedicated";
    case "TALKS":
      return "Talks";
    case "CUSTOMIZED":
      return "Customized";
    default:
      return "";
  }
}

export function QuarterDetailsDialog({ quarter, year, open, onOpenChange }: QuarterDetailsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [runs, setRuns] = useState<CourseRunDetail[]>([]);
  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    if (open && quarter && year) {
      fetchQuarterDetails();
    }
    // Reset expanded state when dialog opens/closes
    if (!open) setExpandedMonths(new Set());
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

  // Table 1: Course summary grouped by (courseName, runTypeLabel)
  const courseSummary = useMemo(() => {
    const groups = new Map<string, { courseName: string; runCount: number; totalAttendees: number; runTypeLabel: string }>();
    for (const run of runs) {
      const runTypeLabel = getRunTypeLabel(run.courseRunType, run.organization);
      const key = `${run.courseName}__${runTypeLabel}`;
      if (groups.has(key)) {
        const g = groups.get(key)!;
        g.runCount++;
        g.totalAttendees += run.learners;
      } else {
        groups.set(key, { courseName: run.courseName, runCount: 1, totalAttendees: run.learners, runTypeLabel });
      }
    }
    return Array.from(groups.values()).sort((a, b) => a.courseName.localeCompare(b.courseName));
  }, [runs]);

  // Table 2: Monthly breakdown
  const monthlySummary = useMemo((): MonthSummaryRow[] => {
    const monthMap = new Map<number, MonthSummaryRow>();
    for (const run of runs) {
      const monthIdx = new Date(run.startDate!).getMonth();
      if (!monthMap.has(monthIdx)) {
        monthMap.set(monthIdx, {
          month: MONTH_NAMES[monthIdx],
          monthIndex: monthIdx,
          openRuns: 0,
          dedicatedRuns: 0,
          customizedRuns: 0,
          talks: 0,
          coursesByType: { OPEN: [], DEDICATED: [], CUSTOMIZED: [], TALKS: [] },
        });
      }
      const m = monthMap.get(monthIdx)!;
      const type = (run.courseRunType as keyof MonthCoursesByType) || "OPEN";
      switch (type) {
        case "OPEN":
          m.openRuns++;
          break;
        case "DEDICATED":
          m.dedicatedRuns++;
          break;
        case "CUSTOMIZED":
          m.customizedRuns++;
          break;
        case "TALKS":
          m.talks++;
          break;
      }
      const bucket: CourseBreakdownItem[] = m.coursesByType[type] ?? m.coursesByType.OPEN;
      const existing = bucket.find((c) => c.courseName === run.courseName);
      if (existing) {
        existing.learners += run.learners;
      } else {
        bucket.push({ courseName: run.courseName, learners: run.learners, org: run.organization });
      }
    }
    return Array.from(monthMap.values()).sort((a, b) => a.monthIndex - b.monthIndex);
  }, [runs]);

  const toggleMonth = (monthIdx: number) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(monthIdx)) next.delete(monthIdx);
      else next.add(monthIdx);
      return next;
    });
  };

  const handleExportExcel = () => {
    if (!runs || runs.length === 0) {
      toast({ title: "No data to export", description: "There are no course runs to export.", variant: "destructive" });
      return;
    }
    import("xlsx")
      .then((XLSX) => {
        const exportData = runs.map((run) => ({
          "Run Code": run.courseRunCode || "",
          "Course Name": run.courseName || "",
          Organization: run.organization || "N/A",
          "Start Date": formatDate(run.startDate),
          "End Date": formatDate(run.endDate),
          Status: run.status ? run.status.replace(/_/g, " ") : "N/A",
          "Run Type": getRunTypeLabel(run.courseRunType, run.organization) || run.courseRunType || "",
          Participants: run.learners || 0,
          Revenue: `$${(run.revenue || 0).toFixed(2)}`,
        }));
        exportData.push({
          "Run Code": "",
          "Course Name": "",
          Organization: "",
          "Start Date": "",
          "End Date": "",
          Status: "TOTAL",
          "Run Type": "",
          Participants: totalLearners,
          Revenue: `$${totalRevenue.toFixed(2)}`,
        });
        const ws = XLSX.utils.json_to_sheet(exportData);
        ws["!cols"] = [{ wch: 15 }, { wch: 30 }, { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 15 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Quarter Details");
        XLSX.writeFile(wb, `${quarter}_${year}_Course_Runs_Details.xlsx`);
        toast({ title: "Export successful", description: `Exported to ${quarter}_${year}_Course_Runs_Details.xlsx` });
      })
      .catch(() => {
        toast({ title: "Export failed", description: "Failed to export quarter details.", variant: "destructive" });
      });
  };

  const renderTypeSection = (label: string, items: CourseBreakdownItem[], showOrg: boolean, colorClass: string, headerBg: string) => {
    if (items.length === 0) return null;
    const totalSectionLearners = items.reduce((s, c) => s + c.learners, 0);
    return (
      <div className="mb-3">
        <table className="w-full text-sm">
          <thead>
            <tr className={headerBg}>
              <th className={`text-left py-1.5 px-3 font-semibold ${colorClass}`}>{label}</th>
              <th className={`text-right py-1.5 px-3 font-semibold ${colorClass} w-28`}>Learner Count</th>
              {showOrg && <th className={`text-left py-1.5 px-3 font-semibold ${colorClass} w-48`}>Organisation</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                <td className="py-1 px-3 italic">{item.courseName}</td>
                <td className="py-1 px-3 text-right">{item.learners}</td>
                {showOrg && <td className="py-1 px-3 text-muted-foreground text-xs">{item.org && item.org !== "N/A" ? item.org : "—"}</td>}
              </tr>
            ))}
            <tr className="border-t font-medium">
              <td className="py-1 px-3">Total</td>
              <td className="py-1 px-3 text-right">{totalSectionLearners}</td>
              {showOrg && <td />}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {quarter} {year} — Course Runs &amp; Billing Details
            </DialogTitle>
            {!loading && runs.length > 0 && (
              <Button onClick={handleExportExcel} size="sm" className="mr-6">
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
          <div className="space-y-6">
            {/* Summary cards */}
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

            {/* Table 1 — Course Summary */}
            <div>
              <h3 className="text-base font-semibold mb-2">Course Summary</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead className="text-right w-36">No. of Runs During Period</TableHead>
                    <TableHead className="text-right w-36">Total No. of Attendees</TableHead>
                    <TableHead className="w-44">Run Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courseSummary.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{row.courseName}</TableCell>
                      <TableCell className="text-right">{row.runCount}</TableCell>
                      <TableCell className="text-right">{row.totalAttendees}</TableCell>
                      <TableCell>
                        {row.runTypeLabel ? <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">{row.runTypeLabel}</span> : null}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/40 font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{runs.length}</TableCell>
                    <TableCell className="text-right">{totalLearners}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Table 2 — Monthly Breakdown with expandable rows */}
            <div>
              <h3 className="text-base font-semibold mb-2">Monthly Breakdown</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Month</TableHead>
                    <TableHead className="text-right w-28">Open Runs</TableHead>
                    <TableHead className="text-right w-32">Dedicated Runs</TableHead>
                    <TableHead className="text-right w-32">Customized Runs</TableHead>
                    <TableHead className="text-right w-24">Talks</TableHead>
                    <TableHead className="w-32 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlySummary.map((m) => {
                    const isExpanded = expandedMonths.has(m.monthIndex);
                    return (
                      <>
                        <TableRow key={m.month} className="cursor-pointer hover:bg-muted/30" onClick={() => toggleMonth(m.monthIndex)}>
                          <TableCell className="font-semibold">{m.month}</TableCell>
                          <TableCell className="text-right">{m.openRuns || "—"}</TableCell>
                          <TableCell className="text-right">{m.dedicatedRuns || "—"}</TableCell>
                          <TableCell className="text-right">{m.customizedRuns || "—"}</TableCell>
                          <TableCell className="text-right">{m.talks || "—"}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-primary gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleMonth(m.monthIndex);
                              }}
                            >
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              {isExpanded ? "Collapse" : "Click to expand"}
                            </Button>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow key={`${m.month}-detail`}>
                            <TableCell colSpan={6} className="p-0 border-t-0">
                              <div className="border-l-4 border-primary/30 ml-2 px-4 py-3 bg-slate-50 space-y-2">
                                {renderTypeSection("Open Runs", m.coursesByType.OPEN, false, "text-blue-700", "bg-blue-50")}
                                {renderTypeSection("Dedicated Runs", m.coursesByType.DEDICATED, false, "text-violet-700", "bg-violet-50")}
                                {renderTypeSection("Customized Runs", m.coursesByType.CUSTOMIZED, false, "text-amber-700", "bg-amber-50")}
                                {renderTypeSection("Talks", m.coursesByType.TALKS, true, "text-emerald-700", "bg-emerald-50")}
                                {m.openRuns === 0 && m.dedicatedRuns === 0 && m.customizedRuns === 0 && m.talks === 0 && (
                                  <p className="text-sm text-muted-foreground py-2">No detailed data available.</p>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
