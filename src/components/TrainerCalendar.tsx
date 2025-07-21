import { useState } from "react";
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
import { format, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface TrainerAssignment {
  id: string;
  date: string;
  title: string;
  type: "assignment" | "unavailable";
  description?: string;
  course?: string;
  organization?: string;
}

interface TrainerCalendarProps {
  trainerId: string;
  trainerName: string;
}

export function TrainerCalendar({ trainerId, trainerName }: TrainerCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [assignments, setAssignments] = useState<TrainerAssignment[]>([
    {
      id: "1",
      date: "2024-01-15",
      title: "Leadership Training",
      type: "assignment",
      course: "Advanced Leadership Skills",
      organization: "TechCorp Solutions",
      description: "Full day leadership workshop"
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
    date: "",
    title: "",
    type: "assignment" as "assignment" | "unavailable",
    description: "",
    course: "",
    organization: ""
  });

  const { toast } = useToast();

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      setNewAssignment(prev => ({ ...prev, date: format(date, "yyyy-MM-dd") }));
      setShowAddDialog(true);
    }
  };

  const handleAddAssignment = () => {
    if (!newAssignment.date || !newAssignment.title) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const assignment: TrainerAssignment = {
      id: Date.now().toString(),
      ...newAssignment
    };

    setAssignments(prev => [...prev, assignment]);
    
    toast({
      title: "Assignment Added",
      description: `${assignment.type === "assignment" ? "Training assignment" : "Unavailable period"} added for ${format(new Date(assignment.date), "PPP")}`,
    });

    setNewAssignment({
      date: "",
      title: "",
      type: "assignment",
      description: "",
      course: "",
      organization: ""
    });
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
            <div>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                modifiers={{
                  assignment: getAssignmentDates()
                }}
                modifiersStyles={{
                  assignment: { backgroundColor: "hsl(var(--primary))", color: "white" }
                }}
                className="rounded-md border"
              />
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
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{assignment.title}</h4>
                            <Badge variant={assignment.type === "assignment" ? "default" : "secondary"}>
                              {assignment.type}
                            </Badge>
                          </div>
                          {assignment.course && (
                            <p className="text-sm text-muted-foreground">Course: {assignment.course}</p>
                          )}
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
              Add a new training assignment or mark as unavailable for {selectedDate && format(selectedDate, "PPP")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
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

            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={newAssignment.title}
                onChange={(e) => setNewAssignment(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Assignment or unavailability reason"
              />
            </div>

            {newAssignment.type === "assignment" && (
              <>
                <div>
                  <Label htmlFor="course">Course</Label>
                  <Input
                    id="course"
                    value={newAssignment.course}
                    onChange={(e) => setNewAssignment(prev => ({ ...prev, course: e.target.value }))}
                    placeholder="Course name"
                  />
                </div>

                <div>
                  <Label htmlFor="organization">Organization</Label>
                  <Input
                    id="organization"
                    value={newAssignment.organization}
                    onChange={(e) => setNewAssignment(prev => ({ ...prev, organization: e.target.value }))}
                    placeholder="Client organization"
                  />
                </div>
              </>
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