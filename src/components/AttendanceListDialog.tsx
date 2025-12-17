import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Download } from "lucide-react";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { courseRunsApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/errorHandler";

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
  courseRunDetails?: any; // Course run metadata for export
}

export function AttendanceListDialog({ courseRunId, open, onOpenChange, onSaved, courseRunDetails }: AttendanceListDialogProps) {
  const { toast } = useToast();
  const [snapshot, setSnapshot] = useState<AttendanceSnapshot | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

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
        description: getErrorMessage(error, "Please try again shortly."),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [courseRunId, onOpenChange, onSaved, snapshot, toast]);

  const handleExport = useCallback(async () => {
    if (!snapshot || snapshot.learners.length === 0) {
      toast({
        title: "No data to export",
        description: "Add learners or attendance records before exporting.",
        variant: "destructive",
      });
      return;
    }

    setExporting(true);
    const loadingToast = toast({
      title: "Preparing attendance export...",
      description: "Generating Excel file with attendance data",
    });

    try {
      const days =
        snapshot.days?.length > 0 ? snapshot.days : Array.from({ length: snapshot.totalDays }, (_, idx) => ({ day: idx + 1, label: `Day ${idx + 1}` }));

      // Create ExcelJS workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Attendance");

      // Format functions
      const formatDateRange = (d: Date) => {
        const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        const dd = d.getDate();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const mm = monthNames[d.getMonth()];
        const yyyy = d.getFullYear();
        const dayName = dayNames[d.getDay()];
        return `${dayName}, ${dd} ${mm} ${yyyy}`;
      };

      const formatDateHeader = (d: Date) => {
        const dd = String(d.getDate()).padStart(2, "0");
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const mm = monthNames[d.getMonth()];
        const yy = String(d.getFullYear()).slice(2);
        return `${dd}-${mm}-${yy}`;
      };

      const start = courseRunDetails?.startDatetime ? new Date(courseRunDetails.startDatetime) : null;
      const end = courseRunDetails?.endDatetime ? new Date(courseRunDetails.endDatetime) : null;
      const courseTitle = courseRunDetails?.course?.title || "Course";

      const trainerNames =
        courseRunDetails?.courseRunTrainers
          ?.map((t: any) => t.trainer?.name)
          .filter(Boolean)
          .join(", ") || "TBD";

      const venueLine = courseRunDetails?.venue?.name
        ? `${courseRunDetails.venue.name}${courseRunDetails.venue.address ? ", " + courseRunDetails.venue.address : ""}`
        : courseRunDetails?.specifiedLocation || "TBD";

      // Row 1: Title
      let currentRow = 1;
      worksheet.getCell(currentRow, 1).value = courseTitle;
      worksheet.mergeCells(currentRow, 1, currentRow, 4 + days.length * 2);

      // Row 2: Date range
      currentRow++;
      if (start && end) {
        worksheet.getCell(currentRow, 1).value = `${formatDateRange(start)} - ${formatDateRange(end)}`;
        worksheet.mergeCells(currentRow, 1, currentRow, 4 + days.length * 2);
      }

      // Row 3: Trainer
      currentRow++;
      worksheet.getCell(currentRow, 1).value = `Trainer: ${trainerNames}`;
      worksheet.mergeCells(currentRow, 1, currentRow, 4 + days.length * 2);

      // Row 4: Time
      currentRow++;
      if (start && end) {
        const startHour = start.getHours();
        const startMin = String(start.getMinutes()).padStart(2, "0");
        const endHour = end.getHours();
        const endMin = String(end.getMinutes()).padStart(2, "0");
        const startAMPM = startHour >= 12 ? "pm" : "am";
        const endAMPM = endHour >= 12 ? "pm" : "am";
        const timeSlot = `${startHour === 0 ? 12 : startHour > 12 ? startHour - 12 : startHour}.${startMin}${startAMPM} - ${
          endHour === 0 ? 12 : endHour > 12 ? endHour - 12 : endHour
        }.${endMin}${endAMPM}`;
        worksheet.getCell(currentRow, 1).value = timeSlot;
        worksheet.mergeCells(currentRow, 1, currentRow, 4 + days.length * 2);
      }

      // Row 5: Venue
      currentRow++;
      worksheet.getCell(currentRow, 1).value = `Venue: ${venueLine}`;
      worksheet.mergeCells(currentRow, 1, currentRow, 4 + days.length * 2);

      currentRow++;

      // Row 7: Date headers
      currentRow++;
      worksheet.getCell(currentRow, 1).value = "";
      worksheet.getCell(currentRow, 2).value = "";
      worksheet.getCell(currentRow, 3).value = "";
      worksheet.getCell(currentRow, 4).value = "";
      let colIdx = 5;
      days.forEach((day) => {
        const dayDate = start ? new Date(start.getTime() + (day.day - 1) * 24 * 60 * 60 * 1000) : null;
        const formatted = dayDate ? formatDateHeader(dayDate) : `Day ${day.day}`;
        worksheet.getCell(currentRow, colIdx).value = formatted;
        worksheet.mergeCells(currentRow, colIdx, currentRow, colIdx + 1);
        colIdx += 2;
      });

      // Style header info rows
      for (let r = 1; r <= 5; r++) {
        const row = worksheet.getRow(r);
        row.height = 25;
        row.eachCell((cell) => {
          cell.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
          cell.alignment = { horizontal: "center", vertical: "center", wrapText: true };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: r === 1 ? "FF1F3A1F" : r === 2 ? "FF2F5233" : r === 3 ? "FF3D6B47" : r === 4 ? "FF4A7D53" : "FF5A8D63" },
          };
          cell.border = {
            top: { style: "thin", color: { argb: "FF000000" } },
            bottom: { style: "thin", color: { argb: "FF000000" } },
            left: { style: "thin", color: { argb: "FF000000" } },
            right: { style: "thin", color: { argb: "FF000000" } },
          };
        });
      }

      // Row 8: Column headers (No, Name, Department, Sub BU, AM/PM dates, Designation, Contact)
      currentRow++;
      const headerRow = worksheet.getRow(currentRow);
      headerRow.height = 20;
      headerRow.getCell(1).value = "No";
      headerRow.getCell(2).value = "Name";
      headerRow.getCell(3).value = "Department";
      headerRow.getCell(4).value = "Sub BU";
      colIdx = 5;
      days.forEach(() => {
        worksheet.getCell(currentRow, colIdx).value = "AM";
        worksheet.getCell(currentRow, colIdx + 1).value = "PM";
        colIdx += 2;
      });
      worksheet.getCell(currentRow, colIdx).value = "Designation";
      worksheet.getCell(currentRow, colIdx + 1).value = "Contact No.";

      // Style column headers
      for (let c = 1; c <= 4 + days.length * 2 + 2; c++) {
        const cell = worksheet.getCell(currentRow, c);
        cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
        cell.alignment = { horizontal: "center", vertical: "center" };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF70AD47" },
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FF000000" } },
          bottom: { style: "thin", color: { argb: "FF000000" } },
          left: { style: "thin", color: { argb: "FF000000" } },
          right: { style: "thin", color: { argb: "FF000000" } },
        };
      }

      // Data rows
      currentRow++;
      snapshot.learners.forEach((learner, idx) => {
        const row = worksheet.getRow(currentRow);
        const bgColor = idx % 2 === 0 ? "FFF5F9F5" : "FFFFFFFF";
        row.getCell(1).value = idx + 1;
        row.getCell(2).value = learner.fullName;
        row.getCell(3).value = learner.departmentName || "";
        row.getCell(4).value = "";

        colIdx = 5;
        days.forEach((day) => {
          const record = learner.attendance.find((a) => a.day === day.day);
          row.getCell(colIdx).value = record?.attendAM ? "✓" : "";
          row.getCell(colIdx + 1).value = record?.attendPM ? "✓" : "";
          colIdx += 2;
        });
        row.getCell(colIdx).value = learner.designation || "";
        row.getCell(colIdx + 1).value = learner.contactNumber || "";

        // Style data row
        row.height = 18;
        row.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: bgColor },
          };
          cell.border = {
            top: { style: "thin", color: { argb: "FFB8D8B8" } },
            bottom: { style: "thin", color: { argb: "FFB8D8B8" } },
            left: { style: "thin", color: { argb: "FFB8D8B8" } },
            right: { style: "thin", color: { argb: "FFB8D8B8" } },
          };
          cell.font = { size: 10, color: { argb: "FF000000" } };
          cell.alignment = { horizontal: "center", vertical: "center" };
        });

        currentRow++;
      });

      // Set column widths
      worksheet.columns = [
        { width: 5 },
        { width: 30 },
        { width: 20 },
        { width: 10 },
        ...days.flatMap(() => [{ width: 10 }, { width: 10 }]),
        { width: 20 },
        { width: 15 },
      ];

      // Generate file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-${courseRunDetails?.serialNumber || courseRunId}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      loadingToast.dismiss();
      toast({
        title: "Export successful",
        description: "Attendance data exported successfully",
      });
    } catch (error: any) {
      console.error("Export attendance error", error);
      loadingToast.dismiss();
      toast({
        title: "Export failed",
        description: error?.message || "Failed to export attendance data",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  }, [snapshot, courseRunDetails, courseRunId, toast]);

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

              <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting || snapshot.learners.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                {exporting ? "Exporting..." : "Export"}
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
