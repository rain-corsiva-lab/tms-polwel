import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { TrainerBlockout } from "@/types/trainer";

interface EditTrainerBlockoutDialogProps {
  blockout: TrainerBlockout;
  onBlockoutUpdate: (blockoutId: string, updateData: Partial<TrainerBlockout>) => void;
  onClose: () => void;
}

const blockoutTypes = [
  { value: "personal", label: "Personal Leave" },
  { value: "holiday", label: "Public Holiday" },
  { value: "unavailable", label: "Unavailable" },
  { value: "maintenance", label: "Training/Maintenance" },
  { value: "other", label: "Other" }
];

const recurringPatterns = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" }
];

export function EditTrainerBlockoutDialog({
  blockout,
  onBlockoutUpdate,
  onClose
}: EditTrainerBlockoutDialogProps) {
  const [formData, setFormData] = useState({
    startDate: blockout.startDate,
    endDate: blockout.endDate,
    reason: blockout.reason,
    type: blockout.type,
    description: blockout.description || '',
    isRecurring: blockout.isRecurring,
    recurringPattern: blockout.recurringPattern || ''
  });
  const [startDate, setStartDate] = useState<Date | undefined>(
    blockout.startDate ? parseISO(blockout.startDate) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    blockout.endDate ? parseISO(blockout.endDate) : undefined
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (startDate && endDate && startDate > endDate) {
      newErrors.endDate = 'End date cannot be before start date';
    }

    if (!formData.reason.trim()) {
      newErrors.reason = 'Reason is required';
    }

    if (!formData.type) {
      newErrors.type = 'Type is required';
    }

    if (formData.isRecurring && !formData.recurringPattern) {
      newErrors.recurringPattern = 'Recurring pattern is required when recurring is enabled';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onBlockoutUpdate(blockout.id, {
        startDate: startDate ? format(startDate, 'yyyy-MM-dd') : formData.startDate,
        endDate: endDate ? format(endDate, 'yyyy-MM-dd') : formData.endDate,
        reason: formData.reason.trim(),
        type: formData.type,
        description: formData.description.trim(),
        isRecurring: formData.isRecurring,
        recurringPattern: formData.isRecurring ? formData.recurringPattern : undefined
      });
    } catch (error) {
      console.error('Error updating blockout:', error);
      setErrors({ submit: 'Failed to update blockout. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Trainer Blockout</DialogTitle>
          <DialogDescription>
            Update the blockout details for {blockout.trainerName}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !startDate && "text-muted-foreground",
                      errors.startDate && "border-red-500"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "MMM dd, yyyy") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      setStartDate(date);
                      if (date) {
                        setFormData(prev => ({ ...prev, startDate: format(date, 'yyyy-MM-dd') }));
                        // Reset end date if it's before the new start date
                        if (endDate && date > endDate) {
                          setEndDate(undefined);
                          setFormData(prev => ({ ...prev, endDate: '' }));
                        }
                      }
                    }}
                    disabled={(date) => date < new Date("1900-01-01")}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.startDate && <p className="text-sm text-red-500">{errors.startDate}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="endDate">End Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !endDate && "text-muted-foreground",
                      errors.endDate && "border-red-500"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "MMM dd, yyyy") : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => {
                      setEndDate(date);
                      if (date) {
                        setFormData(prev => ({ ...prev, endDate: format(date, 'yyyy-MM-dd') }));
                      }
                    }}
                    disabled={(date) => date < new Date("1900-01-01") || (startDate && date < startDate)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.endDate && <p className="text-sm text-red-500">{errors.endDate}</p>}
            </div>
          </div>

          {/* Reason */}
          <div className="grid gap-2">
            <Label htmlFor="reason">Reason *</Label>
            <Input
              id="reason"
              placeholder="e.g., Personal Leave, Sick Day, Training"
              value={formData.reason}
              onChange={(e) => handleInputChange('reason', e.target.value)}
              className={errors.reason ? "border-red-500" : ""}
            />
            {errors.reason && <p className="text-sm text-red-500">{errors.reason}</p>}
          </div>

          {/* Type */}
          <div className="grid gap-2">
            <Label htmlFor="type">Type *</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value) => handleInputChange('type', value)}
            >
              <SelectTrigger className={errors.type ? "border-red-500" : ""}>
                <SelectValue placeholder="Select blockout type" />
              </SelectTrigger>
              <SelectContent>
                {blockoutTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && <p className="text-sm text-red-500">{errors.type}</p>}
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional description or additional notes"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
            />
          </div>

          {/* Recurring */}
          {/* <div className="flex items-center space-x-2">
            <Checkbox
              id="isRecurring"
              checked={formData.isRecurring}
              onCheckedChange={(checked) => handleInputChange('isRecurring', checked === true)}
            />
            <Label htmlFor="isRecurring">This is a recurring blockout</Label>
          </div> */}

          {/* Recurring Pattern */}
          {formData.isRecurring && (
            <div className="grid gap-2">
              <Label htmlFor="recurringPattern">Recurring Pattern *</Label>
              <Select 
                value={formData.recurringPattern} 
                onValueChange={(value) => handleInputChange('recurringPattern', value)}
              >
                <SelectTrigger className={errors.recurringPattern ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select recurring pattern" />
                </SelectTrigger>
                <SelectContent>
                  {recurringPatterns.map((pattern) => (
                    <SelectItem key={pattern.value} value={pattern.value}>
                      {pattern.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.recurringPattern && <p className="text-sm text-red-500">{errors.recurringPattern}</p>}
            </div>
          )}

          {/* Form Errors */}
          {errors.submit && (
            <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded p-3">
              {errors.submit}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Update Blockout"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
