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

interface TrainerBlockout {
  id: string;
  date: string;
  title: string;
  type: "unavailable";
  description?: string;
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
  const [blockouts, setBlockouts] = useState<TrainerBlockout[]>([
    {
      id: "2", 
      date: "2024-01-20",
      title: "Personal Leave",
      type: "unavailable",
      description: "Family commitment"
    }
  ]);
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newBlockout, setNewBlockout] = useState({
    startDate: "",
    endDate: "",
    title: "",
    type: "unavailable" as const,
    description: ""
  });

  const { toast } = useToast();

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    setSelectedDate(date);
    setSelectedRange({ start: date, end: date });
    setNewBlockout(prev => ({ 
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
      
      setNewBlockout(prev => ({
        ...prev,
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd")
      }));
      setShowAddDialog(true);
    }
    setIsDragging(false);
  };

  const handleAddBlockout = () => {
    if (!newBlockout.startDate || !newBlockout.title) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const startDate = new Date(newBlockout.startDate);
    const endDate = new Date(newBlockout.endDate);
    
    // Create blockouts for each day in the range
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
    
    const newBlockouts = dateRange.map(date => ({
      id: `${Date.now()}-${format(date, "yyyy-MM-dd")}`,
      date: format(date, "yyyy-MM-dd"),
      title: newBlockout.title,
      type: "unavailable" as const,
      description: newBlockout.description
    }));

    setBlockouts(prev => [...prev, ...newBlockouts]);
    
    const rangeText = isSameDay(startDate, endDate) 
      ? format(startDate, "PPP")
      : `${format(startDate, "PPP")} - ${format(endDate, "PPP")}`;
    
    toast({
      title: "Blockout Added",
      description: `Trainer blocked out for ${rangeText}`,
    });

    setNewBlockout({
      startDate: "",
      endDate: "",
      title: "",
      type: "unavailable",
      description: ""
    });
    setSelectedRange({ start: null, end: null });
    setShowAddDialog(false);
  };

  const handleRemoveBlockout = (blockoutId: string) => {
    setBlockouts(prev => prev.filter(a => a.id !== blockoutId));
    toast({
      title: "Blockout Removed",
      description: "Blockout has been removed",
    });
  };

  const getBlockoutDates = () => {
    return blockouts.map(a => new Date(a.date)).filter(date => isValid(date));
  };

  const getSelectedRangeDates = () => {
    if (!selectedRange.start || !selectedRange.end) return [];
    const startDate = isBefore(selectedRange.start, selectedRange.end) ? selectedRange.start : selectedRange.end;
    const endDate = isAfter(selectedRange.start, selectedRange.end) ? selectedRange.start : selectedRange.end;
    return eachDayOfInterval({ start: startDate, end: endDate });
  };

  const getSelectedDateBlockouts = () => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return blockouts.filter(a => a.date === dateStr);
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
            Manage unavailable dates and blockouts for this trainer
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
                  blockout: getBlockoutDates(),
                  selectedRange: getSelectedRangeDates()
                }}
                modifiersStyles={{
                  blockout: { backgroundColor: "hsl(var(--destructive))", color: "white" },
                  selectedRange: { backgroundColor: "hsl(var(--primary) / 0.3)", color: "hsl(var(--primary))" }
                }}
                className="rounded-md border pointer-events-auto"
              />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Click a date to block out trainer
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNewBlockout(prev => ({
                      ...prev,
                      startDate: "",
                      endDate: ""
                    }));
                    setShowAddDialog(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Blockout Date Range
                </Button>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                {selectedDate ? format(selectedDate, "PPP") : "Select a date"}
              </h3>
              
              {getSelectedDateBlockouts().length > 0 ? (
                <div className="space-y-3">
                  {getSelectedDateBlockouts().map((blockout) => (
                    <Card key={blockout.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="space-y-1">
                            <h4 className="font-medium">{blockout.title}</h4>
                            <Badge variant="destructive">
                              Unavailable
                            </Badge>
                          </div>
                          {blockout.description && (
                            <p className="text-sm text-muted-foreground">{blockout.description}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveBlockout(blockout.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No blockouts for this date</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Blockout</DialogTitle>
            <DialogDescription>
              Block out dates when trainer is unavailable
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={newBlockout.startDate}
                onChange={(e) => setNewBlockout(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={newBlockout.endDate}
                onChange={(e) => setNewBlockout(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="title">Reason *</Label>
              <Input
                id="title"
                value={newBlockout.title}
                onChange={(e) => setNewBlockout(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Personal Leave, Training, Conference"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newBlockout.description}
                onChange={(e) => setNewBlockout(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Additional details"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddBlockout}>
              Add Blockout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}