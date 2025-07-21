import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarIcon, Plus, X } from "lucide-react";
import { format, isValid, isAfter, isBefore, isSameDay, eachDayOfInterval } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface TrainerAssignment {
  id: string;
  date: string;
  title: string;
  type: "assignment" | "unavailable";
  description?: string;
  organization?: string;
}

interface TrainerCalendarProps {
  trainerId: string;
  trainerName: string;
  trainerCourses: string[];
}

export function TrainerCalendar({ trainerId, trainerName, trainerCourses }: TrainerCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedRange, setSelectedRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [isDragging, setIsDragging] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [assignments, setAssignments] = useState<TrainerAssignment[]>([
    {
      id: "1",
      date: "2024-01-15",
      title: "Leadership Training",
      type: "assignment",
      description: "Full day leadership workshop",
      organization: "TechCorp Solutions"
    },
    {
      id: "2", 
      date: "2024-01-20",
      title: "Personal Leave",
      type: "unavailable",
      description: "Family commitment"
    }
  ]);
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    startDate: "",
    endDate: "",
    title: "",
    type: "assignment" as "assignment" | "unavailable",
    description: "",
    organization: ""
  });

  const { toast } = useToast();

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    setSelectedDate(date);
    setSelectedRange({ start: date, end: date });
    setNewAssignment(prev => ({ 
      ...prev, 
      startDate: format(date, "yyyy-MM-dd"),
      endDate: format(date, "yyyy-MM-dd")
    }));
    setShowAddDialog(true);
  };

  const handleMouseDown = (date: Date) => {
    setIsDragging(true);
    setSelectedRange({ start: date, end: date });
  };

  const handleMouseEnter = (date: Date) => {
    if (isDragging && selectedRange.start) {
      setSelectedRange(prev => ({ ...prev, end: date }));
    }
  };

  const handleMouseUp = () => {
    if (isDragging && selectedRange.start && selectedRange.end) {
      const startDate = isBefore(selectedRange.start, selectedRange.end) ? selectedRange.start : selectedRange.end;
      const endDate = isAfter(selectedRange.start, selectedRange.end) ? selectedRange.start : selectedRange.end;
      
      setNewAssignment(prev => ({
        ...prev,
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd")
      }));
      setShowAddDialog(true);
    }
    setIsDragging(false);
  };

  const handleAddAssignment = () => {
    const title = newAssignment.type === "unavailable" ? "Unavailable" : newAssignment.title;
    
    if (!newAssignment.startDate || (newAssignment.type === "assignment" && !newAssignment.title)) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const startDate = new Date(newAssignment.startDate);
    const endDate = new Date(newAssignment.endDate);
    
    // Create assignments for each day in the range
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
    
    const newAssignments = dateRange.map(date => ({
      id: `${Date.now()}-${format(date, "yyyy-MM-dd")}`,
      date: format(date, "yyyy-MM-dd"),
      title: title,
      type: newAssignment.type,
      description: newAssignment.description,
      organization: newAssignment.organization
    }));

    setAssignments(prev => [...prev, ...newAssignments]);
    
    const rangeText = isSameDay(startDate, endDate) 
      ? format(startDate, "PPP")
      : `${format(startDate, "PPP")} - ${format(endDate, "PPP")}`;
    
    toast({
      title: "Assignment Added",
      description: `${newAssignment.type === "assignment" ? "Training assignment" : "Unavailable period"} added for ${rangeText}`,
    });

    setNewAssignment({
      startDate: "",
      endDate: "",
      title: "",
      type: "assignment",
      description: "",
      organization: ""
    });
    setSelectedRange({ start: null, end: null });
    setShowAddDialog(false);
  };

  const handleToggleAvailability = (assignmentId: string) => {
    setAssignments(prev => prev.map(assignment => {
      if (assignment.id === assignmentId && assignment.type === "unavailable") {
        return { ...assignment, type: "assignment", title: "Available" };
      }
      return assignment;
    }));
    
    toast({
      title: "Availability Updated",
      description: "Trainer availability has been updated",
    });
  };

  const handleRemoveAssignment = (assignmentId: string) => {
    setAssignments(prev => prev.filter(a => a.id !== assignmentId));
    toast({
      title: "Assignment Removed",
      description: "Assignment has been removed",
    });
  };

  const getAssignmentDates = () => {
    return assignments.map(a => new Date(a.date)).filter(date => isValid(date));
  };

  const getSelectedRangeDates = () => {
    if (!selectedRange.start || !selectedRange.end) return [];
    const startDate = isBefore(selectedRange.start, selectedRange.end) ? selectedRange.start : selectedRange.end;
    const endDate = isAfter(selectedRange.start, selectedRange.end) ? selectedRange.start : selectedRange.end;
    return eachDayOfInterval({ start: startDate, end: endDate });
  };

  const getSelectedDateAssignments = () => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return assignments.filter(a => a.date === dateStr);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {trainerName} Calendar
          </CardTitle>
          <CardDescription>
            Manage training assignments and availability for this trainer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                modifiers={{
                  assignment: getAssignmentDates(),
                  selectedRange: getSelectedRangeDates()
                }}
                modifiersStyles={{
                  assignment: { backgroundColor: "hsl(var(--primary))", color: "white" },
                  selectedRange: { backgroundColor: "hsl(var(--primary) / 0.3)", color: "hsl(var(--primary))" }
                }}
                className="rounded-md border pointer-events-auto"
              />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Click a date to add single assignment
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNewAssignment(prev => ({
                      ...prev,
                      startDate: "",
                      endDate: ""
                    }));
                    setShowAddDialog(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Date Range
                </Button>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                {selectedDate ? format(selectedDate, "PPP") : "Select a date"}
              </h3>
              
              {getSelectedDateAssignments().length > 0 ? (
                <div className="space-y-3">
                  {getSelectedDateAssignments().map((assignment) => (
                    <Card key={assignment.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="space-y-1">
                            <h4 className="font-medium">{assignment.title}</h4>
                            <Badge variant={assignment.type === "assignment" ? "default" : "secondary"}>
                              {assignment.type}
                            </Badge>
                          </div>
                          {assignment.organization && (
                            <p className="text-sm text-muted-foreground">Organization: {assignment.organization}</p>
                          )}
                          {assignment.description && (
                            <p className="text-sm text-muted-foreground">{assignment.description}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {assignment.type === "unavailable" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleAvailability(assignment.id)}
                            >
                              Make Available
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveAssignment(assignment.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No assignments for this date</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Assignment</DialogTitle>
            <DialogDescription>
              Add a new training assignment or mark as unavailable for selected date range
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={newAssignment.startDate}
                onChange={(e) => setNewAssignment(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={newAssignment.endDate}
                onChange={(e) => setNewAssignment(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="type">Type *</Label>
              <Select onValueChange={(value: "assignment" | "unavailable") => setNewAssignment(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assignment">Training Assignment</SelectItem>
                  <SelectItem value="unavailable">Unavailable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newAssignment.type === "assignment" && (
              <div>
                <Label htmlFor="title">Course/Title *</Label>
                <Select 
                  value={newAssignment.title}
                  onValueChange={(value) => setNewAssignment(prev => ({ ...prev, title: value }))}
                >
                  <SelectTrigger className="bg-background z-50">
                    <SelectValue placeholder="Select course or enter custom title" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    {trainerCourses.map((course) => (
                      <SelectItem key={course} value={course} className="hover:bg-muted">
                        {course}
                      </SelectItem>
                    ))}
                    <SelectItem value="Other" className="hover:bg-muted">
                      Other (Custom)
                    </SelectItem>
                  </SelectContent>
                </Select>
                {newAssignment.title === "Other" && (
                  <Input
                    className="mt-2"
                    placeholder="Enter custom title"
                    value={newAssignment.title === "Other" ? "" : newAssignment.title}
                    onChange={(e) => setNewAssignment(prev => ({ ...prev, title: e.target.value }))}
                  />
                )}
              </div>
            )}

            {newAssignment.type === "assignment" && (
              <div>
                <Label htmlFor="organization">Organization</Label>
                <Input
                  id="organization"
                  value={newAssignment.organization}
                  onChange={(e) => setNewAssignment(prev => ({ ...prev, organization: e.target.value }))}
                  placeholder="Client organization"
                />
              </div>
            )}

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newAssignment.description}
                onChange={(e) => setNewAssignment(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Additional details"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAssignment}>
              Add Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}