import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format, isSameDay, parseISO } from "date-fns";
import { Calendar as CalendarIcon, Clock, MapPin, Users, ChevronLeft, ChevronRight, Ban, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrainingSchedule {
  id: string;
  title: string;
  coordinator: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  location: string;
  participants: number;
  status: "upcoming" | "ongoing" | "completed";
  description?: string;
}

interface BlockoutDate {
  id: string;
  date: string;
  reason: string;
  type: "maintenance" | "holiday" | "unavailable" | "other";
  description?: string;
}

interface TrainingCalendarProps {
  schedules: TrainingSchedule[];
  blockoutDates?: BlockoutDate[];
  onDateSelect?: (date: Date) => void;
  onScheduleClick?: (schedule: TrainingSchedule) => void;
  onBlockoutAdd?: (blockout: Omit<BlockoutDate, 'id'>) => void;
  onBlockoutRemove?: (blockoutId: string) => void;
  canManageBlockouts?: boolean;
}

const TrainingCalendar = ({ 
  schedules, 
  blockoutDates = [], 
  onDateSelect, 
  onScheduleClick, 
  onBlockoutAdd, 
  onBlockoutRemove, 
  canManageBlockouts = false 
}: TrainingCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isBlockoutDialogOpen, setIsBlockoutDialogOpen] = useState(false);
  const [blockoutForm, setBlockoutForm] = useState({
    reason: "",
    type: "unavailable" as BlockoutDate['type'],
    description: ""
  });

  const getBlockoutForDate = (date: Date) => {
    return blockoutDates.find(blockout => 
      isSameDay(parseISO(blockout.date), date)
    );
  };

  const isDateBlocked = (date: Date) => {
    return getBlockoutForDate(date) !== undefined;
  };

  const getSchedulesForDate = (date: Date) => {
    return schedules.filter(schedule => {
      const startDate = parseISO(schedule.startDate);
      const endDate = parseISO(schedule.endDate);
      return date >= startDate && date <= endDate;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "ongoing":
        return "bg-green-100 text-green-800 border-green-200";
      case "completed":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getBlockoutTypeColor = (type: string) => {
    switch (type) {
      case "maintenance":
        return "bg-orange-500";
      case "holiday":
        return "bg-red-500";
      case "unavailable":
        return "bg-gray-500";
      case "other":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const getDayContent = (date: Date) => {
    const daySchedules = getSchedulesForDate(date);
    const blockout = getBlockoutForDate(date);
    
    if (blockout) {
      return (
        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
          <div className={cn(
            "w-4 h-1 rounded-full",
            getBlockoutTypeColor(blockout.type)
          )} />
        </div>
      );
    }
    
    if (daySchedules.length === 0) return null;

    return (
      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
        <div className="flex space-x-1">
          {daySchedules.slice(0, 3).map((schedule, index) => (
            <div
              key={schedule.id}
              className={cn(
                "w-2 h-2 rounded-full",
                schedule.status === "upcoming" && "bg-blue-500",
                schedule.status === "ongoing" && "bg-green-500",
                schedule.status === "completed" && "bg-gray-400"
              )}
            />
          ))}
          {daySchedules.length > 3 && (
            <div className="w-2 h-2 rounded-full bg-purple-500" />
          )}
        </div>
      </div>
    );
  };

  const selectedDateSchedules = selectedDate ? getSchedulesForDate(selectedDate) : [];
  const selectedDateBlockout = selectedDate ? getBlockoutForDate(selectedDate) : null;

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date && onDateSelect) {
      onDateSelect(date);
    }
  };

  const handleAddBlockout = () => {
    if (!selectedDate || !blockoutForm.reason.trim()) return;
    
    const newBlockout: Omit<BlockoutDate, 'id'> = {
      date: selectedDate.toISOString().split('T')[0],
      reason: blockoutForm.reason,
      type: blockoutForm.type,
      description: blockoutForm.description
    };
    
    onBlockoutAdd?.(newBlockout);
    setBlockoutForm({ reason: "", type: "unavailable", description: "" });
    setIsBlockoutDialogOpen(false);
  };

  const handleRemoveBlockout = (blockoutId: string) => {
    onBlockoutRemove?.(blockoutId);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar View */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5" />
              <span>Training Schedule Calendar</span>
            </CardTitle>
            <CardDescription>
              View all training schedules in calendar format. Click on dates to see schedule details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Calendar Month Navigation */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="text-lg font-semibold">
                  {format(currentMonth, "MMMM yyyy")}
                </h3>
                <Button
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Custom Calendar with Events */}
              <div className="relative">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  className="rounded-md border"
                  disabled={(date) => isDateBlocked(date)}
                  components={{
                    Day: ({ date, ...props }) => {
                      const isBlocked = isDateBlocked(date);
                      return (
                        <div className={cn(
                          "relative p-2 hover:bg-accent rounded-md cursor-pointer min-h-[3rem]",
                          isBlocked && "bg-red-50 text-red-400 cursor-not-allowed hover:bg-red-50"
                        )}>
                          <div className="text-sm">{date.getDate()}</div>
                          {isBlocked && (
                            <Ban className="absolute top-1 right-1 h-3 w-3 text-red-500" />
                          )}
                          {getDayContent(date)}
                        </div>
                      );
                    }
                  }}
                />
              </div>

              {/* Legend */}
              <div className="flex items-center space-x-4 text-sm flex-wrap gap-2">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span>Upcoming</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>Ongoing</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                  <span>Completed</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-4 h-1 rounded-full bg-red-500"></div>
                  <span>Blocked</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Details Sidebar */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedDate ? format(selectedDate, "MMMM dd, yyyy") : "Select a Date"}
            </CardTitle>
            <CardDescription>
              {selectedDateBlockout ? (
                <span className="text-red-600">This date is blocked out</span>
              ) : selectedDateSchedules.length > 0 ? (
                `${selectedDateSchedules.length} training schedule${selectedDateSchedules.length > 1 ? 's' : ''}`
              ) : (
                "No training schedules for this date"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedDateBlockout ? (
              <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Ban className="h-4 w-4 text-red-500" />
                    <h4 className="font-medium text-red-800">Date Blocked</h4>
                  </div>
                  {canManageBlockouts && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveBlockout(selectedDateBlockout.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-sm text-red-700 mb-1">
                  <strong>Reason:</strong> {selectedDateBlockout.reason}
                </p>
                <p className="text-sm text-red-700 mb-1">
                  <strong>Type:</strong> {selectedDateBlockout.type}
                </p>
                {selectedDateBlockout.description && (
                  <p className="text-sm text-red-700">
                    <strong>Description:</strong> {selectedDateBlockout.description}
                  </p>
                )}
              </div>
            ) : selectedDateSchedules.length > 0 ? (
              <div className="space-y-4">
                {selectedDateSchedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => onScheduleClick?.(schedule)}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-sm">{schedule.title}</h4>
                        <Badge variant="outline" className={getStatusColor(schedule.status)}>
                          {schedule.status}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {schedule.startTime && schedule.endTime 
                              ? `${schedule.startTime} - ${schedule.endTime}`
                              : "All day"
                            }
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3" />
                          <span>{schedule.location}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <Users className="h-3 w-3" />
                          <span>{schedule.participants} participants</span>
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        Coordinated by {schedule.coordinator}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No training schedules for this date.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button className="w-full" size="sm">
                Add New Schedule
              </Button>
              <Button variant="outline" className="w-full" size="sm">
                View All Schedules
              </Button>
              {canManageBlockouts && selectedDate && !selectedDateBlockout && (
                <Dialog open={isBlockoutDialogOpen} onOpenChange={setIsBlockoutDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full" size="sm">
                      <Ban className="h-4 w-4 mr-2" />
                      Block Out Date
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Block Out Date</DialogTitle>
                      <DialogDescription>
                        Block out {selectedDate ? format(selectedDate, "MMMM dd, yyyy") : "this date"} to prevent training schedules.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="reason">Reason *</Label>
                        <Input
                          id="reason"
                          placeholder="e.g., Facility maintenance, Holiday"
                          value={blockoutForm.reason}
                          onChange={(e) => setBlockoutForm(prev => ({ ...prev, reason: e.target.value }))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="type">Type</Label>
                        <select
                          id="type"
                          className="w-full p-2 border rounded-md"
                          value={blockoutForm.type}
                          onChange={(e) => setBlockoutForm(prev => ({ ...prev, type: e.target.value as BlockoutDate['type'] }))}
                        >
                          <option value="unavailable">Unavailable</option>
                          <option value="maintenance">Maintenance</option>
                          <option value="holiday">Holiday</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          placeholder="Additional details (optional)"
                          value={blockoutForm.description}
                          onChange={(e) => setBlockoutForm(prev => ({ ...prev, description: e.target.value }))}
                        />
                      </div>
                      
                      <div className="flex space-x-2 pt-4">
                        <Button onClick={handleAddBlockout} disabled={!blockoutForm.reason.trim()}>
                          Block Date
                        </Button>
                        <Button variant="outline" onClick={() => setIsBlockoutDialogOpen(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              <Button variant="outline" className="w-full" size="sm">
                Export Calendar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TrainingCalendar;