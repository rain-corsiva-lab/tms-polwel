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

interface Trainer {
  id: string;
  name: string;
  email: string;
  specializations: string[];
}

interface TrainerBlockout {
  id: string;
  trainerId: string;
  trainerName: string;
  date: string;
  reason: string;
  type: "maintenance" | "holiday" | "unavailable" | "personal" | "other";
  description?: string;
}

interface TrainingCalendarProps {
  trainers: Trainer[];
  trainerBlockouts?: TrainerBlockout[];
  onDateSelect?: (date: Date) => void;
  onTrainerBlockoutAdd?: (blockout: Omit<TrainerBlockout, 'id'>) => void;
  onTrainerBlockoutRemove?: (blockoutId: string) => void;
  canManageBlockouts?: boolean;
  selectedTrainerId?: string;
}

const TrainingCalendar = ({ 
  trainers, 
  trainerBlockouts = [], 
  onDateSelect, 
  onTrainerBlockoutAdd, 
  onTrainerBlockoutRemove, 
  canManageBlockouts = false,
  selectedTrainerId
}: TrainingCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isBlockoutDialogOpen, setIsBlockoutDialogOpen] = useState(false);
  const [selectedTrainerForBlockout, setSelectedTrainerForBlockout] = useState<string>("");
  const [blockoutForm, setBlockoutForm] = useState({
    reason: "",
    type: "unavailable" as TrainerBlockout['type'],
    description: ""
  });

  const getBlockoutsForDate = (date: Date) => {
    return trainerBlockouts.filter(blockout => 
      isSameDay(parseISO(blockout.date), date)
    );
  };

  const getTrainersBlockedOnDate = (date: Date) => {
    return getBlockoutsForDate(date).map(blockout => blockout.trainerName);
  };

  const isDateBlocked = (date: Date) => {
    return getBlockoutsForDate(date).length > 0;
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
      case "personal":
        return "bg-blue-500";
      case "other":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const getDayContent = (date: Date) => {
    const dayBlockouts = getBlockoutsForDate(date);
    
    if (dayBlockouts.length === 0) return null;
    
    return (
      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
        <div className="flex space-x-1">
          {dayBlockouts.slice(0, 3).map((blockout, index) => (
            <div
              key={blockout.id}
              className={cn(
                "w-2 h-2 rounded-full",
                getBlockoutTypeColor(blockout.type)
              )}
            />
          ))}
          {dayBlockouts.length > 3 && (
            <div className="w-2 h-2 rounded-full bg-gray-700" />
          )}
        </div>
      </div>
    );
  };

  const selectedDateBlockouts = selectedDate ? getBlockoutsForDate(selectedDate) : [];
  const selectedDateTrainers = selectedDate ? getTrainersBlockedOnDate(selectedDate) : [];

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date && onDateSelect) {
      onDateSelect(date);
    }
  };

  const handleAddTrainerBlockout = () => {
    if (!selectedDate || !blockoutForm.reason.trim() || !selectedTrainerForBlockout) return;
    
    const selectedTrainer = trainers.find(t => t.id === selectedTrainerForBlockout);
    if (!selectedTrainer) return;
    
    const newBlockout: Omit<TrainerBlockout, 'id'> = {
      trainerId: selectedTrainerForBlockout,
      trainerName: selectedTrainer.name,
      date: selectedDate.toISOString().split('T')[0],
      reason: blockoutForm.reason,
      type: blockoutForm.type,
      description: blockoutForm.description
    };
    
    onTrainerBlockoutAdd?.(newBlockout);
    setBlockoutForm({ reason: "", type: "unavailable", description: "" });
    setSelectedTrainerForBlockout("");
    setIsBlockoutDialogOpen(false);
  };

  const handleRemoveTrainerBlockout = (blockoutId: string) => {
    onTrainerBlockoutRemove?.(blockoutId);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar View */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5" />
              <span>Trainer Availability Calendar</span>
            </CardTitle>
            <CardDescription>
              View trainer blockout dates. Blocked dates show which trainers are unavailable.
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
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span>Holiday</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span>Maintenance</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                  <span>Unavailable</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span>Personal</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span>Other</span>
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
              {selectedDateBlockouts.length > 0 ? (
                `${selectedDateBlockouts.length} trainer${selectedDateBlockouts.length > 1 ? 's' : ''} blocked out`
              ) : (
                "All trainers available for this date"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedDateBlockouts.length > 0 ? (
              <div className="space-y-3">
                {selectedDateBlockouts.map((blockout) => (
                  <div key={blockout.id} className="p-4 border border-red-200 rounded-lg bg-red-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className={cn(
                          "w-3 h-3 rounded-full",
                          getBlockoutTypeColor(blockout.type)
                        )} />
                        <h4 className="font-medium text-red-800">{blockout.trainerName}</h4>
                      </div>
                      {canManageBlockouts && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveTrainerBlockout(blockout.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-red-700 mb-1">
                      <strong>Reason:</strong> {blockout.reason}
                    </p>
                    <p className="text-sm text-red-700 mb-1">
                      <strong>Type:</strong> {blockout.type}
                    </p>
                    {blockout.description && (
                      <p className="text-sm text-red-700">
                        <strong>Description:</strong> {blockout.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                All trainers are available for this date.
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
              {canManageBlockouts && selectedDate && (
                <Dialog open={isBlockoutDialogOpen} onOpenChange={setIsBlockoutDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full" size="sm">
                      <Ban className="h-4 w-4 mr-2" />
                      Block Out Trainer
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Block Out Trainer</DialogTitle>
                      <DialogDescription>
                        Block out a trainer for {selectedDate ? format(selectedDate, "MMMM dd, yyyy") : "this date"}.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="trainer">Trainer *</Label>
                        <select
                          id="trainer"
                          className="w-full p-2 border rounded-md"
                          value={selectedTrainerForBlockout}
                          onChange={(e) => setSelectedTrainerForBlockout(e.target.value)}
                        >
                          <option value="">Select a trainer...</option>
                          {trainers.map((trainer) => (
                            <option key={trainer.id} value={trainer.id}>
                              {trainer.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="reason">Reason *</Label>
                        <Input
                          id="reason"
                          placeholder="e.g., Personal leave, Training"
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
                          onChange={(e) => setBlockoutForm(prev => ({ ...prev, type: e.target.value as TrainerBlockout['type'] }))}
                        >
                          <option value="unavailable">Unavailable</option>
                          <option value="personal">Personal</option>
                          <option value="holiday">Holiday</option>
                          <option value="maintenance">Maintenance</option>
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
                        <Button 
                          onClick={handleAddTrainerBlockout} 
                          disabled={!blockoutForm.reason.trim() || !selectedTrainerForBlockout}
                        >
                          Block Trainer
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