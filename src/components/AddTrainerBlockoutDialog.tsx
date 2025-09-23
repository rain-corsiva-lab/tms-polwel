import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Ban, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { trainerBlockoutsApi } from "@/lib/api";

interface AddTrainerBlockoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  trainerId: string;
  onBlockoutAdded: () => void;
}

export function AddTrainerBlockoutDialog({ isOpen, onClose, trainerId, onBlockoutAdded }: AddTrainerBlockoutDialogProps) {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [formData, setFormData] = useState({
    remarks: "",
    description: "",
  });

  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate || !endDate) {
      toast({
        title: "Validation Error",
        description: "Please select start date and end date.",
        variant: "destructive",
      });
      return;
    }

    if (startDate > endDate) {
      toast({
        title: "Validation Error",
        description: "Start date cannot be after end date.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Call API to create blockout
      const blockoutData = {
        trainerId,
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
        remarks: formData.remarks || undefined,
        description: formData.description,
        isRecurring: false,
        recurringPattern: undefined,
      };

      await trainerBlockoutsApi.create(blockoutData);

      toast({
        title: "Success",
        description: "Blockout dates added successfully!",
      });

      // Reset form and refresh data
      setStartDate(undefined);
      setEndDate(undefined);
      setFormData({
        remarks: "",
        description: "",
      });

      onBlockoutAdded(); // Refresh dashboard data
      onClose(); // Close dialog
    } catch (error: any) {
      console.error("Error creating blockout:", error);
      const message = error?.message || "Failed to add blockout dates. Please try again.";
      toast({
        title: "Unable to add blockout",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5" />
            Block Out Dates
          </DialogTitle>
          <DialogDescription>Select dates when this trainer will be unavailable.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date *</Label>
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
              <Label htmlFor="end-date">End Date *</Label>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks (optional)</Label>
            <Input
              id="remarks"
              placeholder="Optional note about availability"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            />
          </div>

          {/* Type removed - trainers are typically freelancers; keep minimal data */}

          {/* <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Additional details (optional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div> */}
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit}>
            Block Out Date
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
