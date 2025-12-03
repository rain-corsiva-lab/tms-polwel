import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { trainerDashboardApi, trainersApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errorHandler";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TrainingSummaryItem {
  id: string;
  courseRunId?: string;
  courseId?: string;
  courseTitle: string;
  startDate: string;
  fee: number;
}

interface TrainingSummaryPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface TrainingSummaryTotals {
  fee: number;
}

interface TrainerTrainingSummaryProps {
  trainerId?: string;
  mode: "self" | "admin";
  pageSizeOptions?: number[];
  className?: string;
}

const defaultPageSizeOptions = [5, 10, 20];

const currencyFormatter = new Intl.NumberFormat("en-SG", {
  style: "currency",
  currency: "SGD",
  minimumFractionDigits: 2,
});

export function TrainerTrainingSummary({ trainerId, mode, pageSizeOptions = defaultPageSizeOptions, className }: TrainerTrainingSummaryProps) {
  const { toast } = useToast();
  const initialPageSize = pageSizeOptions.find((option) => option === 10) ?? pageSizeOptions[0] ?? 10;
  const [items, setItems] = useState<TrainingSummaryItem[]>([]);
  const [pagination, setPagination] = useState<TrainingSummaryPagination>({ page: 1, limit: initialPageSize, total: 0, totalPages: 1 });
  const [totals, setTotals] = useState<TrainingSummaryTotals>({ fee: 0 });
  const [draftStartDate, setDraftStartDate] = useState<string>("");
  const [draftEndDate, setDraftEndDate] = useState<string>("");
  const [appliedStartDate, setAppliedStartDate] = useState<string>("");
  const [appliedEndDate, setAppliedEndDate] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchSummary = useCallback(async () => {
    if (mode === "admin" && !trainerId) {
      return;
    }
    try {
      setLoading(true);
      const params = {
        startDate: appliedStartDate || undefined,
        endDate: appliedEndDate || undefined,
        page: pagination.page,
        limit: pagination.limit,
      };
      const response =
        mode === "self" ? await trainerDashboardApi.getTrainingSummary(params) : await trainersApi.getTrainingSummary(trainerId as string, params);
      const summary = response?.data ?? response;

      setItems(Array.isArray(summary?.items) ? summary.items : []);
      setTotals({
        fee: summary?.totals?.fee ?? 0,
      });
      setPagination((prev) => ({
        page: summary?.pagination?.page ?? prev.page,
        limit: summary?.pagination?.limit ?? prev.limit,
        total: summary?.pagination?.total ?? prev.total,
        totalPages: summary?.pagination?.totalPages ?? prev.totalPages,
      }));
    } catch (error: any) {
      console.error("Failed to load training summary", error);
      toast({
        title: "Failed to load training summary",
        description: getErrorMessage(error, "Please try again later."),
        variant: "destructive",
      });
      setItems([]);
      setTotals({ fee: 0 });
    } finally {
      setLoading(false);
    }
  }, [mode, trainerId, toast, appliedStartDate, appliedEndDate, pagination.page, pagination.limit, refreshKey]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const onChangePage = (nextPage: number) => {
    setPagination((prev) => ({ ...prev, page: Math.max(1, Math.min(nextPage, prev.totalPages || 1)) }));
  };

  const onChangePageSize = (nextLimit: number) => {
    setPagination((prev) => ({ ...prev, limit: nextLimit, page: 1 }));
  };

  const handleApplyFilters = () => {
    if (draftStartDate && draftEndDate && new Date(draftStartDate) > new Date(draftEndDate)) {
      toast({ title: "Invalid date range", description: "End date must be after start date", variant: "destructive" });
      return;
    }
    setPagination((prev) => ({ ...prev, page: 1 }));
    setAppliedStartDate(draftStartDate);
    setAppliedEndDate(draftEndDate);
    setRefreshKey((key) => key + 1);
  };

  const resetFilters = () => {
    setDraftStartDate("");
    setDraftEndDate("");
    setAppliedStartDate("");
    setAppliedEndDate("");
    setPagination((prev) => ({ ...prev, page: 1 }));
    setRefreshKey((key) => key + 1);
  };

  const showingFrom = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const showingTo = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-lg font-semibold">Training Summary</CardTitle>
          <p className="text-sm text-muted-foreground">Trainings Conducted for the Month</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={draftStartDate}
              onChange={(event) => setDraftStartDate(event.target.value)}
              className="w-[150px]"
              placeholder="Start date"
            />
            <span className="text-muted-foreground">to</span>
            <Input type="date" value={draftEndDate} onChange={(event) => setDraftEndDate(event.target.value)} className="w-[150px]" placeholder="End date" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={resetFilters} disabled={loading}>
              Clear
            </Button>
            <Button onClick={handleApplyFilters} disabled={loading}>
              Apply
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Date of Training</th>
                <th className="px-4 py-3 font-medium">Training Title</th>
                <th className="px-4 py-3 font-medium text-right">Fees</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="px-4 py-6 text-center text-muted-foreground" colSpan={3}>
                    Loading training summary...
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-muted-foreground" colSpan={3}>
                    No training records for the selected period.
                  </td>
                </tr>
              )}
              {!loading &&
                items.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-4 py-3 whitespace-nowrap">{item.startDate ? format(new Date(item.startDate), "dd/MM/yyyy") : "-"}</td>
                    <td className="px-4 py-3">{item.courseTitle || "Untitled Course"}</td>
                    <td className="px-4 py-3 text-right font-medium">{currencyFormatter.format(item.fee ?? 0)}</td>
                  </tr>
                ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/20">
                <td className="px-4 py-3 font-semibold" colSpan={2}>
                  Total for the period
                </td>
                <td className="px-4 py-3 text-right font-semibold">{currencyFormatter.format(totals.fee ?? 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {showingFrom} to {showingTo} of {pagination.total} records
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-muted-foreground" htmlFor="summary-page-size">
              Rows per page
            </label>
            <select
              id="summary-page-size"
              className="h-9 rounded-md border px-2 text-sm"
              value={pagination.limit}
              onChange={(event) => onChangePageSize(Number(event.target.value))}
              disabled={loading}
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => onChangePage(pagination.page - 1)} disabled={loading || pagination.page <= 1}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onChangePage(pagination.page + 1)}
                disabled={loading || pagination.page >= pagination.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default TrainerTrainingSummary;
