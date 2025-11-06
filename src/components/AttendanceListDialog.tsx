import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { utils as XLSXUtils, writeFileXLSX } from "xlsx";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { courseRunsApi } from "@/lib/api";

type AttendanceDayRecord = {
  day: number;
  attendAM: boolean;
  attendPM: boolean;
  updatedAt: string | null;
  editedBy: string | null;
  attendanceId: string | null;
};

type AttendanceLearnerRecord = {
  courseRunLearnerId: string;
  learnerId: string;
  fullName: string;
  email: string | null;
  contactNumber: string | null;
  departmentName: string | null;
  attendanceStatus: string | null;
  attendance: AttendanceDayRecord[];
};

type AttendanceSnapshot = {
  courseRunId: string;
  totalDays: number;
  days: Array<{ day: number; label: string }>;
  learners: AttendanceLearnerRecord[];
};

interface AttendanceListDialogProps {
  courseRunId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

const DAY_EXPORT_HEADERS = ["No.", "Learner Name", "Email", "Contact", "Department", "AM", "PM"] as const;
const SUMMARY_EXPORT_HEADERS = ["No.", "Learner Name", "Email", "Contact", "Department", "Attendance Status"] as const;

export function AttendanceListDialog({ courseRunId, open, onOpenChange, onSaved }: AttendanceListDialogProps) {
  const { toast } = useToast();
  const [snapshot, setSnapshot] = useState<AttendanceSnapshot | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadAttendance = useCallback(async () => {
    if (!courseRunId) return;

    setLoading(true);
    try {
      const response = await courseRunsApi.getAttendance(courseRunId);
      if (response?.success && response.attendance) {
        const nextSnapshot: AttendanceSnapshot = response.attendance;
        setSnapshot(nextSnapshot);

        setSelectedDay((prev) => {
          if (!nextSnapshot.days || nextSnapshot.days.length === 0) {
            return 1;
          }

          const requestedDay = nextSnapshot.days.find((day) => day.day === prev)?.day;
          return requestedDay ?? nextSnapshot.days[0].day;
        });
      } else {
        toast({
          title: "Unable to load attendance",
          description: response?.error || "An unexpected error occurred while fetching attendance data.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Attendance fetch error", error);
      toast({
        title: "Unable to load attendance",
        description: error?.message || "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [courseRunId, toast]);

  useEffect(() => {
    if (open) {
      loadAttendance();
    } else {
      setSnapshot(null);
      setSelectedDay(1);
      setLoading(false);
      setSaving(false);
    }
  }, [open, loadAttendance]);

  const days = useMemo(() => {
    if (snapshot?.days?.length) {
      return snapshot.days;
    }

    if (!snapshot) {
      return [] as Array<{ day: number; label: string }>;
    }

    return Array.from({ length: snapshot.totalDays }, (_, index) => ({
      day: index + 1,
      label: `Day ${index + 1}`,
    }));
  }, [snapshot]);

  const learnersForSelectedDay = useMemo(() => {
    if (!snapshot) return [] as Array<{ learner: AttendanceLearnerRecord; record: AttendanceDayRecord | null; index: number }>;
    return snapshot.learners.map((learner, index) => ({
      learner,
      record: learner.attendance.find((item) => item.day === selectedDay) ?? null,
      index,
    }));
  }, [snapshot, selectedDay]);

  const updateAttendanceValue = useCallback((learnerId: string, day: number, field: "attendAM" | "attendPM", value: boolean) => {
    setSnapshot((prev) => {
      if (!prev) return prev;

      const learners = prev.learners.map((learner) => {
        if (learner.learnerId !== learnerId) {
          return learner;
        }

        const attendance = learner.attendance.map((dayRecord) => (dayRecord.day === day ? { ...dayRecord, [field]: value } : dayRecord));

        return { ...learner, attendance };
      });

      return { ...prev, learners };
    });
  }, []);

  const handleExport = useCallback(() => {
    if (!snapshot || snapshot.learners.length === 0) {
      toast({
        title: "No data to export",
        description: "Add learners or attendance records before exporting.",
        variant: "destructive",
      });
      return;
    }

    const workbook = XLSXUtils.book_new();

    const safeText = (value: string | null | undefined) => (value ? String(value) : "");

    const allDays =
      snapshot.days.length > 0 ? snapshot.days : Array.from({ length: snapshot.totalDays }, (_, index) => ({ day: index + 1, label: `Day ${index + 1}` }));

    allDays.forEach((dayInfo) => {
      const rows: string[][] = [Array.from(DAY_EXPORT_HEADERS) as string[]];

      snapshot.learners.forEach((learner, index) => {
        const record = learner.attendance.find((entry) => entry.day === dayInfo.day);
        const am = record?.attendAM ? "Present" : "Absent";
        const pm = record?.attendPM ? "Present" : "Absent";

        rows.push([
          String(index + 1),
          safeText(learner.fullName),
          safeText(learner.email),
          safeText(learner.contactNumber),
          safeText(learner.departmentName),
          am,
          pm,
        ]);
      });

      const worksheet = XLSXUtils.aoa_to_sheet(rows);
      XLSXUtils.book_append_sheet(workbook, worksheet, `Day ${dayInfo.day}`);
    });

    const summaryRows: string[][] = [Array.from(SUMMARY_EXPORT_HEADERS) as string[]];

    snapshot.learners.forEach((learner, index) => {
      const statusValue = safeText(learner.attendanceStatus);
      const status = statusValue ? statusValue.toUpperCase() : "PENDING";
      summaryRows.push([
        String(index + 1),
        safeText(learner.fullName),
        safeText(learner.email),
        safeText(learner.contactNumber),
        safeText(learner.departmentName),
        status,
      ]);
    });

    const summarySheet = XLSXUtils.aoa_to_sheet(summaryRows);
    XLSXUtils.book_append_sheet(workbook, summarySheet, "Summary");

    writeFileXLSX(workbook, `attendance-${snapshot.courseRunId}.xlsx`);

    toast({
      title: "Export ready",
      description: "Attendance workbook downloaded.",
    });
  }, [snapshot, toast]);

  const handleSave = useCallback(async () => {
    if (!snapshot) {
      toast({
        title: "Nothing to save",
        description: "No attendance data available to save.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Save all days, not just the selected day
      // Group all attendance records by day
      const dayRecordsMap = new Map<number, Array<{ learnerId: string; attendAM: boolean; attendPM: boolean }>>();

      snapshot.learners.forEach((learner) => {
        learner.attendance.forEach((dayRecord) => {
          if (!dayRecordsMap.has(dayRecord.day)) {
            dayRecordsMap.set(dayRecord.day, []);
          }
          dayRecordsMap.get(dayRecord.day)!.push({
            learnerId: learner.learnerId,
            attendAM: dayRecord.attendAM,
            attendPM: dayRecord.attendPM,
          });
        });
      });

      // Save each day's attendance
      let lastResponse: any = null;
      for (const [day, records] of dayRecordsMap.entries()) {
        const response = await courseRunsApi.saveAttendance(courseRunId, {
          day,
          records,
        });

        if (!response?.success) {
          throw new Error(response?.error || `Failed to save attendance for Day ${day}`);
        }

        lastResponse = response;
      }

      // Update snapshot with the last response
      if (lastResponse?.success && lastResponse.attendance) {
        const nextSnapshot: AttendanceSnapshot = lastResponse.attendance;
        setSnapshot(nextSnapshot);

        setSelectedDay((prev) => {
          const exists = nextSnapshot.days.find((day) => day.day === prev)?.day;
          if (exists) return exists;
          const fallbackDay = nextSnapshot.days[0]?.day;
          if (fallbackDay) return fallbackDay;
          const boundedPrev = Math.max(1, Math.min(prev, nextSnapshot.totalDays || prev));
          return Number.isNaN(boundedPrev) ? 1 : boundedPrev;
        });

        toast({
          title: "Attendance saved",
          description: `Attendance for all days has been updated successfully.`,
        });

        onOpenChange(false);

        if (onSaved) {
          onSaved();
        }
      }
    } catch (error: any) {
      console.error("Attendance save error", error);
      toast({
        title: "Failed to save attendance",
        description: error?.message || "Please try again shortly.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [courseRunId, onOpenChange, onSaved, snapshot, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Attendance List &mdash; Enrolled Learners</DialogTitle>
          <DialogDescription>Track attendance across multiple days and keep learner records up to date.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mb-3" />
            Loading attendance data...
          </div>
        ) : snapshot ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Select Day:</span>
                <Select value={String(selectedDay)} onValueChange={(value) => setSelectedDay(Number(value))}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Day" />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map((day) => (
                      <SelectItem key={day.day} value={String(day.day)}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button variant="outline" size="sm" onClick={handleExport} disabled={snapshot.learners.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>

            <ScrollArea className="max-h-[55vh] overflow-y-auto pr-4">
              <div className="space-y-3">
                {snapshot.learners.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 rounded border border-dashed border-muted-foreground/40 bg-muted/30 py-10 text-center text-muted-foreground">
                    <p className="font-medium">No learners enrolled yet</p>
                    <p className="text-sm">Add learners to this course run to start tracking attendance.</p>
                  </div>
                ) : (
                  learnersForSelectedDay.map(({ learner, record, index }) => {
                    const attendAM = record?.attendAM ?? false;
                    const attendPM = record?.attendPM ?? false;

                    return (
                      <div
                        key={learner.courseRunLearnerId}
                        className="flex flex-col gap-4 rounded border border-border bg-muted/10 px-4 py-3 transition hover:bg-muted/20 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-start gap-4">
                          <span className="mt-1 text-sm font-semibold text-muted-foreground">{index + 1}.</span>
                          <div>
                            <p className="font-semibold text-sm sm:text-base">{learner.fullName}</p>
                            <p className="text-sm text-muted-foreground">{learner.contactNumber || learner.email || "No contact information"}</p>
                            {learner.departmentName && <p className="text-xs text-muted-foreground/80">Department: {learner.departmentName}</p>}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-sm font-medium">
                            <Checkbox
                              checked={attendAM}
                              onCheckedChange={(checked) => updateAttendanceValue(learner.learnerId, selectedDay, "attendAM", checked === true)}
                              disabled={saving}
                            />
                            AM
                          </label>
                          <label className="flex items-center gap-2 text-sm font-medium">
                            <Checkbox
                              checked={attendPM}
                              onCheckedChange={(checked) => updateAttendanceValue(learner.learnerId, selectedDay, "attendPM", checked === true)}
                              disabled={saving}
                            />
                            PM
                          </label>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center text-sm text-muted-foreground">
            <p>No attendance information available.</p>
          </div>
        )}

        <DialogFooter className="pt-2">
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              Close
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving || !snapshot || snapshot.learners.length === 0}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                "Save Attendance"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
