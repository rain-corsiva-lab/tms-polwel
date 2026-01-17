import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { CalendarIcon, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { courseRunsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface PostCourseRun {
  id: string;
  serialNumber?: string;
  course: {
    title: string;
    courseCode: string;
  } | null;
  startDatetime: string | null;
  endDatetime: string | null;
  currentParticipants: number;
}

interface DuplicateCourseRunDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (newCourseRunId: string) => void;
}

export const DuplicateCourseRunDialog: React.FC<DuplicateCourseRunDialogProps> = ({ open, onClose, onSuccess }) => {
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [postRuns, setPostRuns] = useState<PostCourseRun[]>([]);
  const [filteredRuns, setFilteredRuns] = useState<PostCourseRun[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRun, setSelectedRun] = useState<PostCourseRun | null>(null);
  const [openCombobox, setOpenCombobox] = useState(false);

  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");

  // Load post runs when dialog opens
  useEffect(() => {
    if (open) {
      loadPostRuns();
    } else {
      // Reset form when dialog closes
      setSelectedRun(null);
      setSearchTerm("");
      setStartDate(undefined);
      setEndDate(undefined);
      setStartTime("09:00");
      setEndTime("17:00");
    }
  }, [open]);

  // Filter runs based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredRuns(postRuns);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = postRuns.filter((run) => {
      const courseTitle = run.course?.title?.toLowerCase() || "";
      const courseCode = run.course?.courseCode?.toLowerCase() || "";
      const serialNumber = run.serialNumber?.toLowerCase() || "";

      return courseTitle.includes(term) || courseCode.includes(term) || serialNumber.includes(term);
    });

    setFilteredRuns(filtered);
  }, [searchTerm, postRuns]);

  const loadPostRuns = async () => {
    try {
      setLoading(true);
      const response = await courseRunsApi.getPostCourseRuns({
        statuses: "COMPLETED,PENDING_BILLING",
        limit: 1000,
      });

      if (response.success && response.courseRuns) {
        setPostRuns(response.courseRuns);
        setFilteredRuns(response.courseRuns);
      } else {
        toast({
          title: "Error",
          description: "Failed to load post course runs",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("[DuplicateDialog] Load error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load post course runs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (date: Date, time: string): string => {
    const [hours, minutes] = time.split(":");
    const dateTime = new Date(date);
    dateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    return dateTime.toISOString();
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedRun) {
      toast({
        title: "Validation Error",
        description: "Please select a course run to duplicate",
        variant: "destructive",
      });
      return;
    }

    if (!startDate || !endDate) {
      toast({
        title: "Validation Error",
        description: "Please select start and end dates",
        variant: "destructive",
      });
      return;
    }

    if (startDate >= endDate) {
      toast({
        title: "Validation Error",
        description: "End date must be after start date",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        courseRunId: selectedRun.id,
        startDatetime: formatDateTime(startDate, startTime),
        endDatetime: formatDateTime(endDate, endTime),
      };

      console.log("[DuplicateDialog] Submitting:", payload);

      const response = await courseRunsApi.duplicate(payload);

      if (response.success && response.courseRun) {
        toast({
          title: "Success",
          description: `Course run duplicated successfully: ${response.courseRun.serialNumber || "New Run"}`,
        });

        if (onSuccess) {
          onSuccess(response.courseRun.id);
        }

        onClose();
      } else {
        throw new Error(response.error || "Failed to duplicate course run");
      }
    } catch (error: any) {
      console.error("[DuplicateDialog] Submit error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to duplicate course run",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatRunLabel = (run: PostCourseRun): string => {
    const courseTitle = run.course?.title || "Unknown Course";
    const courseCode = run.serialNumber || run.course?.courseCode || "N/A";
    const startDate = run.startDatetime ? format(new Date(run.startDatetime), "dd MMM yyyy") : "N/A";
    const endDate = run.endDatetime ? format(new Date(run.endDatetime), "dd MMM yyyy") : "N/A";

    return `${courseCode} - ${courseTitle} (${startDate} to ${endDate})`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">Duplicate Course Run from Post Run</DialogTitle>
          <DialogDescription className="text-sm text-gray-600">Select a completed course run and specify new dates to create a duplicate</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Select Post Run */}
          <div className="space-y-2">
            <Label htmlFor="post-run" className="text-sm font-medium text-gray-700">
              Select Post Run <span className="text-red-500">*</span>
            </Label>
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={openCombobox} className="w-full justify-between" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </span>
                  ) : selectedRun ? (
                    formatRunLabel(selectedRun)
                  ) : (
                    "Select a post run..."
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[600px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput placeholder="Search by course title, code, or serial number..." value={searchTerm} onValueChange={setSearchTerm} />
                  <CommandList>
                    <CommandEmpty>No course runs found.</CommandEmpty>
                    <CommandGroup className="max-h-[300px] overflow-auto">
                      {filteredRuns.map((run) => (
                        <CommandItem
                          key={run.id}
                          value={run.id}
                          onSelect={() => {
                            setSelectedRun(run);
                            setOpenCombobox(false);
                          }}
                          className="cursor-pointer"
                        >
                          <Check className={cn("mr-2 h-4 w-4", selectedRun?.id === run.id ? "opacity-100" : "opacity-0")} />
                          <div className="flex flex-col">
                            <span className="font-medium">{run.serialNumber || run.course?.courseCode || "N/A"}</span>
                            <span className="text-sm text-gray-600">{run.course?.title || "Unknown Course"}</span>
                            <span className="text-xs text-gray-500">
                              {run.startDatetime && run.endDatetime
                                ? `${format(new Date(run.startDatetime), "dd MMM yyyy")} - ${format(new Date(run.endDatetime), "dd MMM yyyy")}`
                                : "Date not set"}{" "}
                              • {run.currentParticipants} participants
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Selected Run Overview */}
          {selectedRun && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
              <h4 className="font-semibold text-sm text-gray-900">Selected Course Run Details</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Course:</span>
                  <p className="font-medium text-gray-900">{selectedRun.course?.title || "N/A"}</p>
                </div>
                <div>
                  <span className="text-gray-600">Code:</span>
                  <p className="font-medium text-gray-900">{selectedRun.serialNumber || selectedRun.course?.courseCode || "N/A"}</p>
                </div>
                <div>
                  <span className="text-gray-600">Original Start Date:</span>
                  <p className="font-medium text-gray-900">
                    {selectedRun.startDatetime ? format(new Date(selectedRun.startDatetime), "dd MMM yyyy HH:mm") : "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Original End Date:</span>
                  <p className="font-medium text-gray-900">
                    {selectedRun.endDatetime ? format(new Date(selectedRun.endDatetime), "dd MMM yyyy HH:mm") : "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Participants:</span>
                  <p className="font-medium text-gray-900">{selectedRun.currentParticipants}</p>
                </div>
              </div>
            </div>
          )}

          {/* New Start Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                New Start Date <span className="text-red-500">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start-time" className="text-sm font-medium text-gray-700">
                Start Time <span className="text-red-500">*</span>
              </Label>
              <Input id="start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full" />
            </div>
          </div>

          {/* New End Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                New End Date <span className="text-red-500">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-time" className="text-sm font-medium text-gray-700">
                End Time <span className="text-red-500">*</span>
              </Label>
              <Input id="end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full" />
            </div>
          </div>

          {/* Info Note */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            <p className="font-medium mb-1">Note:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>All participants, trainers, and partners will be duplicated</li>
              <li>Fees will be updated based on current course and trainer rates</li>
              <li>The new course run will start with DRAFT status</li>
              <li>Attendance records will NOT be duplicated (new run starts fresh)</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || loading || !selectedRun || !startDate || !endDate}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Duplicated Run"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
