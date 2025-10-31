import { useState, useEffect, useMemo, useCallback } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus, CalendarIcon, Clock, MapPin, Users, Building } from "lucide-react";
import { format, isSameDay, parseISO } from "date-fns";
import { getTrainerBlockouts, getTrainerCourseRuns, createTrainerBlockout, updateTrainerBlockout, deleteTrainerBlockout, trainerDashboardApi } from "@/lib/api";
import { AddTrainerBlockoutDialog } from "./AddTrainerBlockoutDialog";
import { EditTrainerBlockoutDialog } from "./EditTrainerBlockoutDialog";
import { TrainerBlockout, CourseRun } from "@/types/trainer";
import { useAuth } from "@/hooks/useAuth";

interface TrainerCalendarProps {
  trainerId: string;
  trainerName?: string;
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  onEventsChange?: (events: { courseRuns: CourseRun[]; blockouts: TrainerBlockout[] }) => void;
}

const TrainerCalendar: React.FC<TrainerCalendarProps> = ({
  trainerId,
  trainerName,
  selectedDate: propSelectedDate = new Date(),
  onDateSelect,
  onEventsChange,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(propSelectedDate);
  const [visibleMonth, setVisibleMonth] = useState<Date>(new Date(propSelectedDate.getFullYear(), propSelectedDate.getMonth(), 1));
  const [blockouts, setBlockouts] = useState<TrainerBlockout[]>([]);
  const [courseRuns, setCourseRuns] = useState<CourseRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddBlockoutDialog, setShowAddBlockoutDialog] = useState(false);
  const [editingBlockout, setEditingBlockout] = useState<TrainerBlockout | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const isSelfTrainer = user?.role === "TRAINER" && user?.id === trainerId;

  // Update local selected date when prop changes
  useEffect(() => {
    setSelectedDate(propSelectedDate);
    // keep visible month in sync with selected date prop
    setVisibleMonth(new Date(propSelectedDate.getFullYear(), propSelectedDate.getMonth(), 1));
  }, [propSelectedDate]);

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      onDateSelect?.(date);

      // Update events for the selected date
      const events = getEventsForDate(date);
      onEventsChange?.(events);
    }
  };

  // Update events when blockouts or courseRuns change
  useEffect(() => {
    const events = getEventsForDate(selectedDate);
    onEventsChange?.(events);
  }, [blockouts, courseRuns, selectedDate]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Get visible month's date range (responds to calendar month navigation)
      const monthRef = visibleMonth || propSelectedDate || new Date();
      const startOfMonth = new Date(monthRef.getFullYear(), monthRef.getMonth(), 1);
      const endOfMonth = new Date(monthRef.getFullYear(), monthRef.getMonth() + 1, 0);

      // Load blockouts and course runs
      const [blockoutsResponse, courseRunsResponse] = await Promise.all([
        getTrainerBlockouts(trainerId, startOfMonth.toISOString().split("T")[0], endOfMonth.toISOString().split("T")[0]),
        isSelfTrainer
          ? trainerDashboardApi.getCourseRuns({
              startDate: startOfMonth.toISOString().split("T")[0],
              endDate: endOfMonth.toISOString().split("T")[0],
            })
          : getTrainerCourseRuns(trainerId),
      ]);

      if (blockoutsResponse?.data) {
        setBlockouts(Array.isArray(blockoutsResponse.data) ? blockoutsResponse.data : []);
      }

      if (isSelfTrainer) {
        const runs = Array.isArray(courseRunsResponse?.data) ? courseRunsResponse?.data : [];
        setCourseRuns(runs as CourseRun[]);
      } else if (courseRunsResponse?.runs) {
        setCourseRuns(courseRunsResponse.runs || []);
      }
    } catch (error: any) {
      console.error("Failed to load trainer data:", error);

      let errorMessage = "Failed to load trainer data. Please refresh the page.";

      // Handle specific error types
      if (error.message?.includes("unauthorized") || error.message?.includes("authentication")) {
        errorMessage = "You don't have permission to view this trainer's data. Please check your access rights.";
      } else if (error.message?.includes("not found")) {
        errorMessage = "Trainer not found. Please verify the trainer ID.";
      } else if (error.message?.includes("network") || error.message?.includes("fetch")) {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });

      setBlockouts([]);
      setCourseRuns([]);
    } finally {
      setLoading(false);
    }
  }, [trainerId, visibleMonth, propSelectedDate, isSelfTrainer, toast]);

  // Load data
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Get events for selected date
  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];

    // Helper: parse YYYY-MM-DD into local Date at midnight to avoid timezone shifts
    const parseYMD = (s: string) => {
      const [y, m, d] = s.split("-").map(Number);
      return new Date(y, m - 1, d);
    };

    // Filter course runs for the date
    const courseRunsForDate = courseRuns.filter((run) => run.startDate.startsWith(dateStr));

    // Filter blockouts for the date (inclusive)
    const blockoutsForDate = blockouts.filter((blockout) => {
      const blockoutStart = parseYMD(blockout.startDate);
      const blockoutEnd = parseYMD(blockout.endDate);
      // Compare only YMD (strip time)
      const dY = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      return dY >= blockoutStart && dY <= blockoutEnd;
    });

    return {
      courseRuns: courseRunsForDate,
      blockouts: blockoutsForDate,
    };
  };

  // Handle blockout add
  const handleBlockoutAdd = async (blockoutData: Omit<TrainerBlockout, "id">) => {
    try {
      // Extract trainerId from the blockout data since dialog includes it
      const { trainerId: providedTrainerId, ...dataWithoutTrainerId } = blockoutData;
      await createTrainerBlockout({
        ...dataWithoutTrainerId,
        trainerId,
      });

      await loadData(); // Refresh data

      toast({
        title: "Success",
        description: "Blockout date has been added successfully.",
        variant: "default",
      });
    } catch (error: any) {
      console.error("Failed to create blockout:", error);

      let errorMessage = "Failed to create blockout. Please try again.";

      // Handle specific error types
      if (error.message?.includes("conflicts with scheduled courses")) {
        errorMessage = "This blockout conflicts with scheduled courses. Please choose different dates or remove conflicting courses first.";
      } else if (error.message?.includes("validation")) {
        errorMessage = "Invalid blockout data. Please check your input and try again.";
      } else if (error.message?.includes("unauthorized") || error.message?.includes("authentication")) {
        errorMessage = "You don't have permission to create blockouts. Please check your access rights.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Handle blockout edit
  const handleBlockoutEdit = async (id: string, blockoutData: Partial<TrainerBlockout>) => {
    try {
      await updateTrainerBlockout(id, blockoutData);
      await loadData(); // Refresh data
      setEditingBlockout(null);

      toast({
        title: "Success",
        description: "Blockout has been updated successfully.",
        variant: "default",
      });
    } catch (error: any) {
      console.error("Failed to update blockout:", error);

      let errorMessage = "Failed to update blockout. Please try again.";

      // Handle specific error types
      if (error.message?.includes("conflicts with scheduled courses")) {
        errorMessage = "This blockout update conflicts with scheduled courses. Please choose different dates or remove conflicting courses first.";
      } else if (error.message?.includes("validation")) {
        errorMessage = "Invalid blockout data. Please check your input and try again.";
      } else if (error.message?.includes("unauthorized") || error.message?.includes("authentication")) {
        errorMessage = "You don't have permission to update blockouts. Please check your access rights.";
      } else if (error.message?.includes("not found")) {
        errorMessage = "Blockout not found. It may have been deleted by another user.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });

      // Refresh data in case blockout was deleted
      await loadData();
    }
  };

  // Handle blockout delete
  const handleBlockoutDelete = async (id: string) => {
    try {
      await deleteTrainerBlockout(id);
      await loadData(); // Refresh data
      setEditingBlockout(null);

      toast({
        title: "Success",
        description: "Blockout has been deleted successfully.",
        variant: "default",
      });
    } catch (error: any) {
      console.error("Failed to delete blockout:", error);

      let errorMessage = "Failed to delete blockout. Please try again.";

      // Handle specific error types
      if (error.message?.includes("unauthorized") || error.message?.includes("authentication")) {
        errorMessage = "You don't have permission to delete blockouts. Please check your access rights.";
      } else if (error.message?.includes("not found")) {
        errorMessage = "Blockout not found. It may have already been deleted.";
      } else if (error.message?.includes("constraint") || error.message?.includes("dependency")) {
        errorMessage = "Cannot delete blockout as it may be referenced by other records.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });

      // Refresh data in case blockout was already deleted
      await loadData();
    }
  };

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    const events = [];

    // Add blockouts for selected date
    const parseYMD = (s: string) => {
      const [y, m, d] = s.split("-").map(Number);
      return new Date(y, m - 1, d);
    };

    const dayBlockouts = blockouts.filter((blockout) => {
      const start = parseYMD(blockout.startDate);
      const end = parseYMD(blockout.endDate);
      const dY = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      return dY >= start && dY <= end;
    });

    // Add course runs for selected date
    const dayCourseRuns = courseRuns.filter((run) => {
      const runDate = parseISO(run.startDate);
      return isSameDay(runDate, selectedDate);
    });

    return { blockouts: dayBlockouts, courseRuns: dayCourseRuns };
  }, [selectedDate, blockouts, courseRuns]);

  // Get calendar modifiers
  const calendarModifiers = useMemo(() => {
    const blockedDates: Date[] = [];
    const scheduledDates: Date[] = [];

    blockouts.forEach((blockout) => {
      // Use safe YMD parsing to avoid timezone shifts
      const parseYMD = (s: string) => {
        const [y, m, d] = s.split("-").map(Number);
        return new Date(y, m - 1, d);
      };

      const start = parseYMD(blockout.startDate);
      const end = parseYMD(blockout.endDate);
      const currentDate = new Date(start);

      while (currentDate <= end) {
        blockedDates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    courseRuns.forEach((run) => {
      const runDate = parseISO(run.startDate);
      scheduledDates.push(runDate);
    });

    return {
      blocked: blockedDates,
      scheduled: scheduledDates,
    };
  }, [blockouts, courseRuns]);

  const calendarModifiersClassNames = {
    blocked: "bg-red-100 text-red-900 hover:bg-red-200",
    scheduled: "bg-green-100 text-green-900 hover:bg-green-200",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-6 w-6" />
            {trainerName || 'Trainer'} Calendar
          </h2>
          <p className="text-muted-foreground">
            Manage unavailable dates and blockouts for this trainer
          </p>
        </div>

      </div> */}

      {/* Simple Calendar Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5" />
              <CardTitle>{trainerName || "Trainer"}'s Calendar</CardTitle>
            </div>
          </div>
          {/* <CardDescription>Manage unavailable dates and blockouts for this trainer</CardDescription> */}
        </CardHeader>
        <CardContent className="space-y-4">
          <Calendar
            mode="single"
            month={visibleMonth}
            selected={selectedDate}
            onSelect={handleDateSelect}
            onMonthChange={(month) => setVisibleMonth(month)}
            modifiers={calendarModifiers}
            modifiersClassNames={calendarModifiersClassNames}
            className="rounded-md border"
          />
          <div className="text-sm space-y-2">
            <p className="font-medium">Select date(s) to manage your availability</p>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Scheduled Course</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>Unavailable</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Button className="mt-3" onClick={() => setShowAddBlockoutDialog(true)} size="sm">
        <Plus className="h-4 w-4 mr-1" />
        Add Blockout Date Range
      </Button>

      {/* Add Blockout Dialog */}
      <AddTrainerBlockoutDialog
        isOpen={showAddBlockoutDialog}
        onClose={() => setShowAddBlockoutDialog(false)}
        trainerId={trainerId}
        onBlockoutAdded={async () => {
          // Refresh the blockouts data from API
          await loadData();
          setShowAddBlockoutDialog(false);
        }}
      />

      {/* Edit Blockout Dialog */}
      {editingBlockout && (
        <EditTrainerBlockoutDialog blockout={editingBlockout} onBlockoutUpdate={handleBlockoutEdit} onClose={() => setEditingBlockout(null)} />
      )}
    </div>
  );
};

export default TrainerCalendar;
